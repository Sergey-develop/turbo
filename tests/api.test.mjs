import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Worker} from 'node:worker_threads'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {database} from './db.mjs'
import worker,{handle} from '../server/index.ts'
import {defaultSettings} from '../server/defaults.ts'
const content={program:[{title:'Открытие',time:'18:30'}],speakers:[{name:'Имя',role:'Роль',topic:'Тема',image:'/assets/speaker.webp'}],faq:[{question:'Вопрос',answer:'Ответ'}],texts:{heroDate:'Дата'}}
async function setup(){const db=database();const env={DB:db,BOOTSTRAP_ADMIN_EMAILS:'admin@test.local',CANCEL_SECRET:'test-secret',MAIL_PROVIDER:'disabled',PUBLIC_ORIGIN:'https://test.local'};const call=async(path,method='GET',data,who='admin',extra={})=>{const headers={'oai-authenticated-user-id':who,'oai-authenticated-user-email':who+'@test.local',...extra};if(data)headers['Content-Type']='application/json';const response=await handle(new Request('https://test.local/api/'+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json()}};await call('admin/initialize','POST',{content});db.raw.prepare('UPDATE settings SET data=? WHERE id=1').run(JSON.stringify({...defaultSettings,mode:'moderated',legalApproved:true}));return{db,env,call}}
const form=(email='guest@test.local')=>({surname:'Гость',name:'Тест',company:'Компания',position:'Роль',email,phone:'+79991234567',consent:true,marketing:false,consentVersion:'draft-1',marketingVersion:'draft-1',utm:{utm_source:'campaign',utm_campaign:'launch'}})
test('four modes are enforced, duplicate email and idempotency',async()=>{for(const mode of ['open','moderated','waitlist','closed']){const {db,call}=await setup();db.raw.prepare("UPDATE settings SET data=json_set(data,'$.mode',?)").run(mode);const data=form(),key='abcdefghijklmnop';const r=await call('registrations','POST',data,'visitor',{'Idempotency-Key':key});assert.equal(r.status,mode==='closed'?409:201);if(mode!=='closed'){assert.equal(db.raw.prepare('SELECT status FROM registrations').get().status,{open:'approved',moderated:'pending',waitlist:'waitlisted'}[mode]);assert.equal((await call('registrations','POST',data,'visitor',{'Idempotency-Key':key})).status,200);assert.equal((await call('registrations','POST',{...data,name:'Другой'},'visitor',{'Idempotency-Key':key})).status,409);assert.equal((await call('registrations','POST',data,'visitor',{'Idempotency-Key':'different-key-12345'})).status,409);assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM registrations').get().n,1)}db.raw.close()}})
test('registration + outbox atomic, approval queues once, cancellation revokes queued mail',async()=>{const {db,call}=await setup();const r=await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'abcdefghijklmnop'});const row=db.raw.prepare('SELECT * FROM registrations').get();assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM mail_jobs').get().n,1);assert.equal((await call(`admin/registrations/${row.id}/approve`,'POST',{version:1})).status,200);assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM mail_jobs').get().n,2);const u=new URL(r.data.cancelUrl,'https://test.local');assert.equal((await call('cancel','POST',{id:row.id,token:u.searchParams.get('token')})).status,200);assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM mail_jobs WHERE state='queued'").get().n,0);assert.equal((await call('cancel','POST',{id:row.id,token:'wrong'})).status,403);assert.equal((await call(`admin/registrations/${row.id}/approve`,'POST',{version:3})).status,409);db.raw.close()})
test('server RBAC, CSRF, validation, consent versions, UTM filters, analytics, CSV allowlist',async()=>{const {db,call,env}=await setup();assert.equal((await call('admin/registrations','GET',undefined,'visitor')).status,403);assert.equal((await call('admin/settings','PUT',{},'admin',{origin:'https://evil.local'})).status,403);assert.equal((await call('registrations','POST',{...form(),consent:false},'visitor',{'Idempotency-Key':'abcdefghijklmnop'})).status,422);assert.equal((await call('registrations','POST',{...form(),consentVersion:'old'},'visitor',{'Idempotency-Key':'abcdefghijklmnop'})).status,409);await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'abcdefghijklmnop'});assert.equal((await call('admin/registrations?utm_source=campaign')).data.total,1);assert.equal((await call('admin/registrations?utm_source=other')).data.total,0);assert.equal((await call('admin/analytics')).data.statuses[0].count,1);const csv=await handle(new Request('https://test.local/api/admin/export',{headers:{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'admin@test.local'}}),env);const text=await csv.text();assert.ok(!text.split('\n')[0].includes('phone'));assert.ok(db.raw.prepare('SELECT COUNT(*) n FROM audit').get().n>0);db.raw.close()})
test('CMS draft is private, optimistic locking, publish, snapshots, template variables',async()=>{const {db,call}=await setup();const changed={...content,texts:{heroDate:'Новая дата'}};assert.equal((await call('admin/content','PUT',{content:changed,version:1})).status,200);assert.equal((await call('public/content')).data.content.texts.heroDate,'Дата');assert.equal((await call('public/content?preview=1','GET',undefined,'visitor')).status,403);assert.equal((await call('admin/content','PUT',{content,version:1})).status,409);assert.equal((await call('admin/content/publish','POST',{version:2})).status,200);assert.equal((await call('public/content')).data.content.texts.heroDate,'Новая дата');assert.equal((await call('admin/templates','PUT',{id:'approved',subject:'Привет {{unknown}}',body:'Текст',version:1})).status,422);const preview=await call('admin/templates/test','POST',{id:'approved'});assert.equal(preview.status,200);assert.ok(!preview.data.body.includes('{{'));db.raw.close()})
test('outbox rollback and capacity/config guard are database invariants',async()=>{const {db,call}=await setup();db.raw.exec("CREATE TRIGGER fail_mail BEFORE INSERT ON mail_jobs BEGIN SELECT RAISE(ABORT,'simulate_mail_failure'); END;");assert.equal((await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'abcdefghijklmnop'})).status,503);assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);db.raw.exec('DROP TRIGGER fail_mail');await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'abcdefghijklmnop'});const id=db.raw.prepare('SELECT id FROM registrations').get().id;db.raw.prepare("UPDATE settings SET data=json_set(data,'$.capacity',1)").run();await call(`admin/registrations/${id}/approve`,'POST',{version:1});assert.throws(()=>db.raw.prepare("UPDATE settings SET data=json_set(data,'$.capacity',0)").run(),/capacity_below_confirmed/);db.raw.close()})
test('mail provider retries, stable idempotency, concurrent dispatch and cancellation',async(t)=>{
 const {db,call,env}=await setup();await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'abcdefghijklmnop'});
 env.MAIL_PROVIDER='resend';env.RESEND_API_KEY='test-only';env.MAIL_FROM='test@example.com';db.raw.exec("UPDATE settings SET data=json_set(data,'$.mailEnabled',1)")
 let calls=0;const keys=[];const fake=t.mock.method(globalThis,'fetch',async(_url,options)=>{calls++;keys.push(options.headers['Idempotency-Key']);return Response.json(calls===1?{error:'unavailable'}:{id:'provider-test-id'},{status:calls===1?503:200})})
 await call('admin/mail/run','POST',{});let job=db.raw.prepare('SELECT * FROM mail_jobs').get();assert.equal(job.state,'queued');assert.equal(job.attempts,1);assert.equal(job.last_error,'provider_http_503');
 db.raw.exec('UPDATE mail_jobs SET available_at=0');await Promise.all([call('admin/mail/run','POST',{}),call('admin/mail/run','POST',{})]);job=db.raw.prepare('SELECT * FROM mail_jobs').get();assert.equal(job.state,'sent');assert.equal(calls,2);assert.equal(keys[0],keys[1]);assert.equal(job.provider_id,'provider-test-id');fake.mock.restore();db.raw.close()
})
test('audit failure rolls back content changes, legal settings require basis and new version',async()=>{
 const {db,call}=await setup();db.raw.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON audit WHEN NEW.action='content.saved' BEGIN SELECT RAISE(ABORT,'audit_failure'); END")
 assert.equal((await call('admin/content','PUT',{content:{...content,texts:{heroDate:'Must rollback'}},version:1})).status,503);assert.equal(db.raw.prepare('SELECT version FROM content').get().version,1)
 const config=(await call('admin/settings')).data;assert.equal((await call('admin/settings','PUT',{...config,consentBasis:'Basis',marketingBasis:'Basis',consentText:'new text'})).status,422)
 assert.equal((await call('admin/settings','PUT',{...config,consentBasis:'Basis',marketingBasis:'Basis',consentVersion:'v2',consentText:'new text'})).status,200);db.raw.close()
})
test('media restricts type, scanner has no list access, checked-in requires approved guest',async()=>{
 const {db,call,env}=await setup();db.raw.exec("INSERT INTO roles VALUES('scanner','scanner')");assert.equal((await call('admin/registrations','GET',undefined,'scanner')).status,403)
 env.BUCKET={put:async()=>{},get:async()=>null};const r=await handle(new Request('https://test.local/api/admin/media',{method:'POST',headers:{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'admin@test.local','Content-Type':'image/svg+xml'},body:'<svg/>'}),env);assert.equal(r.status,422)
 await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'abcdefghijklmnop'});const id=db.raw.prepare('SELECT id FROM registrations').get().id;db.raw.exec("UPDATE settings SET data=json_set(data,'$.checkIn',1)");assert.equal((await call(`admin/registrations/${id}/checkin`,'POST',{version:1},'scanner')).status,409);await call(`admin/registrations/${id}/approve`,'POST',{version:1});assert.equal((await call(`admin/registrations/${id}/checkin`,'POST',{version:2},'scanner')).status,200);assert.ok(db.raw.prepare('SELECT checked_in_at FROM registrations').get().checked_in_at);db.raw.close()
})
test('two separate SQLite connections concurrently approving last place cannot overbook',async()=>{const dir=mkdtempSync(join(tmpdir(),'turbo-capacity-'));try{const path=join(dir,'db.sqlite');const db=database(path);db.raw.prepare('INSERT INTO settings VALUES(1,?,1)').run(JSON.stringify({...defaultSettings,mode:'moderated',capacity:1,legalApproved:true}));for(const id of ['a','b'])db.raw.prepare("INSERT INTO registrations(id,email,data,status,consent_version,consent_text,marketing,marketing_version,marketing_text,utm,request_key,request_hash,actor) VALUES(?,?,?,'pending','draft-1','text',0,'draft-1','text','{}',?,'hash','test')").run(id,id+'@test.local','{}',id);const start=new SharedArrayBuffer(4);const run=id=>new Promise((resolve,reject)=>{const worker=new Worker(new URL('./concurrent-worker.mjs',import.meta.url),{workerData:{path,id,start}});worker.once('message',resolve);worker.once('error',reject)});const tasks=[run('a'),run('b')];Atomics.store(new Int32Array(start),0,1);Atomics.notify(new Int32Array(start),0);const outcomes=await Promise.all(tasks);assert.equal(outcomes.filter(x=>x==='approved').length,1);assert.equal(db.raw.prepare("SELECT COUNT(*) n FROM registrations WHERE status='approved'").get().n,1);db.raw.close()}finally{rmSync(dir,{recursive:true,force:true})}})

