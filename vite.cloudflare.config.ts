import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cloudflare } from '@cloudflare/vite-plugin'

// Standalone Cloudflare deployment; never used by the existing Sites deployment.
export default defineConfig({
 plugins: [vue(), cloudflare({viteEnvironment:{name:'server'},inspectorPort:false,config:{
  name:'turbo-rave',main:'./server/index.ts',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],
  vars:{AUTH_MODE:'password',MAIL_PROVIDER:'disabled',LANDING_ORIGIN:'https://sergey-develop.github.io'},
  assets:{binding:'ASSETS',not_found_handling:'single-page-application',run_worker_first:['/api/*']},
  d1_databases:[{binding:'DB',database_name:'turbo-rave',database_id:'9f5a0e61-726f-49c9-858d-d1f52c64d7ea',migrations_dir:'./drizzle'}],
 }})],
})
