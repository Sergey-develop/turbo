import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
export function database(filename=':memory:',migrate=true){
 const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
 if(migrate)for(const name of ['0000_registration','0002_admin_workflows'])db.exec(readFileSync(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8').replaceAll('--> statement-breakpoint',''))
 function prepare(sql,args=[]){return {
  bind(...values){return prepare(sql,values)},
  async first(column){const row=db.prepare(sql).get(...args);return row?(column?row[column]:{...row}):null},
  async all(){return {results:db.prepare(sql).all(...args).map(x=>({...x})),success:true}},
  async run(){const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:result.changes}}},
 }}
 return {raw:db,prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const out=[];for(const s of statements)out.push(await s.all());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}}
}