test('Worker explicitly routes SPA pages to root asset, preserving API and unknown paths',async()=>{const paths=[];const env={ASSETS:{fetch:async r=>{paths.push(new URL(r.url).pathname);return new Response('html')}}};for(const path of ['/','/admin','/admin/settings','/cancel?id=abc','/assets/image.png'])await worker.fetch(new Request('https://test.local'+path),env);assert.deepEqual(paths,['/','/','/','/','/assets/image.png'])})
test('overview aggregates live records and excludes personal rows for analyst',async()=>{
 const {db,call}=await setup();await call('registrations','POST',form('a@example.test'),'visitor',{'Idempotency-Key':'abcdefghijklmnop'});await call('registrations','POST',form('b@example.test'),'visitor',{'Idempotency-Key':'qrstuvwxyz012345'});const id=db.raw.prepare('SELECT id FROM registrations LIMIT 1').get().id;await call(`admin/registrations/${id}/approve`,'POST',{version:1});
 const summary=await call('admin/overview');assert.equal(summary.status,200);assert.equal(summary.data.total,2);assert.equal(summary.data.pending,1);assert.equal(summary.data.approved,1);assert.equal(summary.data.sent,0);assert.equal(summary.data.latest.length,2)
 db.raw.exec("INSERT INTO roles VALUES('analyst','analyst')");const limited=await call('admin/overview','GET',undefined,'analyst');assert.equal(limited.data.total,2);assert.deepEqual(limited.data.latest,[]);assert.equal((await call('admin/overview','GET',undefined,'visitor')).status,403);db.raw.close()
})


