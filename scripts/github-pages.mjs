import {readdir,readFile,writeFile} from 'node:fs/promises'
import {join,extname} from 'node:path'

// Some existing CMS defaults use root-relative asset paths. GitHub project
// pages live below /turbo/, so rewrite only built text assets for that host.
async function visit(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name)
  if(entry.isDirectory())await visit(path)
  else if(['.html','.css','.js'].includes(extname(path))){
   const text=await readFile(path,'utf8')
   await writeFile(path,text.replaceAll('"/assets/','"/turbo/assets/').replaceAll("'/assets/","'/turbo/assets/").replaceAll('`/assets/','`/turbo/assets/').replaceAll('url(/assets/','url(/turbo/assets/'))
  }
 }
}
await visit('dist-github')
