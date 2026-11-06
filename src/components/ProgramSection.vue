<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { program } from '../content'
const list = ref<HTMLOListElement | null>(null)
const activeIndex = ref(-1)
let frame = 0
function updateActive(): void {
  frame = 0
  const rows = list.value?.children
  if (!rows?.length) return
  const activationLine = innerHeight * .5
  let lastReached = -1
  Array.from(rows).forEach((row, index) => {
    const rect = row.getBoundingClientRect()
    if (rect.top + rect.height / 2 <= activationLine) lastReached = index
  })
  activeIndex.value = lastReached
}
function onScroll(): void {
  if (!frame) frame = requestAnimationFrame(updateActive)
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  window.addEventListener('site:ready', onScroll)
  onScroll()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  window.removeEventListener('site:ready', onScroll)
})
</script>
<template>
  <section id="program" class="program container"><h2 class="section-title"><span class="program-desktop-title" v-cms="'programTitle'">программа мероприятия</span><span class="program-mobile-title">спикеры</span></h2><ol ref="list" class="program-list"><li v-for="(item, i) in program" :key="item.time" :class="{ 'is-last': i === program.length - 1, 'is-active': i <= activeIndex }"><span class="program-number">{{ String(i + 1).padStart(2, '0') }}</span><h3>{{ item.title }}</h3><time :datetime="`2026-11-27T${item.time}:00+03:00`"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="6" fill="currentColor"/><path d="M8 5v4l2 1M3 2 1 4M13 2l2 2" fill="none" stroke="var(--orange)" stroke-width="1.6"/></svg>{{ item.time }}</time></li></ol></section>
</template>

<style lang="scss">
.program-list li h3 { color:#606060; transition:color 240ms ease; }
.program-list li time { color:#777; background:#303030; transition:color 240ms ease,background-color 240ms ease; }
.program-list li time svg path { stroke:#303030; transition:stroke 240ms ease; }
.program-list li.is-active h3 { color:#f6f6f6; }
.program-list li.is-active.is-last h3 { color:var(--orange); }
.program-list li.is-active time { color:#fff; background:var(--orange); }
.program-list li.is-active time svg path { stroke:var(--orange); }
</style>
