// Password authentication for the standalone Cloudflare deployment.
// The password verifier and session signing material must only be stored as secrets.
export interface PasswordAuthEnv {
 DB: D1Database
 ADMIN_USERNAME?: string
 ADMIN_PASSWORD_VERIFIER?: string
}

const encoder = new TextEncoder()
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))) }
function equal(a: string, b: string) {
 let diff = a.length ^ b.length
 for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
 return diff === 0
}
async function verifyPassword(password: string, verifier: string) {
 const [algorithm, iterationsText, saltHex, expected] = verifier.split('$')
 const iterations = Number(iterationsText)
 if (algorithm !== 'pbkdf2-sha256' || iterations !== 100000 || !/^[0-9a-f]{32}$/.test(saltHex || '') || !/^[0-9a-f]{64}$/.test(expected || '')) return false
 const salt = new Uint8Array(saltHex.match(/../g)!.map(byte => parseInt(byte, 16)))
 const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
 const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
 return equal(hex(new Uint8Array(bits)), expected)
}
function cookie(req: Request) {
 return req.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('__Host-turbo_session='))?.split('=')[1] || ''
}
export async function passwordPrincipal(req: Request, env: PasswordAuthEnv) {
 const session = cookie(req)
 if (!/^[0-9a-f]{64}$/.test(session)) return null
 const row = await env.DB.prepare('SELECT principal FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(await sha256(session), Date.now()).first<{principal: string}>()
 return row?.principal || null
}
export async function passwordLogin(req: Request, env: PasswordAuthEnv, username: string, password: string) {
 if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_VERIFIER) return { error: 'Вход ещё не настроен', status: 503 }
 if (username.length > 160 || password.length > 1024) return { error: 'Неверный логин или пароль', status: 401 }
 const now = Date.now()
 const ip = req.headers.get('cf-connecting-ip') || 'unknown'
 const bucket = Math.floor(now / 900000)
 const limitKey = 'login:' + await sha256(ip + ':' + bucket)
 const attempt = await env.DB.prepare('INSERT INTO rate_limits(key,expires) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(limitKey, now + 900000).first<{count: number}>()
 if ((attempt?.count || 0) > 10) return { error: 'Слишком много попыток. Повторите позже.', status: 429 }
 const valid = await verifyPassword(password, env.ADMIN_PASSWORD_VERIFIER)
 if (!equal(username, env.ADMIN_USERNAME) || !valid) return { error: 'Неверный логин или пароль', status: 401 }
 const session = hex(crypto.getRandomValues(new Uint8Array(32)))
 const expires = now + 8 * 60 * 60 * 1000
 await env.DB.batch([
  env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<?').bind(now),
  env.DB.prepare('INSERT INTO admin_sessions(token_hash,principal,expires_at) VALUES(?,?,?)').bind(await sha256(session), username, expires),
  env.DB.prepare('INSERT INTO audit(actor,action,resource) VALUES(?,?,?)').bind(username, 'auth.login', 'admin'),
 ])
 return { status: 200, setCookie: `__Host-turbo_session=${session}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict` }
}
export async function passwordLogout(req: Request, env: PasswordAuthEnv) {
 const session = cookie(req)
 if (/^[0-9a-f]{64}$/.test(session)) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await sha256(session)).run()
 return '__Host-turbo_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'
}
