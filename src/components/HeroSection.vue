<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
const baseArt = ref<HTMLDivElement | null>(null)
const revealArt = ref<HTMLDivElement | null>(null)
const hotspot = ref<HTMLButtonElement | null>(null)
const scanning = ref(false)
const hoodOutline: readonly (readonly [number, number])[] = [
  [1060, 588], [1475, 584], [1600, 618], [1675, 674], [1710, 721],
  [1695, 744], [1630, 768], [1530, 770], [1300, 724], [1100, 660],
]
let imageScale = 1
let imageLeft = 0
let resizeObserver: ResizeObserver | undefined

function positionScan(x: number, y: number): void {
  revealArt.value?.style.setProperty('--scan-x', `${x}px`)
  revealArt.value?.style.setProperty('--scan-y', `${y}px`)
}

let scanFrame = 0
let lastFrame = 0
let scanX = 0
let scanY = 0
let targetX = 0
let targetY = 0
function animateScan(time: number): void {
  const dt = Math.min(64, time - lastFrame)
  lastFrame = time
  const weight = 1 - Math.exp(-dt / 90)
  scanX += (targetX - scanX) * weight
  scanY += (targetY - scanY) * weight
  positionScan(scanX, scanY)
  if (Math.hypot(targetX - scanX, targetY - scanY) > .1) {
    scanFrame = requestAnimationFrame(animateScan)
  } else {
    positionScan(targetX, targetY)
    scanFrame = 0
  }
}
function followPointer(x: number, y: number): void {
  targetX = x
  targetY = y
  if (!scanning.value || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cancelAnimationFrame(scanFrame)
    scanFrame = 0
    scanX = x
    scanY = y
    positionScan(x, y)
  } else if (!scanFrame) {
    lastFrame = performance.now()
    scanFrame = requestAnimationFrame(animateScan)
  }
}

function updateGeometry(): void {
  if (!baseArt.value || !revealArt.value || !hotspot.value) return
  const rect = baseArt.value.getBoundingClientRect()
  const style = getComputedStyle(baseArt.value)
  const size = style.backgroundSize.split(' ')
  const imageWidth = size[0] === 'auto' ? parseFloat(size[1] ?? '0') * 1920 / 2488 : rect.width
  imageScale = imageWidth / 1920
  // Both source images use one coordinate system; the open source is taller.
  revealArt.value.style.backgroundSize = `${imageWidth}px ${2488 * imageScale}px`
  revealArt.value.style.backgroundPositionY = `${-10 * imageScale}px`
  imageLeft = (rect.width - imageWidth) * parseFloat(style.backgroundPositionX) / 100
  const outline = `polygon(${hoodOutline.map(([x, y]) => `${imageLeft + x * imageScale}px ${y * imageScale}px`).join(',')})`
  // Feather the hood boundary as well as the cursor spotlight.
  const points = hoodOutline.map(([x, y]) => `${imageLeft + x * imageScale},${y * imageScale}`).join(' ')
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}"><defs><filter id="soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="${Math.max(2, 10 * imageScale)}"/></filter></defs><polygon points="${points}" fill="white" filter="url(#soft)"/></svg>`
  revealArt.value.style.setProperty('--hood-mask', `url("data:image/svg+xml,${encodeURIComponent(mask)}")`)
  hotspot.value.style.clipPath = outline
  revealArt.value.style.setProperty('--scan-radius', `${Math.max(62, 170 * imageScale)}px`)
  scanning.value = false
}

function scanAtPointer(event: PointerEvent): void {
  if (!baseArt.value) return
  const rect = baseArt.value.getBoundingClientRect()
  followPointer(event.clientX - rect.left, event.clientY - rect.top)
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
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(scanFrame)
})
</script>
<template>
  <section class="hero">
    <div ref="baseArt" class="hero-art" aria-hidden="true"></div>
    <div ref="revealArt" class="hero-art hero-art-open" :class="{ 'is-scanning': scanning }" aria-hidden="true"></div>
    <button ref="hotspot" class="hero-art hood-hotspot" type="button" aria-label="Заглянуть под капот" :aria-pressed="scanning" @pointerenter="scanAtPointer" @pointermove="scanAtPointer" @pointerdown="scanAtPointer" @pointerleave="leaveHood" @pointercancel="scanning = false" @blur="scanning = false" @keydown.esc="scanning = false" @click="scanWithKeyboard"></button>
    <div class="hero-heading container">
      <div><h1>под капотом<br>турбо<span class="orange">_</span>рейв</h1><a class="button hero-cta" href="#registration">Регистрация</a></div>
      <div class="hero-details"><p><span class="hero-date">27 ноября 2026</span>&nbsp; <span class="hero-time">18.30 – 00.00</span><br><span class="hero-location">Москва, пространство Суперметалл</span></p><p class="muted">Клиентский вечер Турбо Облака,<br class="wide-break"> объединяющий деловую программу,<br class="wide-break"> личное общение и электронную музыку.</p></div>
    </div>
    <div class="hood-control" aria-hidden="true"><svg class="scan-icon" viewBox="0 0 32 32"><path d="M12 3H6a3 3 0 0 0-3 3v6m17-9h6a3 3 0 0 1 3 3v6M3 20v6a3 3 0 0 0 3 3h6m17-9v6a3 3 0 0 1-3 3h-6" fill="none" stroke="currentColor" stroke-width="2"/></svg><span><span class="hood-mouse-hint">Наведите курсор<br>и загляните под капот</span><span class="hood-touch-hint">Коснитесь капота<br>и загляните внутрь</span></span></div>
    <a class="button mobile-hero-cta" href="#registration">Регистрация</a>
    <div id="about" class="about container"><h2>Обсудим итоги года через опыт реальных проектов: какие задачи решали клиенты, что сработало и какие подходы могут пригодиться вашему бизнесу.</h2><p>Вы сможете напрямую задать вопросы команде Турбо, обсудить свои ИТ-задачи и познакомиться с планами развития продуктов. А в разговоре с коллегами из других компаний сравнить опыт<br class="wide-break"> и найти идеи для собственных решений.</p></div>
    <div class="forbes container"><div class="forbes-inner"><img src="/assets/forbes-logo.svg" alt="Forbes" width="200" height="54"><p class="muted">Партнёр деловой программы</p><h2>Клиентские кейсы и открытый<br class="wide-break"> диалог с модератором издания</h2></div></div>
  </section>
</template>
