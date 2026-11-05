<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const section = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const base = `${import.meta.env.BASE_URL}assets/liquid/`
const totalFrames = 573
const framesPerSheet = 8
const sheets = new Map<number, HTMLImageElement>()
const loading = new Set<number>()
let viewportObserver: IntersectionObserver | undefined
let motionPreference: MediaQueryList | undefined
let raf = 0
let currentFrame = 0
let displayFrame = 0
let previousTime = 0
let lastDrawTime = 0
let active = false
let disposed = false

function loadSheet(index: number) {
  if (index < 0 || index >= Math.ceil(totalFrames / framesPerSheet) || sheets.has(index) || loading.has(index)) return
  loading.add(index)
  const image = new Image()
  image.decoding = 'async'
  image.onload = () => {
    loading.delete(index)
    if (disposed) return
    sheets.set(index, image)
    // Keep only the current sheet and its neighbours in decoded memory.
    const currentSheet = Math.floor(currentFrame / framesPerSheet)
    for (const key of sheets.keys()) if (Math.abs(key - currentSheet) > 1) sheets.delete(key)
    if (index === currentSheet) drawFrame()
  }
  image.onerror = () => { loading.delete(index) }
  image.src = `${base}${String(index).padStart(2, '0')}.webp`
}

function drawFrame() {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context) return
  const sheetIndex = Math.floor(currentFrame / framesPerSheet)
  const image = sheets.get(sheetIndex)
  if (!image) { loadSheet(sheetIndex); return }
  const frameIndex = currentFrame % framesPerSheet
  context.clearRect(0, 0, element.width, element.height)
  context.drawImage(image, (frameIndex % 4) * 960, Math.floor(frameIndex / 4) * 540, 960, 540, 0, 0, 960, 540)
  ready.value = true
  loadSheet(sheetIndex - 1)
  loadSheet(sheetIndex + 1)
  for (const key of sheets.keys()) if (Math.abs(key - sheetIndex) > 1) sheets.delete(key)
}

function update(time: number) {
  raf = 0
  if (!active || motionPreference?.matches || !section.value) return
  const rect = section.value.getBoundingClientRect()
  const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)))
  const targetFrame = progress * (totalFrames - 1)
  const elapsed = previousTime ? Math.min(50, time - previousTime) : 16
  previousTime = time
  displayFrame += (targetFrame - displayFrame) * (1 - Math.exp(-elapsed / 90))
  if (Math.abs(targetFrame - displayFrame) < .15) displayFrame = targetFrame
  const nextFrame = Math.round(displayFrame)
  if ((nextFrame !== currentFrame || !ready.value) && (time - lastDrawTime >= 1000 / 24 || displayFrame === targetFrame)) {
    currentFrame = nextFrame
    lastDrawTime = time
    drawFrame()
  }
  if (displayFrame !== targetFrame || nextFrame !== currentFrame) raf = requestAnimationFrame(update)
  else previousTime = 0
}
function onScroll() { if (active && !raf) raf = requestAnimationFrame(update) }
function onMotionChange() {
  if (motionPreference?.matches) { ready.value = false; sheets.clear(); return }
  onScroll()
}

onMounted(() => {
  motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', onMotionChange)
  viewportObserver = new IntersectionObserver(entries => {
    active = entries.some(entry => entry.isIntersecting)
    if (active && !motionPreference?.matches) onScroll()
  }, { rootMargin: '100% 0px' })
  if (section.value) viewportObserver.observe(section.value)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  disposed = true
  viewportObserver?.disconnect()
  motionPreference?.removeEventListener('change', onMotionChange)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  if (raf) cancelAnimationFrame(raf)
  sheets.clear()
})
</script>

<template>
  <section ref="section" class="liquid-metal" aria-label="Мощность принимает форму">
    <div class="liquid-metal__stage">
    <h2 class="liquid-metal__title" aria-hidden="true">
      <span>МОЩНОСТЬ</span><span>ПРИНИМАЕТ</span><span>ФОРМУ</span>
    </h2>
    <div class="liquid-metal__title liquid-metal__title--color" aria-hidden="true">
      <span>МОЩНОСТЬ</span><span>ПРИНИМАЕТ</span><span>ФОРМУ</span>
    </div>
    <div class="liquid-metal__visual" aria-hidden="true">
      <img :src="`${base}poster.webp`" alt="" loading="lazy" decoding="async" :class="{ 'is-hidden': ready }">
      <canvas ref="canvas" width="960" height="540" :class="{ 'is-ready': ready }" />
    </div>
    </div>
  </section>
</template>
