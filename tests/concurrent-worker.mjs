import {parentPort,workerData} from 'node:worker_threads'
import {database} from './db.mjs'
const db=database(workerData.path,false),signal=new Int32Array(workerData.start)
Atomics.wait(signal,0,0)
try{db.raw.prepare("UPDATE registrations SET status='approved' WHERE id=?").run(workerData.id);parentPort.postMessage('approved')}catch(e){parentPort.postMessage(e.message.includes('capacity_exceeded')?'full':'error:'+e.message)}finally{db.raw.close()}
