import {test} from 'node:test'
import assert from 'node:assert/strict'
import {pbkdf2Sync} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {database} from './db.mjs'
import worker,{handle} from '../server/index.ts'

test('password login uses an opaque revocable session and ignores forged identity headers', async()=>{
 const db=database()
 db.raw.exec(readFileSync(new URL('../drizzle/0001_password_sessions.sql',import.meta.url),'utf8'))
 const salt='11111111111111111111111111111111', password='a long test password 123'
 const hash=pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex')
 const env={DB:db,AUTH_MODE:'password',ADMIN_USERNAME:'admin',ADMIN_PASSWORD_VERIFIER:`pbkdf2-sha256$100000$${salt}$${hash}`}
 const call=(path,method='GET',data,headers={})=>handle(new Request('https://test.local/api/'+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})}),env)
 assert.equal((await call('admin/me','GET',undefined,{'oai-authenticated-user-id':'admin','oai-authenticated-user-email':'admin'})).status,401)
 assert.equal((await call('auth/login','POST',{username:'admin',password:'wrong'})).status,401)
 const login=await call('auth/login','POST',{username:'admin',password})
 assert.equal(login.status,200)
 const cookie=login.headers.get('set-cookie')
 assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/)
 assert.equal((await call('admin/me','GET',undefined,{cookie})).status,200)
 assert.equal((await call('auth/logout','POST',{}, {cookie,origin:'https://evil.example'})).status,403)
 assert.equal((await call('auth/logout','POST',{}, {cookie})).status,200)
 assert.equal((await call('admin/me','GET',undefined,{cookie})).status,401)
 db.raw.close()
})

test('cross-origin access is restricted to public endpoints and the configured landing origin',async()=>{
 const db=database()
 const env={DB:db,LANDING_ORIGIN:'https://sergey-develop.github.io'}
 const options=origin=>new Request('https://api.example/api/registrations',{method:'OPTIONS',headers:{origin}})
 assert.equal((await worker.fetch(options('https://evil.example'),env)).status,403)
 const preflight=await worker.fetch(options(env.LANDING_ORIGIN),env)
 assert.equal(preflight.status,204)
 assert.equal(preflight.headers.get('access-control-allow-origin'),env.LANDING_ORIGIN)
 const admin=await worker.fetch(new Request('https://api.example/api/admin/me',{method:'OPTIONS',headers:{origin:env.LANDING_ORIGIN}}),env)
 assert.equal(admin.status,403)
 const config=await worker.fetch(new Request('https://api.example/api/public/config',{headers:{origin:env.LANDING_ORIGIN}}),env)
 assert.equal(config.headers.get('access-control-allow-origin'),env.LANDING_ORIGIN)
 db.raw.close()
})
