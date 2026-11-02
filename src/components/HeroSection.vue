<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
const baseArt = ref<HTMLDivElement | null>(null)
const revealArt = ref<HTMLDivElement | null>(null)
const hotspot = ref<HTMLButtonElement | null>(null)
const scanning = ref(false)
const hoodOutline: readonly (readonly [number, number])[] = [
  [1050, 570], [1480, 570], [1680, 630], [1760, 706], [1700, 764],
  [1606, 792], [1366, 758], [1120, 660], [960, 636],
]
let imageScale = 1
let imageLeft = 0
let resizeObserver: ResizeObserver | undefined

function positionScan(x: number, y: number): void {
  revealArt.value?.style.setProperty('--scan-x', `${x}px`)
  revealArt.value?.style.setProperty('--scan-y', `${y}px`)
}

function updateGeometry(): void {
  if (!baseArt.value || !revealArt.value || !hotspot.value) return
  const rect = baseArt.value.getBoundingClientRect()
  const style = getComputedStyle(baseArt.value)
  const size = style.backgroundSize.split(' ')
  const imageWidth = size[0] === 'auto' ? parseFloat(size[1] ?? '0') * 1920 / 2488 : rect.width
  imageScale = imageWidth / 1920
  imageLeft = (rect.width - imageWidth) * parseFloat(style.backgroundPositionX) / 100
  const outline = `polygon(${hoodOutline.map(([x, y]) => `${imageLeft + x * imageScale}px ${y * imageScale}px`).join(',')})`
  revealArt.value.style.clipPath = outline
  hotspot.value.style.clipPath = outline
  revealArt.value.style.setProperty('--scan-radius', `${Math.max(62, 170 * imageScale)}px`)
  scanning.value = false
}

function scanAtPointer(event: PointerEvent): void {
  if (!baseArt.value) return
  const rect = baseArt.value.getBoundingClientRect()
  positionScan(event.clientX - rect.left, event.clientY - rect.top)
  scanning.value = true
}

function leaveHood(event: PointerEvent): void {
  if (event.pointerType !== 'touch') scanning.value = false
}

function scanWithKeyboard(event: MouseEvent): void {
  if (event.detail !== 0) return
  positionScan(imageLeft + 1370 * imageScale, 680 * imageScale)
  scanning.value = !scanning.value
}

onMounted(() => {
  resizeObserver = new ResizeObserver(updateGeometry)
  if (baseArt.value) resizeObserver.observe(baseArt.value)
  updateGeometry()
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>
<template>
  <section class="hero">
    <div ref="baseArt" class="hero-art" aria-hidden="true"></div>
    <div ref="revealArt" class="hero-art hero-art-open" :class="{ 'is-scanning': scanning }" aria-hidden="true"></div>
    <button ref="hotspot" class="hero-art hood-hotspot" type="button" aria-label="Заглянуть под капот" :aria-pressed="scanning" @pointerenter="scanAtPointer" @pointermove="scanAtPointer" @pointerdown="scanAtPointer" @pointerleave="leaveHood" @pointercancel="scanning = false" @blur="scanning = false" @keydown.esc="scanning = false" @click="scanWithKeyboard"></button>
    <div class="hero-heading container">
      <div><h1>под капотом<br>турбо<span class="orange">_</span>рейв</h1><a class="button hero-cta" href="#registration">Регистрация</a></div>
      <div class="hero-details"><p>27 ноября 2026&nbsp; 18.30 – 00.00<br>Москва, пространство Суперметалл</p><p class="muted">Клиентский вечер Турбо Облака,<br class="wide-break"> объединяющий деловую программу,<br class="wide-break"> личное общение и электронную музыку.</p></div>
    </div>
    <div class="hood-control" aria-hidden="true"><svg class="scan-icon" viewBox="0 0 32 32"><path d="M12 4H6a2 2 0 0 0-2 2v6m16-8h6a2 2 0 0 1 2 2v6M4 20v6a2 2 0 0 0 2 2h6m16-8v6a2 2 0 0 1-2 2h-6M8 16h16" fill="none" stroke="currentColor" stroke-width="2"/></svg><span><span class="hood-mouse-hint">Водите курсором<br>по капоту</span><span class="hood-touch-hint">Коснитесь капота<br>и загляните внутрь</span></span></div>
    <a class="button mobile-hero-cta" href="#registration">Регистрация</a>
    <div id="about" class="about container"><h2>Обсудим итоги года через опыт реальных проектов: какие задачи решали клиенты, что сработало и какие подходы могут пригодиться вашему бизнесу.</h2><p>Вы сможете напрямую задать вопросы команде Турбо, обсудить свои ИТ-задачи и познакомиться с планами развития продуктов. А в разговоре с коллегами из других компаний сравнить опыт<br class="wide-break"> и найти идеи для собственных решений.</p></div>
    <div class="forbes container"><div class="forbes-inner"><img src="/assets/forbes.webp" alt="Forbes" width="300" height="108"><p class="muted">Партнёр деловой программы</p><h2>Клиентские кейсы и открытый<br class="wide-break"> диалог с модератором издания</h2></div></div>
  </section>
</template>
