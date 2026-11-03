import {cpSync} from 'node:fs'
// Keep Wrangler local migration discovery relative to its generated config.
cpSync('drizzle','dist/server/drizzle',{recursive:true})
