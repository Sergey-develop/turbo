<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import BrandLogo from './BrandLogo.vue'
import { texts, loadContent } from '../cms'
const frame = ref<HTMLIFrameElement>()
const ready = ref(false)
const failed = ref(false)
const started = ref(false)
const step = ref(0)
const muted = ref(true)
const supportsSpeech = 'speechSynthesis' in window
const slides = computed(() => [
  { label: 'Здравствуйте!', title: 'Видите, как быстро <em>металл обретает форму?</em>', text: 'Так и технологии Турбо Облака помогают быстро отвечать на задачи бизнеса.' },
  { label: 'Под капотом', title: 'Самое интересное <em>скрыто под капотом:</em>', text: 'решения и люди, благодаря которым всё работает.' },
  { label: texts.heroDate, title: 'Турбо Облако приглашает вас <em>на клиентский вечер</em>', text: texts.heroTime },
  { label: 'Москва', title: 'Пространство <em>Суперметалл</em>', text: texts.address.split('\n').slice(1).join(' ') },
  { label: 'До встречи!', title: 'Будем рады встрече!', text: 'Нажмите «К мероприятию», чтобы узнать программу и подать заявку на участие.' },
])
const timers: number[] = []
let timeout = 0
function receive(event: MessageEvent) {
  if (event.origin !== location.origin || event.source !== frame.value?.contentWindow) return
  if (event.data?.type === 'turbo-ar-ready') { ready.value = true; clearTimeout(timeout) }
  if (event.data?.type === 'turbo-ar-error') { failed.value = true; clearTimeout(timeout) }
}
function narrate() {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  if (muted.value || !started.value) return
  const slide = slides.value[step.value]!
  const speech = new SpeechSynthesisUtterance(`${slide.title.replace(/<[^>]+>/g, '')}. ${slide.text}`)
  speech.lang = 'ru-RU'; speech.rate = 1
  speechSynthesis.speak(speech)
}
function toggleSound() { muted.value = !muted.value; narrate() }
function start() {
  started.value = true
  frame.value?.contentWindow?.postMessage({ type: 'turbo-ar-play' }, location.origin)
  narrate()
  for (const [index, delay] of [8000, 15000, 21000, 28000].entries()) {
    timers.push(window.setTimeout(() => { step.value = index + 1; narrate() }, delay))
  }
}
function enter() {
  const url = new URL(location.href)
  url.searchParams.delete('ar')
  location.assign(url.pathname + url.search + url.hash)
}
onMounted(() => {
  addEventListener('message', receive)
  timeout = window.setTimeout(() => { if (!ready.value) failed.value = true }, 45000)
  void loadContent().catch(() => {})
})
onBeforeUnmount(() => {
  removeEventListener('message', receive)
  timers.forEach(clearTimeout); clearTimeout(timeout)
  if ('speechSynthesis' in window) speechSynthesis.cancel()
})
</script>

<template>
  <main class="ar-invitation" :class="{ 'has-started': started }">
    <div class="ar-background" aria-hidden="true"></div>
    <iframe v-if="!failed" ref="frame" class="ar-scene" src="/ar/scene.html" title="Интерактивная 3D-модель Speedtail" :class="{ 'is-ready': ready }"></iframe>
    <header class="ar-header">
      <BrandLogo />
      <button v-if="supportsSpeech" class="ar-sound" :aria-label="muted ? 'Включить озвучку' : 'Выключить озвучку'" :aria-pressed="!muted" @click="toggleSound">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M11 4 5 8H2v8h3l6 4z"/><path v-if="!muted" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path v-else d="m16 9 6 6m0-6-6 6"/></svg>
      </button>
    </header>
    <template v-if="!started">
      <h1 class="ar-heading"><span>ГОТОВЫ</span><span>ЗАГЛЯНУТЬ</span><em>ПОД КАПОТ?</em></h1>
      <button class="ar-ignition ar-start" :disabled="!ready && !failed" @click="failed ? enter() : start()"><span>{{ failed ? 'К мероприятию' : ready ? 'Открыть приглашение' : 'Загрузка 3D…' }}</span></button>
      <p v-if="failed" class="ar-error" role="status">Не удалось загрузить 3D-приглашение. Программа мероприятия доступна на сайте.</p>
    </template>
    <template v-else>
      <Transition name="ar-copy">
        <section :key="step" class="ar-caption" aria-live="polite">
          <span class="ar-label">{{ slides[step]!.label }}</span>
          <h1 v-html="slides[step]!.title"></h1>
          <p>{{ slides[step]!.text }}</p>
        </section>
      </Transition>
      <button v-if="step === 4 || failed" class="ar-ignition ar-finish" @click="enter"><span>К мероприятию</span></button>
      <nav class="ar-progress" aria-label="Этапы приглашения"><span v-for="(_, index) in slides" :key="index" :class="{ active: index <= step }"></span></nav>
    </template>
    <button class="ar-skip" @click="enter">{{ started ? 'Пропустить приглашение' : 'Перейти на сайт' }} <span aria-hidden="true">↗</span></button>
  </main>
</template>

