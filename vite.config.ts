import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { sites } from './scripts/vite/sites-vite-plugin'
export default defineConfig(async ({ command }) => {
  const { cloudflare } = await import('@cloudflare/vite-plugin')
  return { plugins: [vue(), sites(), cloudflare({
    viteEnvironment: { name: 'server' }, inspectorPort: false,
    config: {
      name: 'turbo-rave', main: './server/index.ts', compatibility_date: '2026-05-15', compatibility_flags: ['nodejs_compat'],
      ...(command==='serve'?{vars:{BOOTSTRAP_ADMIN_EMAILS:'seedy@sites.test',CANCEL_SECRET:'local-development-secret-not-for-production',MAIL_PROVIDER:'disabled'}}:{}),
      r2_buckets:[{binding:'BUCKET',bucket_name:'turbo-rave-photos'}],
      assets: { binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: ['/api/*'] },
      d1_databases: [{ binding: 'DB', database_name: 'turbo-rave', migrations_dir:'./drizzle', database_id: '00000000-0000-4000-8000-000000000000' }],
    },
  })] }
})
