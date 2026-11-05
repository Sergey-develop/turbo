import { createApp } from 'vue'
import App from './App.vue'
import './style.scss'
import './desktop-1920.scss'
import './motion.scss'
import './footer.scss'
import './mobile-390.scss'
import './editorial.scss'
import { cms, loadContent } from './cms'
import { waitForPageResources, revealPage, setLoadingProgress } from './pageLoader'
async function start(){
  if(location.pathname==='/admin'||location.pathname.startsWith('/admin/')){
    const {default:Admin}=await import('./AdminApp.vue');createApp(Admin).mount('#app')
  }else if(location.pathname==='/cancel'){
    const {default:Cancel}=await import('./CancelPage.vue');createApp(Cancel).mount('#app')
  }else{
    try{await loadContent()}catch{console.warn('Не удалось загрузить опубликованный контент; показана резервная версия.')}
    setLoadingProgress(5)
    createApp(App).directive('cms',cms).mount('#app')
    try { await waitForPageResources() } finally { await revealPage() }
  }
}
void start()

