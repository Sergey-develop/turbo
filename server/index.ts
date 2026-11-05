import { passwordLogin, passwordLogout, passwordPrincipal } from './password-auth.ts'
import { defaultSettings, defaultTemplates, permissions, exportable, renderTemplate } from './defaults.ts'

export interface Env { DB:D1Database; BUCKET?:R2Bucket; ASSETS:Fetcher; BOOTSTRAP_ADMIN_EMAILS?:string; CANCEL_SECRET?:string; JOB_RUNNER_SECRET?:string; MAIL_PROVIDER?:string; RESEND_API_KEY?:string; MAIL_FROM?:string; PUBLIC_ORIGIN?:string; AUTH_MODE?:string; ADMIN_USERNAME?:string; ADMIN_PASSWORD_VERIFIER?:string; LANDING_ORIGIN?:string }
type Actor={id:string;email:string;role:string;permissions:string[]}
type Row=Record<string,any>
class HttpError extends Error { constructor(public status:number,message:string){super(message)} }
function fail(status:number,message:string):never{throw new HttpError(status,message)}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})
const stmt=(e:Env,sql:string,...args:any[])=>e.DB.prepare(sql).bind(...args)
const first=(e:Env,sql:string,...args:any[])=>stmt(e,sql,...args).first<Row>()
const all=async(e:Env,sql:string,...args:any[])=>(await stmt(e,sql,...args).all<Row>()).results
const audit=(e:Env,a:Actor,action:string,resource:string)=>stmt(e,'INSERT INTO audit(actor,action,resource) VALUES(?,?,?)',a.id,action,resource)
async function write(e:Env,a:Actor,sql:string,args:any[],action:string,resource:string){
 const results=await e.DB.batch([stmt(e,sql,...args),stmt(e,'INSERT INTO audit(actor,action,resource) SELECT ?,?,? WHERE changes()>0',a.id,action,resource)])
 return results[0].results[0] as Row|undefined
}
async function actor(req:Request,e:Env):Promise<Actor>{
 if(e.AUTH_MODE==='password'){const principal=await passwordPrincipal(req,e);if(!principal)fail(401,'Войдите в панель управления');return {id:principal,email:principal,role:'admin',permissions:permissions.admin}}
 const id=req.headers.get('oai-authenticated-user-id')||''; const email=(req.headers.get('oai-authenticated-user-email')||'').toLowerCase()
 if(!id||!email)fail(401,'Войдите через ChatGPT')
 const roleRow=await first(e,'SELECT role FROM roles WHERE principal IN (?,?) ORDER BY CASE WHEN principal=? THEN 0 ELSE 1 END LIMIT 1',id,email,id)
 const bootstrap=(e.BOOTSTRAP_ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim()).includes(email)
 const role=bootstrap?'admin':(roleRow?.role||'none')
 return {id,email,role,permissions:permissions[role]||[]}
}
const allow=(a:Actor,p:string)=>{if(!a.permissions.includes(p))fail(403,'Недостаточно прав')}
async function body(req:Request):Promise<Row>{
 if(Number(req.headers.get('content-length')||0)>32768)fail(413,'Слишком большой запрос')
 const text=await req.text(); if(text.length>32768)fail(413,'Слишком большой запрос')
 try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value}catch{fail(400,'Некорректный JSON')}
}
async function settings(e:Env){const row=await first(e,'SELECT * FROM settings WHERE id=1');return {...defaultSettings,...(row?JSON.parse(row.data):{}),version:row?.version||0}}
async function digest(text:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function token(e:Env,id:string){if(!e.CANCEL_SECRET)fail(503,'Не настроен секрет отмены');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(e.CANCEL_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function validToken(e:Env,id:string,supplied:string){const expected=await token(e,id);let diff=expected.length^supplied.length;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^(supplied.charCodeAt(i)||0);if(diff)fail(403,'Неверная ссылка отмены')}
function field(value:unknown,max=160){if(typeof value!=='string'||!value.trim()||value.length>max)fail(422,'Проверьте обязательные поля');return value.trim()}
function validateContent(value:unknown){
 const v=value as Row;if(!v||typeof v!=='object')fail(422,'Нет содержимого')
 for(const [key,fields] of Object.entries({program:['title','time'],speakers:['name','role','topic','image'],faq:['question','answer']})){
  if(!Array.isArray(v[key])||v[key].length>100)fail(422,`Проверьте ${key}`)
  for(const item of v[key]){for(const f of fields)field(item[f],f==='answer'||f==='topic'?4000:300);if(key==='program'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))fail(422,'Время должно быть ЧЧ:ММ');if(key==='speakers'&&!/^\/(assets|api\/media)\/[a-zA-Z0-9_.-]+$/.test(item.image))fail(422,'Загрузите фото через кабинет')}
 }
 if(!v.texts||typeof v.texts!=='object'||Array.isArray(v.texts))fail(422,'Проверьте тексты')
 if(Object.keys(v.texts).length>100)fail(422,'Слишком много текстов')
 for(const val of Object.values(v.texts))if(typeof val!=='string'||val.length>10000)fail(422,'Слишком длинный текст')
 return v
}
async function initialize(e:Env,a:Actor,payload:Row){
 const data=validateContent(payload.content)
 await e.DB.batch([
  stmt(e,'INSERT OR IGNORE INTO settings(id,data) VALUES(1,?)',JSON.stringify(defaultSettings)),
  stmt(e,'INSERT OR IGNORE INTO content(id,draft,published) VALUES(1,?,?)',JSON.stringify(data),JSON.stringify(data)),
  ...defaultTemplates.map(t=>stmt(e,'INSERT OR IGNORE INTO templates(id,subject,body) VALUES(?,?,?)',t.id,t.subject,t.body)),audit(e,a,'system.initialized','site')])
}
async function rateLimit(req:Request,e:Env){
 const now=Date.now(),ip=req.headers.get('cf-connecting-ip')||req.headers.get('oai-authenticated-user-id')||'local'
 await stmt(e,'DELETE FROM rate_limits WHERE expires<?',now).run()
 const key=await digest((e.CANCEL_SECRET||'')+ip+Math.floor(now/3600000))
 const row=await stmt(e,'INSERT INTO rate_limits(key,expires) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',key,now+3600000).first<Row>()
 if(Number(row?.count)>10)fail(429,'Слишком много попыток. Повторите позднее.')
}
async function register(req:Request,e:Env){
 const b=await body(req),s=await settings(e),key=field(req.headers.get('Idempotency-Key'),100)
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))fail(422,'Неверный ключ запроса')
 const data:Row={};for(const k of ['surname','name','company','position','email','phone'])data[k]=field(b[k])
 data.email=data.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||!/^[+\d\s()-]{10,30}$/.test(data.phone)||(data.phone.replace(/\D/g,'').length<10||data.phone.replace(/\D/g,'').length>15))fail(422,'Проверьте email и телефон')
 if(b.consent!==true||typeof b.marketing!=='boolean')fail(422,'Необходимо обязательное согласие; рассылка добровольна')
 const utm:Row={};for(const k of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'])if(typeof b.utm?.[k]==='string')utm[k]=b.utm[k].slice(0,200)
 const hash=await digest(JSON.stringify({data,marketing:b.marketing,consentVersion:b.consentVersion,marketingVersion:b.marketingVersion,utm}))
 const previous=await first(e,'SELECT id,request_hash FROM registrations WHERE request_key=?',key)
 if(previous){if(previous.request_hash!==hash)fail(409,'Ключ уже использован для другой заявки');return json({received:true,cancelUrl:`${e.PUBLIC_ORIGIN||''}/cancel?id=${previous.id}&token=${await token(e,previous.id)}`},200)}
 await rateLimit(req,e)
 if(!e.CANCEL_SECRET)fail(503,'Регистрация ещё не настроена')
 if(b.consentVersion!==s.consentVersion||b.marketingVersion!==s.marketingVersion)fail(409,'Согласия изменились. Обновите страницу.')
 const id=crypto.randomUUID()
 await stmt(e,`INSERT INTO registrations(id,email,data,status,consent_version,consent_text,marketing,marketing_version,marketing_text,utm,request_key,request_hash,actor)
 VALUES(?,?,?,CASE (SELECT json_extract(data,'$.mode') FROM settings WHERE id=1) WHEN 'open' THEN 'approved' WHEN 'waitlist' THEN 'waitlisted' ELSE 'pending' END,?,?,?,?,?,?,?,?,?)`,id,data.email,JSON.stringify(data),s.consentVersion,s.consentText,b.marketing?1:0,s.marketingVersion,s.marketingText,JSON.stringify(utm),key,hash,'visitor').run()
 return json({received:true,cancelUrl:`${e.PUBLIC_ORIGIN||''}/cancel?id=${id}&token=${await token(e,id)}`},201)
}
function filter(url:URL){const terms:string[]=[],args:string[]=[];for(const k of ['status','utm_source','utm_campaign']){const val=url.searchParams.get(k);if(val){terms.push(k==='status'?'status=?':`json_extract(utm,'$.${k}')=?`);args.push(val.slice(0,200))}}
 const q=url.searchParams.get('q');if(q){terms.push('(email LIKE ? ESCAPE \'\\\' OR data LIKE ? ESCAPE \'\\\')');const escaped=q.slice(0,100).replace(/[\\%_]/g,'\\$&');args.push(`%${escaped}%`,`%${escaped}%`)}return{where:terms.length?' WHERE '+terms.join(' AND '):'',args}}
