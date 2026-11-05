<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Phone } from '@lucide/vue'
import BrandLogo from './BrandLogo.vue'
import { nav } from '../content'
import { texts } from '../cms'
const menuOpen = ref(false)
const scrolled = ref(false)
const toggle = ref<HTMLButtonElement>()
const header = ref<HTMLElement>()
let viewport: MediaQueryList
function closeMenu() { menuOpen.value = false }
function onScroll() { scrolled.value = window.scrollY > 80 }
function onResize() { if (!viewport.matches) closeMenu() }
function onKey(event: KeyboardEvent) {
  if (!menuOpen.value) return
  if (event.key === 'Escape') { closeMenu(); toggle.value?.focus() }
  if (event.key === 'Tab') {
    const items = header.value?.querySelectorAll<HTMLElement>('a[href], button')
    const visible = Array.from(items || []).filter(el => el.getClientRects().length)
    const first = visible[0], last = visible[visible.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}
onMounted(() => {
  viewport = matchMedia('(max-width: 980px)')
  viewport.addEventListener('change', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('keydown', onKey)
  onScroll()
})
onBeforeUnmount(() => {
  viewport?.removeEventListener('change', onResize)
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('keydown', onKey)
})
</script>
<template>
  <div class="site-header-shell" :class="{ 'is-scrolled': scrolled, 'is-open': menuOpen }">
    <Transition name="menu-backdrop"><div v-if="menuOpen" class="menu-backdrop" aria-hidden="true" @click="closeMenu" /></Transition>
    <header ref="header" class="header container">
      <a href="#" aria-label="Турбо Облако — главная" @click="closeMenu"><BrandLogo compact /></a>
      <nav class="desktop-nav" aria-label="Основная навигация"><a v-for="item in nav" :key="item.href" :href="item.href">{{ item.label }}</a></nav>
      <button ref="toggle" class="menu-toggle" :class="{ 'is-open': menuOpen }" :aria-expanded="menuOpen" aria-controls="mobile-nav" :aria-label="menuOpen ? 'Закрыть меню' : 'Открыть меню'" @click="menuOpen = !menuOpen"><span></span><span></span></button>
      <a class="button header-cta" href="#registration" @click="closeMenu">Регистрация</a>
      <Transition name="menu-panel">
        <section v-if="menuOpen" id="mobile-nav" class="mobile-menu-panel" aria-label="Меню сайта" data-lenis-prevent>
          <nav class="menu-links" aria-label="Мобильная навигация"><a v-for="item in nav" :key="item.href" :href="item.href" @click="closeMenu">{{ item.label === 'FAQ' ? 'Faq' : item.label }}</a></nav>
          <div class="menu-contacts">
            <a :href="'mailto:' + texts.contactEmail"><span class="menu-contact-icon"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="3" fill="currentColor"/><path d="m2 4 4.4 3.2a2.7 2.7 0 0 0 3.2 0L14 4" fill="none" stroke="#292929" stroke-width=".8"/></svg></span><span>{{ texts.contactEmail }}</span></a>
            <a :href="'tel:' + texts.contactPhone.replace(/[^+\d]/g, '')"><span class="menu-contact-icon"><Phone :size="16" fill="currentColor" /></span><span>{{ texts.contactPhone }}</span></a>
          </div>
          <a class="button menu-registration" href="#registration" @click="closeMenu">Регистрация</a>
          <p class="menu-event">{{ texts.footerEvent }}</p>
        </section>
      </Transition>
    </header>
  </div>
</template>
<style lang="scss">
.site-header-shell { position:fixed; inset:0 0 auto; z-index:50; }
.site-header-shell::before { content:''; position:absolute; inset:0 0 auto; height:130px; background:rgb(14 14 14 / 88%); border-bottom:1px solid rgb(255 255 255 / 8%); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); opacity:0; transform:translateY(-12px); transition:opacity 280ms ease,transform 280ms cubic-bezier(.23,1,.32,1); pointer-events:none; }
.site-header-shell.is-scrolled::before { opacity:1; transform:translateY(0); }
@media (max-width:1599px) and (min-width:981px) { .site-header-shell::before { height:120px; } }
.menu-backdrop { position:fixed; inset:0; background:#0005; backdrop-filter:blur(7px); }
.header .mobile-menu-panel { display:none; }
@media (min-width:981px) {
  .header .menu-toggle { display:none; }
  .header .desktop-nav { display:flex; }
}
@media (max-width:980px) {
  html { scroll-padding-top:84px; }
  .site-header-shell { position:fixed; transition:transform 260ms cubic-bezier(.23,1,.32,1); }
  .site-header-shell .header { position:relative; top:auto; left:auto; transform:none; max-width:none; margin:0; padding:15px; height:64px; gap:5px; }
  .site-header-shell::before { height:64px; }
  .site-header-shell.is-open .header::before { opacity:1; }
  .site-header-shell .header::before { content:''; position:absolute; inset:0; z-index:-1; background:#050505ed; opacity:0; transition:opacity 260ms ease; }
  .header .desktop-nav { display:none; }
  .header .brand-lockup .turbo-logo { width:120px; }
  .header .brand-lockup .forbes-logo,.header .brand-lockup .brand-divider { display:none; }
  .header .menu-toggle { display:flex; flex-direction:column; justify-content:center; align-items:center; margin-left:auto; width:56px; height:34px; padding:0; flex-shrink:0; border:0; border-radius:5px; background:#1d1c1c; gap:5px; }
  .header .menu-toggle span { width:16px; height:1px; background:#fff; transition:transform 220ms cubic-bezier(.23,1,.32,1); }
  .header .menu-toggle.is-open span:first-child { transform:translateY(3px) rotate(45deg); }
  .header .menu-toggle.is-open span:last-child { transform:translateY(-3px) rotate(-45deg); }
  .header .header-cta { width:105px; min-height:34px; padding:9px 14px; border-radius:5px; font-size:12px; font-weight:500; line-height:16px; background:#ff5100; color:#fff; }
  .header .mobile-menu-panel { position:absolute; display:flex; flex-direction:column; top:68px; left:15px; right:15px; height:612px; max-height:calc(100dvh - 88px); overflow:auto; overscroll-behavior:contain; padding:39px 9px 36px; background:#0e0e0e; border:1px solid #262626; border-radius:10px; box-shadow:0 8px 28px #0006; }
  .menu-links { display:grid; gap:5px; }
  .menu-links a { display:flex; align-items:center; justify-content:center; min-height:44px; border-radius:4px; background:#131313; font-size:16px; font-weight:450; color:#fff; line-height:22px; }
  .menu-contacts { display:grid; grid-template-columns:166fr 167fr; gap:7px; margin-top:5px; }
  .menu-contacts > a { min-width:0; min-height:79px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; gap:0; background:#131313; border-radius:4px; font-size:16px; line-height:20px; font-weight:600; color:#fff; overflow-wrap:anywhere; }
  .menu-contacts > a > span:last-child { transform:translateY(1px); }
  .menu-contact-icon { display:grid; place-items:center; width:24px; height:24px; border-radius:5px; background:#292929; }
  .header .menu-registration { margin-top:5px; width:100%; min-height:38px; padding:10px; border-radius:5px; font-size:14px; font-weight:500; line-height:18px; background:#ff5100; color:#fff; }
  .menu-event { margin-top:auto; padding-top:40px; white-space:pre-line; text-align:center; color:#898989; font-size:16px; font-weight:400; letter-spacing:-.3px; line-height:24px; }
  .menu-panel-enter-active,.menu-panel-leave-active { transition:opacity 240ms ease,transform 240ms cubic-bezier(.23,1,.32,1); transform-origin:top right; }
  .menu-panel-enter-from,.menu-panel-leave-to { opacity:0; transform:translateY(-10px) scale(.98); }
  .menu-backdrop-enter-active,.menu-backdrop-leave-active { transition:opacity 240ms ease; }
  .menu-backdrop-enter-from,.menu-backdrop-leave-to { opacity:0; }
  .header .menu-toggle:active,.header .menu-registration:active { scale:.97; }
}
@media (prefers-reduced-motion:reduce) {
  .menu-panel-enter-from,.menu-panel-leave-to { transform:none; }
  .site-header-shell::before { transform:none; }
}
</style>
