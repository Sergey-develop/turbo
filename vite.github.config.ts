import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({base:'/turbo/',plugins:[vue()],build:{outDir:'dist-github'}})
