import {mkdirSync,readdirSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
function scan(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?scan(join(dir,x.name)):x.name.endsWith('.sqlite')&&x.name!=='metadata.sqlite'?[join(dir,x.name)]:[])}
const root=resolve('.wrangler/state/v3/d1'),files=scan(root)
if(files.length!==1)throw Error('Expected one local D1 database; select the intended database explicitly before backing up.')
mkdirSync('backups',{recursive:true})
const file=resolve(`backups/local-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`)
const db=new DatabaseSync(files[0],{readOnly:true});db.exec('PRAGMA busy_timeout=5000');db.prepare('VACUUM INTO ?').run(file);db.close();console.log('Consistent SQLite backup:',file)