<style scoped>
.ar-invitation{position:fixed;inset:0;isolation:isolate;overflow:hidden;background:#050506;color:#fff;font-family:Manrope,Arial,sans-serif;height:100dvh;min-height:420px}
.ar-background{position:absolute;inset:0;z-index:-2;background:linear-gradient(0deg,rgba(0,0,0,.65),transparent 45%,rgba(0,0,0,.25)),url('/ar/parking.png') center/cover}
.ar-scene{position:absolute;left:0;top:32%;width:100%;height:65%;border:0;opacity:0;transition:opacity 1s;z-index:-1;}
.ar-scene.is-ready{opacity:1}.has-started .ar-scene{top:12%;height:80%}
.ar-header{position:absolute;inset:32px 40px auto;display:flex;justify-content:space-between;align-items:center}
.ar-sound{width:64px;height:56px;display:grid;place-items:center;background:#202020;border:0;border-radius:8px;color:#fff;cursor:pointer}.ar-sound svg{width:28px;height:28px}
.ar-heading{position:absolute;top:12%;left:17%;width:66%;margin:0;font-size:clamp(40px,6.8vw,128px);font-weight:500;line-height:1.06;letter-spacing:-.045em;pointer-events:none}.ar-heading span{display:block}.ar-heading span:nth-child(2){text-align:right}.ar-heading em{display:block;text-align:center;color:#ff5000;font-style:normal}
.ar-ignition{width:clamp(130px,12vw,210px);aspect-ratio:1;border:7px solid transparent;border-radius:50%;background:linear-gradient(115deg,#823b12,#831811) padding-box,linear-gradient(45deg,#ff8a20,#ff252b) border-box;box-shadow:0 0 35px #ff490028,inset 0 0 0 10px #a4422722;color:white;cursor:pointer;padding:22px;font:600 clamp(14px,1.2vw,21px)/1.4 Manrope,Arial,sans-serif;transition:filter .2s,transform .2s}.ar-ignition:before{content:'';display:block;width:35px;height:5px;border-radius:8px;background:#ff3b0b;margin:0 auto 20px;box-shadow:0 0 10px #ff3b0b}.ar-ignition:hover{filter:brightness(1.15);transform:translateX(-50%) scale(1.03)}.ar-ignition:disabled{cursor:wait;filter:saturate(.5)}.ar-start{position:absolute;bottom:12%;left:50%;transform:translateX(-50%)}.ar-finish{position:absolute;top:37%;left:50%;transform:translateX(-50%)}
.ar-caption{position:absolute;bottom:9%;left:50%;transform:translateX(-50%);width:min(760px,80%);text-align:center;background:radial-gradient(ellipse,#000b,transparent 72%);padding:24px 30px 36px}.ar-caption:after{content:'';position:absolute;bottom:0;left:8%;right:8%;height:30px;border-bottom:2px solid #ff5900;border-radius:0 0 60px 60px;filter:drop-shadow(0 0 6px #ff5000)}.ar-label{display:inline-block;border:1px solid #ff7b0080;border-radius:30px;padding:5px 20px;font-size:clamp(14px,1.6vw,24px);margin-bottom:15px}.ar-caption h1{margin:0 auto 14px;font-size:clamp(24px,2.8vw,44px);font-weight:500;line-height:1.2;max-width:720px}.ar-caption :deep(em){color:#ff5000;font-style:normal}.ar-caption p{margin:0 auto;color:#b4b4b4;font-size:clamp(16px,1.6vw,26px);max-width:620px;line-height:1.4;white-space:pre-line}.ar-skip{position:absolute;right:40px;bottom:25px;color:#b8b8b8;background:transparent;border:0;font:inherit;font-size:13px;cursor:pointer}.ar-skip:hover{color:#fff}.ar-progress{position:absolute;left:40px;bottom:30px;display:flex;gap:7px}.ar-progress span{width:28px;height:2px;background:#ffffff35}.ar-progress .active{background:#ff5000}.ar-error{position:absolute;bottom:5%;left:15%;width:70%;text-align:center;font-size:14px}.ar-copy-enter-active,.ar-copy-leave-active{transition:opacity .45s,translate .45s}.ar-copy-enter-from{opacity:0;translate:0 10px}.ar-copy-leave-to{opacity:0;translate:0 -10px}button:focus-visible,iframe:focus-visible{outline:2px solid #fff;outline-offset:6px}
@media(max-width:767px){.ar-header{inset:20px 18px auto}.ar-header :deep(.brand-lockup){gap:12px}.ar-header :deep(.turbo-logo){width:124px}.ar-header :deep(.forbes-logo){width:60px}.ar-sound{width:42px;height:42px}.ar-sound svg{width:23px}.ar-heading{top:19%;left:6%;width:88%;font-size:clamp(36px,10vw,72px)}.ar-scene{top:32%;height:47%}.has-started .ar-scene{top:22%;height:58%}.ar-caption{bottom:11%;width:94%;padding:16px 16px 25px;box-sizing:border-box}.ar-caption h1{font-size:25px}.ar-caption p{font-size:17px}.ar-label{margin-bottom:10px}.ar-start{bottom:13%}.ar-finish{top:38%;width:130px}.ar-skip{right:18px;bottom:22px;font-size:12px}.ar-progress{left:18px;bottom:50px}.ar-progress span{width:20px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important}}
@media(max-height:550px) and (min-width:768px){.ar-header{top:15px}.ar-heading{top:18%;font-size:11vh}.ar-start,.ar-finish{width:115px;padding:10px;font-size:13px}.ar-caption{bottom:9%;padding:10px 20px 20px}.ar-caption h1{font-size:24px}.ar-caption p{font-size:15px}.ar-label{font-size:13px;margin-bottom:5px}}
</style>