test('invitees import is previewable, deduplicated, searchable and never creates registrations or mail',async()=>{
 const {db,call}=await setup();const guest={surname:'Иванов',name:'Иван',email:'IVAN@example.test',company:'Турбо'};
 const preview=await call('admin/invitees','POST',{guests:[guest,guest],preview:true});assert.equal(preview.status,200);assert.equal(preview.data.newCount,1);assert.equal(preview.data.duplicates.length,1);assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM invitees').get().n,0);
 const result=await call('admin/invitees','POST',{guests:[guest,guest]});assert.equal(result.data.added,1);assert.equal(result.data.skipped,1);
 assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM mail_jobs').get().n,0);
 assert.equal((await call('admin/invitees?q='+encodeURIComponent('иван'))).data.total,1);
 assert.equal((await call('admin/invitees','POST',{guests:[guest]},'visitor')).status,403);
 assert.equal((await call('admin/invitees','POST',{guests:[{...guest,email:'second@example.test'},{...guest,email:'invalid'}]})).status,422);
 assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM invitees').get().n,1);
 await call('registrations','POST',form('ivan@example.test'),'visitor',{'Idempotency-Key':'guest-invite-123456'});
 const invited=(await call('admin/invitees')).data.rows[0];assert.equal(invited.registration_status,'pending');
 await call('admin/invitees','DELETE',{id:invited.id});assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM registrations').get().n,1);db.raw.close();
})

