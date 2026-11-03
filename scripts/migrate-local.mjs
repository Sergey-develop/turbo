import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const config='dist/server/wrangler.json'
// Wrangler migrations tracks applied filenames; never replays applied migrations.
const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to','.wrangler/state'],{stdio:'inherit',windowsHide:true})
if(!readdirSync('drizzle').some(x=>x.endsWith('.sql')))throw Error('No migrations')
process.exitCode=r.status??1