function csvCell(value:unknown){let s=String(value??'');if(/^[=+\-@\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
async function dispatch(e:Env,a:Actor){
 const s=await settings(e);if(!s.mailEnabled||e.MAIL_PROVIDER!=='resend'||!e.RESEND_API_KEY||!e.MAIL_FROM)return {processed:0,disabled:true}
 // Provider idempotency keys are stable. Ambiguous requests older than 23h require manual reconciliation.
 const now=Date.now();await stmt(e,"UPDATE mail_jobs SET state='queued' WHERE state='sending' AND lease_until<? AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-23 hours')",now).run()
 let processed=0
 for(let i=0;i<10;i++){
  const job=await stmt(e,`UPDATE mail_jobs SET state='sending',attempts=attempts+1,lease_until=? WHERE id=(SELECT id FROM mail_jobs WHERE state='queued' AND available_at<=? ORDER BY created_at,CASE WHEN kind='registered' THEN 0 ELSE 1 END LIMIT 1) AND state='queued' RETURNING *`,now+120000,now).first<Row>()
  if(!job)break
  const reg=job.registration_id?await first(e,'SELECT * FROM registrations WHERE id=?',job.registration_id):null
  if(job.registration_id&&(!reg||reg.status==='cancelled'||(reg.status==='rejected'&&job.kind!=='rejected'))){await stmt(e,"UPDATE mail_jobs SET state='cancelled' WHERE id=?",job.id).run();continue}
  const data=reg?JSON.parse(reg.data):{},origin=e.PUBLIC_ORIGIN||''
  const values={name:data.name||'Тест',status:reg?.status||'test',event_url:origin,cancel_url:reg?`${origin}/cancel?id=${reg.id}&token=${await token(e,reg.id)}`:''}
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${e.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':job.id},body:JSON.stringify({from:e.MAIL_FROM,to:job.recipient||reg?.email,subject:renderTemplate(job.subject,values),text:renderTemplate(job.body,values)}),signal:AbortSignal.timeout(20000)})
   if(!response.ok)throw Error(`provider_http_${response.status}`)
   const result=await response.json() as Row
   await e.DB.batch([stmt(e,"UPDATE mail_jobs SET state='sent',provider_id=?,last_error=NULL WHERE id=?",String(result.id||''),job.id),audit(e,a,'mail.sent',job.id)])
  }catch(error){await e.DB.batch([stmt(e,"UPDATE mail_jobs SET state=?,last_error=?,available_at=? WHERE id=?",job.attempts>=5?'failed':'queued',String(error instanceof Error?error.message:'delivery_failed').slice(0,120),now+Math.min(3600000,60000*2**job.attempts),job.id),audit(e,a,'mail.retry',job.id)])}
  processed++
 }
 return {processed}
}

export async function api(req:Request,e:Env):Promise<Response>{
 const url=new URL(req.url),path=url.pathname,method=req.method
 const publicCrossOrigin=!!e.LANDING_ORIGIN&&req.headers.get('origin')===e.LANDING_ORIGIN&&(['/api/public/config','/api/public/content','/api/registrations'].includes(path))&&!url.searchParams.has('preview')
 if(!['GET','HEAD'].includes(method)){
  const origin=req.headers.get('origin');if(origin&&origin!==url.origin&&!publicCrossOrigin)fail(403,'Недопустимый источник запроса')
  if(req.headers.get('sec-fetch-site')==='cross-site'&&!publicCrossOrigin)fail(403,'Недопустимый источник запроса')
  if(path!=='/api/admin/media'&&!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'Требуется application/json')
 }
 if(path==='/api/auth/login'&&method==='POST'&&e.AUTH_MODE==='password'){
  const b=await body(req);const result=await passwordLogin(req,e,String(b.username||''),String(b.password||''))
  const headers:Record<string,string>={'Cache-Control':'no-store'};if(result.setCookie)headers['Set-Cookie']=result.setCookie
  return Response.json(result.error?{error:result.error}:{ok:true},{status:result.status,headers})
 }
 if(path==='/api/auth/logout'&&method==='POST'&&e.AUTH_MODE==='password'){
  const value=await passwordLogout(req,e);return Response.json({ok:true},{headers:{'Set-Cookie':value,'Cache-Control':'no-store'}})
 }
 const media=path.match(/^\/api\/media\/([\w-]+\.(png|jpg|webp))$/)
 if(media&&method==='GET'){const file=await e.BUCKET?.get(media[1]);if(!file)fail(404,'Фото не найдено');return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=31536000,immutable'}})}
 if(path==='/api/public/config'&&method==='GET'){const s=await settings(e);return json({mode:s.mode,consentText:s.consentText,marketingText:s.marketingText,consentVersion:s.consentVersion,marketingVersion:s.marketingVersion,available:s.legalApproved&&s.mode!=='closed'&&!!e.CANCEL_SECRET})}
 if(path==='/api/public/content'&&method==='GET'){
  if(url.searchParams.get('preview')==='1'){const a=await actor(req,e);allow(a,'content');const row=await first(e,'SELECT draft,version FROM content WHERE id=1');return json({content:row?JSON.parse(row.draft):null,version:row?.version||0})}
  const row=await first(e,'SELECT published,version FROM content WHERE id=1');return json({content:row?JSON.parse(row.published):null,version:row?.version||0})
 }
 if(path==='/api/registrations'&&method==='POST')return register(req,e)
 if(path==='/api/cancel'&&method==='POST'){
  const b=await body(req),id=field(b.id,100);await validToken(e,id,field(b.token,100))
  const row=await stmt(e,"UPDATE registrations SET status='cancelled',actor='guest',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),version=version+1 WHERE id=? AND status!='cancelled' RETURNING id",id).first()
  if(!row&&!(await first(e,'SELECT id FROM registrations WHERE id=?',id)))fail(404,'Заявка не найдена')
  return json({cancelled:true})
 }
 if(path==='/api/internal/mail/dispatch'&&method==='POST'){
  if(!e.JOB_RUNNER_SECRET||req.headers.get('authorization')!==`Bearer ${e.JOB_RUNNER_SECRET}`)fail(403,'Нет доступа')
  return json(await dispatch(e,{id:'scheduler',email:'',role:'admin',permissions:permissions.admin}))
 }
 if(!path.startsWith('/api/admin/'))fail(404,'Не найдено')
 const a=await actor(req,e)
 if(path==='/api/admin/media'&&method==='POST'){
  allow(a,'content');if(!e.BUCKET)fail(503,'Хранилище фото не подключено')
  const type=req.headers.get('content-type')||'',ext:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}
  if(!ext[type]||Number(req.headers.get('content-length')||0)>5242880)fail(422,'Нужен PNG, JPEG или WebP до 5 МБ')
  const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length>5242880||bytes.length<12)fail(422,'Неверный размер файла')
  const valid=type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'
  if(!valid)fail(422,'Содержимое файла не соответствует типу')
  const id=crypto.randomUUID()+'.'+ext[type];await e.BUCKET.put(id,bytes,{httpMetadata:{contentType:type}});await audit(e,a,'media.uploaded',id).run();return json({path:'/api/media/'+id},201)
 }
 if(path==='/api/admin/me'&&method==='GET')return json({...a,authMode:e.AUTH_MODE||'sites',photoUploadAvailable:!!e.BUCKET})
 if(path==='/api/admin/overview'&&method==='GET'){
  allow(a,'analytics')
  const batch=await e.DB.batch<Row>([
   stmt(e,"SELECT COUNT(*) total,COALESCE(SUM(status='pending'),0) pending,COALESCE(SUM(status='approved'),0) approved,COALESCE(SUM(date(created_at,'+3 hours')=date('now','+3 hours')),0) today FROM registrations"),
   stmt(e,"SELECT COUNT(*) sent FROM mail_jobs WHERE state='sent' AND kind!='test'"),
   stmt(e,'SELECT data FROM settings WHERE id=1'),
   ...(a.permissions.includes('registrations.read')?[stmt(e,'SELECT id,data,status,created_at FROM registrations ORDER BY created_at DESC LIMIT 5')]:[]),
  ])
  const config=batch[2].results[0] as Row|undefined
  return json({...batch[0].results[0],...batch[1].results[0],mode:config?JSON.parse(config.data).mode:'closed',latest:batch[3]?.results.map(r=>({...r,data:JSON.parse(String(r.data))}))||[]})
 }
 if(path==='/api/admin/initialize'&&method==='POST'){allow(a,'settings');await initialize(e,a,await body(req));return json({initialized:true})}
 if(path==='/api/admin/settings'){
  allow(a,'settings');if(method==='GET')return json(await settings(e))
  if(method==='PUT'){
   const b=await body(req);if(!['open','moderated','waitlist','closed'].includes(b.mode))fail(422,'Неизвестный режим')
   if(!Number.isInteger(b.capacity)||b.capacity<0||b.capacity>100000)fail(422,'Неверная вместимость')
   for(const k of ['legalApproved','rejectionMail','mailEnabled','checkIn'])if(typeof b[k]!=='boolean')fail(422,`Проверьте ${k}`)
   for(const k of ['maxApplications','retentionDays'])if(b[k]!==null&&(!Number.isInteger(b[k])||b[k]<1||b[k]>100000))fail(422,`Проверьте ${k}`)
   for(const k of ['consentText','marketingText','consentVersion','marketingVersion'])field(b[k],k.endsWith('Text')?10000:80)
   if(!Array.isArray(b.exportFields)||b.exportFields.some((x:string)=>!exportable.includes(x)))fail(422,'Неверные поля экспорта')
   if(b.legalApproved){field(b.consentBasis,4000);field(b.marketingBasis,4000)}
   const current=await settings(e);if((b.consentText!==current.consentText&&b.consentVersion===current.consentVersion)||(b.marketingText!==current.marketingText&&b.marketingVersion===current.marketingVersion))fail(422,'Измените версию согласия вместе с текстом')
   const {version,...data}=b
   const result=await write(e,a,'UPDATE settings SET data=?,version=version+1 WHERE id=1 AND version=? RETURNING version',[JSON.stringify(data),version],'settings.updated','site');if(!result)fail(409,'Настройки изменились; обновите страницу')
   return json(result)
  }
 }
 if(path==='/api/admin/registrations'&&method==='GET'){
  allow(a,'registrations.read');const f=filter(url),page=Math.max(0,Math.min(10000,Number(url.searchParams.get('page'))||0));const rows=await all(e,`SELECT id,email,data,status,marketing,utm,created_at,checked_in_at,version FROM registrations${f.where} ORDER BY created_at DESC LIMIT 50 OFFSET ?`,...f.args,page*50)
  await audit(e,a,'registrations.read',`page:${page}`).run();return json({rows:rows.map(r=>({...r,data:JSON.parse(r.data),utm:JSON.parse(r.utm)})),total:(await first(e,`SELECT COUNT(*) count FROM registrations${f.where}`,...f.args))?.count||0})
 }
 if(path==='/api/admin/export'&&method==='GET'){
  allow(a,'export');const s=await settings(e),fields=s.exportFields.filter((x:string)=>exportable.includes(x)),f=filter(url)
  const rows=await all(e,`SELECT * FROM registrations${f.where} ORDER BY created_at LIMIT 10001`,...f.args);if(rows.length>10000)fail(422,'Сузьте фильтр: максимум 10000 записей')
  await audit(e,a,'registrations.export',`rows:${rows.length};fields:${fields.join(',')}`).run()
  const csv=[fields,...rows.map(r=>{const data={...JSON.parse(r.data),...JSON.parse(r.utm),...r};return fields.map((k:string)=>data[k])})].map(row=>row.map(csvCell).join(',')).join('\r\n')
  return new Response('\uFEFF'+csv,{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename="registrations.csv"','Cache-Control':'no-store'}})
 }
 const registration=path.match(/^\/api\/admin\/registrations\/([\w-]+)\/(approve|reject|cancel|checkin)$/)
 if(registration&&method==='POST'){
  const [,id,action]=registration;allow(a,action==='checkin'?'checkin':'registrations.write');const b=await body(req)
  const s=await settings(e);if(action==='checkin'&&!s.checkIn)fail(409,'Учёт прохода отключён')
  const status={approve:'approved',reject:'rejected',cancel:'cancelled'}[action]
  const sql=action==='checkin'?"UPDATE registrations SET checked_in_at=COALESCE(checked_in_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),actor=?,version=version+1 WHERE id=? AND version=? AND status='approved' RETURNING id":"UPDATE registrations SET status=?,actor=?,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND version=? AND status IN ('pending','waitlisted','approved') RETURNING id"
  const args=action==='checkin'?[a.id,id,b.version]:[status,a.id,id,b.version]
  const result=action==='checkin'?await write(e,a,sql,args,'registration.checkin',id):await stmt(e,sql,...args).first();if(!result)fail(409,'Заявка изменилась или действие недоступно')
  return json({updated:true})
 }
 if(path==='/api/admin/content'){
  allow(a,'content');const row=await first(e,'SELECT * FROM content WHERE id=1');if(method==='GET')return json({content:row?JSON.parse(row.draft):null,version:row?.version||0})
  if(method==='PUT'){const b=await body(req),data=validateContent(b.content);const result=await write(e,a,'UPDATE content SET draft=?,version=version+1 WHERE id=1 AND version=? RETURNING version',[JSON.stringify(data),b.version],'content.saved','site');if(!result)fail(409,'Контент изменился; обновите страницу');return json(result)}
 }
 if(path==='/api/admin/content/publish'&&method==='POST'){allow(a,'content');const b=await body(req);const r=await write(e,a,"UPDATE content SET published=draft,published_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),version=version+1 WHERE id=1 AND version=? RETURNING version",[b.version],'content.published','site');if(!r)fail(409,'Версия изменилась');return json(r)}
 if(path==='/api/admin/analytics'&&method==='GET'){
  allow(a,'analytics');const f=filter(url);return json({statuses:await all(e,`SELECT status,COUNT(*) count FROM registrations${f.where} GROUP BY status`,...f.args),sources:await all(e,`SELECT json_extract(utm,'$.utm_source') source,COUNT(*) count FROM registrations${f.where} GROUP BY source`,...f.args),checkedIn:(await first(e,`SELECT COUNT(*) count FROM registrations${f.where}${f.where?' AND':' WHERE'} checked_in_at IS NOT NULL`,...f.args))?.count||0})
 }
 if(path==='/api/admin/templates'){
  allow(a,'templates');if(method==='GET')return json(await all(e,'SELECT * FROM templates'))
  if(method==='PUT'){const b=await body(req);if(!['registered','approved','rejected'].includes(b.id))fail(422,'Неизвестный шаблон');const subject=field(b.subject,200),text=field(b.body,10000);if(/[\r\n]/.test(subject))fail(422,'Тема должна быть одной строкой');const vars=(subject+text).match(/\{\{[^}]+\}\}/g)||[];if(vars.some((v:string)=>!/^\{\{(name|status|event_url|cancel_url)\}\}$/.test(v)))fail(422,'Неизвестная переменная');const r=await write(e,a,'UPDATE templates SET subject=?,body=?,version=version+1 WHERE id=? AND version=? RETURNING version',[subject,text,b.id,b.version],'template.saved',b.id);if(!r)fail(409,'Шаблон изменился');return json(r)}
 }
 if(path==='/api/admin/templates/test'&&method==='POST'){
  allow(a,'templates');const b=await body(req),t=await first(e,'SELECT * FROM templates WHERE id=?',field(b.id,80));if(!t)fail(404,'Шаблон не найден')
  const values={name:'Тестовый гость',status:'approved',event_url:e.PUBLIC_ORIGIN||'',cancel_url:'[тест: ссылка отмены отключена]'}
  if(b.send===true){allow(a,'mail');await e.DB.batch([stmt(e,'INSERT INTO mail_jobs(id,kind,recipient,subject,body) VALUES(?,?,?,?,?)',crypto.randomUUID(),'test',a.email,renderTemplate(t.subject,values),renderTemplate(t.body,values)),audit(e,a,'template.test_queued',b.id)])}
  return json({subject:renderTemplate(t.subject,values),body:renderTemplate(t.body,values),queued:b.send===true})
 }
 if(path==='/api/admin/mail'&&method==='GET'){allow(a,'mail');return json(await all(e,'SELECT id,kind,state,attempts,available_at,last_error,created_at FROM mail_jobs ORDER BY created_at DESC LIMIT 100'))}
 if(path==='/api/admin/mail/run'&&method==='POST'){allow(a,'mail');return json(await dispatch(e,a))}
 if(path==='/api/admin/audit'&&method==='GET'){allow(a,'audit');return json(await all(e,'SELECT * FROM audit ORDER BY id DESC LIMIT 200'))}
 if(path==='/api/admin/backup'&&method==='GET'){
  allow(a,'settings');const tables=['settings','roles','content','templates','registrations','mail_jobs','audit']
  const snapshot=await e.DB.batch(tables.map(name=>stmt(e,`SELECT * FROM ${name} LIMIT 10001`)))
  if(snapshot.some(x=>x.results.length>10000))fail(422,'Для большой БД запросите резервную копию у администратора хостинга')
  await audit(e,a,'backup.exported','database').run()
  return new Response(JSON.stringify({schema:1,createdAt:new Date().toISOString(),tables:Object.fromEntries(tables.map((name,i)=>[name,snapshot[i].results]))}),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="turbo-rave-backup.json"','Cache-Control':'no-store'}})
 }
 if(path==='/api/admin/roles'){
  if(e.AUTH_MODE==='password')fail(409,'Отдельные учётные записи пока не настроены')
  allow(a,'roles');if(method==='GET')return json(await all(e,'SELECT * FROM roles'))
  if(method==='PUT'){const b=await body(req),principal=field(b.principal).toLowerCase();if(!permissions[b.role])fail(422,'Неизвестная роль');await e.DB.batch([stmt(e,'INSERT INTO roles(principal,role) VALUES(?,?) ON CONFLICT(principal) DO UPDATE SET role=excluded.role',principal,b.role),audit(e,a,'role.updated',principal)]);return json({saved:true})}
  if(method==='DELETE'){const b=await body(req),principal=field(b.principal).toLowerCase();await e.DB.batch([stmt(e,'DELETE FROM roles WHERE principal=?',principal),audit(e,a,'role.revoked',principal)]);return json({deleted:true})}
 }
 if(path==='/api/admin/retention'&&method==='POST'){
  allow(a,'retention');const s=await settings(e),b=await body(req);if(!s.retentionDays)fail(409,'Срок хранения не утверждён')
  const rows=await all(e,"SELECT id FROM registrations WHERE created_at<strftime('%Y-%m-%dT%H:%M:%fZ','now',?) AND id NOT IN (SELECT registration_id FROM mail_jobs WHERE state='sending')",`-${s.retentionDays} days`)
  if(b.confirm!==true)return json({eligible:rows.length})
  await e.DB.batch([...rows.map(r=>stmt(e,"DELETE FROM registrations WHERE id=? AND id NOT IN (SELECT registration_id FROM mail_jobs WHERE state='sending' AND registration_id IS NOT NULL)",r.id)),audit(e,a,'retention.deleted',`count:${rows.length}`)]);return json({deleted:rows.length})
 }
 fail(405,'Метод не поддерживается')
}
export async function handle(req:Request,e:Env):Promise<Response>{
 try{return await api(req,e)}catch(error){
  if(error instanceof HttpError){
   if(error.status===403&&new URL(req.url).pathname.startsWith('/api/admin/')){try{await stmt(e,'INSERT INTO audit(actor,action,resource) VALUES(?,?,?)',(req.headers.get('oai-authenticated-user-id')||'anonymous').slice(0,120),'access.denied',new URL(req.url).pathname.slice(0,200)).run()}catch{/* Do not disclose logging errors. */}}
   return json({error:error.message},error.status)
  }
  const message=error instanceof Error?error.message:''
  const known:Record<string,string>={capacity_exceeded:'Свободных мест нет',registration_closed:'Приём заявок закрыт',legal_not_configured:'Согласия ещё не утверждены',application_limit:'Лимит заявок достигнут',consent_changed:'Согласия изменились. Обновите страницу.',invalid_transition:'Недопустимое изменение статуса',capacity_below_confirmed:'Вместимость меньше числа подтверждений'}
  for(const [key,text] of Object.entries(known))if(message.includes(key))return json({error:text},409)
  if(message.includes('UNIQUE constraint failed'))return json({error:'Заявка уже существует или запрос уже обработан'},409)
  console.error(JSON.stringify({event:'api.error',path:new URL(req.url).pathname,type:error instanceof Error?error.name:'unknown'}))
  return json({error:'Сервис временно недоступен. Повторите запрос с тем же ключом.'},503)
 }
}
export default { async fetch(req:Request,e:Env){
 const url=new URL(req.url)
 if(url.pathname.startsWith('/api/')){
  const origin=req.headers.get('origin');const publicPath=['/api/public/config','/api/public/content','/api/registrations'].includes(url.pathname)&&!url.searchParams.has('preview')
  const cors=!!e.LANDING_ORIGIN&&origin===e.LANDING_ORIGIN&&publicPath
  if(req.method==='OPTIONS')return cors?new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin!,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Idempotency-Key','Vary':'Origin'}}):new Response(null,{status:403})
  const result=await handle(req,e);if(!cors)return result
  const headers=new Headers(result.headers);headers.set('Access-Control-Allow-Origin',origin!);headers.append('Vary','Origin');return new Response(result.body,{status:result.status,headers})
 }
 if(url.pathname==='/'||url.pathname==='/admin'||url.pathname.startsWith('/admin/')||url.pathname==='/cancel'){url.pathname='/';return e.ASSETS.fetch(new Request(url,req))}
 return e.ASSETS.fetch(req)
} }