test('pagination is stable with equal timestamps and export includes every filtered page',async()=>{
 const {db,call,env}=await setup();
 const insert=db.raw.prepare("INSERT INTO registrations(id,email,data,status,consent_version,consent_text,marketing,marketing_version,marketing_text,utm,request_key,request_hash,actor) VALUES(?,?,?,'pending','draft-1','text',0,'draft-1','text','{}',?,'hash','admin')");
 for(let i=0;i<55;i++)insert.run('reg-'+String(i).padStart(3,'0'),`guest${i}@example.test`,JSON.stringify({name:'Гость',surname:'Тест',company:i<53?'Target':'Other'}),'key-'+i);
 const first=(await call('admin/registrations?q=Target&page=0')).data,second=(await call('admin/registrations?q=Target&page=1')).data;
 assert.equal(first.total,53);assert.equal(first.rows.length,50);assert.equal(second.rows.length,3);assert.equal(new Set([...first.rows,...second.rows].map(r=>r.id)).size,53);
 const response=await handle(new Request('https://test.local/api/admin/export?q=Target&page=1',{headers:{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'admin@test.local'}}),env);
 assert.equal((await response.text()).trim().split('\r\n').length,54);db.raw.close();
})

test('publication history previews and restores a draft without silently publishing it',async()=>{
 const {db,call}=await setup();const original=(await call('admin/content/history')).data[0];
 assert.equal((await call('admin/content/history/'+original.id)).data.content.texts.heroDate,'Дата');
 await call('admin/content','PUT',{content:{...content,texts:{heroDate:'Новая публикация'}},version:1});await call('admin/content/publish','POST',{version:2});
 assert.equal((await call('admin/content/history')).data.length,2);
 const restored=await call('admin/content/restore','POST',{id:original.id,version:3});assert.equal(restored.status,200);
 assert.equal((await call('admin/content')).data.content.texts.heroDate,'Дата');assert.equal((await call('public/content')).data.content.texts.heroDate,'Новая публикация');
 assert.equal((await call('admin/content/restore','POST',{id:original.id,version:3})).status,409);
 assert.equal((await call('admin/content/history','GET',undefined,'visitor')).status,403);
 await call('admin/content/publish','POST',{version:4});assert.equal((await call('public/content')).data.content.texts.heroDate,'Дата');assert.equal((await call('admin/content/history')).data.length,3);db.raw.close();
})

