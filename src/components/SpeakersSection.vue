<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue'
import {texts} from '../cms'
import { speakers, type Speaker } from '../content'
const selectedSpeaker = ref<number | null>(null)
const hoveredSpeaker = ref<number | null>(null)
const expandedSpeaker = computed(() => hoveredSpeaker.value ?? selectedSpeaker.value)
const groups: { title: string; items: Speaker[] }[] = [
  { title: texts.tedTitle, items: speakers.slice(0, 4) },
  { title: texts.discussionTitle, items: speakers.slice(4) },
]
function toggleSpeaker(id: number): void {
  selectedSpeaker.value = selectedSpeaker.value === id ? null : id
  hoveredSpeaker.value = null
}
function hoverSpeaker(event: PointerEvent, id: number): void {
  if (event.pointerType === 'mouse' && matchMedia('(hover: hover) and (pointer: fine)').matches) hoveredSpeaker.value = id
}
function clearSpeaker(): void {
  selectedSpeaker.value = null
  hoveredSpeaker.value = null
}
function columns(items: Speaker[]): CSSProperties {
  return { '--speaker-columns': items.map(({ id }) => id === expandedSpeaker.value ? '1.67fr' : '1fr').join(' ') }
}
</script>
<template>
  <section id="speakers" class="speakers">
    <div class="container">
      <h2 class="section-title" v-cms="'speakersTitle'">спикеры</h2>
      <div v-for="group in groups" :key="group.title" class="speaker-group">
        <p class="speaker-group-title">{{ group.title }}</p>
        <div class="speaker-grid" :style="columns(group.items)">
          <article v-for="speaker in group.items" :key="speaker.id" class="speaker-card" :class="{ 'is-expanded': expandedSpeaker === speaker.id }" @pointerenter="hoverSpeaker($event, speaker.id)" @pointerleave="hoveredSpeaker = null">
            <p class="speaker-role">{{ speaker.role }}</p>
            <img :src="speaker.image || '/assets/speaker.webp'" :alt="speaker.name" loading="lazy" width="388" height="537">
            <div class="speaker-info">
              <h3 :id="`speaker-name-${speaker.id}`"><span class="desktop-name">{{ speaker.name }}</span><span class="tablet-name">{{ speaker.name }}</span></h3>
              <div :id="`speaker-topic-${speaker.id}`" class="speaker-topic-reveal" :aria-hidden="expandedSpeaker !== speaker.id"><div class="speaker-topic-clip"><p class="speaker-topic">{{ speaker.topic }}</p></div></div>
            </div>
            <button class="speaker-toggle" type="button" :aria-labelledby="`speaker-name-${speaker.id}`" :aria-expanded="expandedSpeaker === speaker.id" :aria-controls="`speaker-topic-${speaker.id}`" @click="toggleSpeaker(speaker.id)" @keydown.esc="clearSpeaker"></button>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