test('mail retry freezes provider payload, exposes real delivery, and makes explicit resend idempotent',async(t)=>{
 const {db,call,env}=await setup();await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'mail-workflow-1234'});
 env.MAIL_PROVIDER='resend';env.RESEND_API_KEY='test-only';env.MAIL_FROM='events@example.test';db.raw.exec("UPDATE settings SET data=json_set(data,'$.mailEnabled',1)");
 const payloads=[];let attempts=0;
 const mock=t.mock.method(globalThis,'fetch',async(_url,options)=>{if(!options.method)return Response.json({last_event:'delivered'});payloads.push(options.body);attempts++;return Response.json(attempts===1?{}:{id:'provider-id'},{status:attempts===1?503:200})});
 await call('admin/mail/run','POST',{});const job=db.raw.prepare('SELECT * FROM mail_jobs').get();assert.ok(job.payload);assert.ok(job.first_attempt_at);
 db.raw.exec("UPDATE registrations SET data=json_set(data,'$.name','Изменённое имя');UPDATE settings SET data=json_set(data,'$.mailFrom','other@example.test')");
 assert.equal((await call(`admin/mail/${encodeURIComponent(job.id)}/retry`,'POST',{})).status,200);
 await call('admin/mail/run','POST',{});assert.equal(payloads[0],payloads[1]);assert.equal((await call(`admin/mail/${encodeURIComponent(job.id)}/delivery`,'POST',{})).data.status,'delivered');
 const resend={confirm:true,requestKey:'resend-request-123456'};
 const a=await call(`admin/mail/${encodeURIComponent(job.id)}/resend`,'POST',resend),b=await call(`admin/mail/${encodeURIComponent(job.id)}/resend`,'POST',resend);
 assert.equal(a.data.id,b.data.id);assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM mail_jobs').get().n,2);assert.equal(attempts,2,'queue creation must not send');
 assert.equal((await call('admin/mail/config')).data.keyConfigured,true);mock.mock.restore();db.raw.close();
})

test('expired ambiguous sends require explicit reconciliation and cannot be blindly retried',async()=>{
 const {db,call}=await setup();await call('registrations','POST',form(),'visitor',{'Idempotency-Key':'old-mail-12345678'});const job=db.raw.prepare('SELECT * FROM mail_jobs').get();
 db.raw.prepare("UPDATE mail_jobs SET state='sending',attempts=1,first_attempt_at=?,lease_until=0 WHERE id=?").run(Date.now()-24*3600000,job.id);
 assert.equal((await call(`admin/mail/${encodeURIComponent(job.id)}/retry`,'POST',{})).status,409);
 assert.equal((await call(`admin/mail/${encodeURIComponent(job.id)}/resend`,'POST',{confirm:true,requestKey:'resend-old-12345678'})).status,422);
 const result=await call(`admin/mail/${encodeURIComponent(job.id)}/resend`,'POST',{confirm:true,reconciled:true,requestKey:'resend-old-12345678'});assert.equal(result.status,200);
 assert.equal(db.raw.prepare('SELECT state FROM mail_jobs WHERE id=?').get(job.id).state,'failed');assert.equal(db.raw.prepare('SELECT state FROM mail_jobs WHERE id=?').get(result.data.id).state,'queued');db.raw.close();
})

test('CSV import handles UTF-8 BOM, quoted commas, newlines and invalid files',async()=>{
 const {inviteesFromCsv}=await import('../src/csv.ts');
 const guests=inviteesFromCsv('\uFEFFФамилия;Имя;Email;Компания\r\nИванов;Иван;ivan@example.test;"ООО, Турбо"\r\n');assert.equal(guests[0].company,'ООО, Турбо');
 assert.throws(()=>inviteesFromCsv('name,email\nИван,a@example.test'),/Обязательные/);
 assert.throws(()=>inviteesFromCsv('surname,name,email\nИванов,Иван,"bad'),/Незакрытая/);
 assert.throws(()=>inviteesFromCsv('surname,name,email\nИванов,Иван'),/количество/);
})


test('100-guest import uses bounded queries and respects the D1 100-parameter limit',async()=>{
 const {db,call,env}=await setup();let queries=0;const prepare=env.DB.prepare;
 env.DB.prepare=sql=>{queries++;const statement=prepare(sql);const bind=statement.bind;statement.bind=(...args)=>{assert.ok(args.length<=100);return bind(...args)};return statement};
 const result=await call('admin/invitees','POST',{guests:Array.from({length:100},(_,i)=>({surname:'Гость',name:'Имя',email:`bulk${i}@example.test`}))});
 assert.equal(result.status,201);assert.equal(result.data.added,100);assert.ok(queries<10);db.raw.close();
})
