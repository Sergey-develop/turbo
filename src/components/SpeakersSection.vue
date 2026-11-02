<script setup lang="ts">
import { ref, type CSSProperties } from 'vue'
import { speakers, type Speaker } from '../content'
const expandedSpeaker = ref<number | null>(null)
const groups: { title: string; items: Speaker[] }[] = [
  { title: 'Выступления в формате TED', items: speakers.slice(0, 4) },
  { title: 'Клиентская дискуссия с модератором Forbes', items: speakers.slice(4) },
]
function toggleSpeaker(id: number): void {
  expandedSpeaker.value = expandedSpeaker.value === id ? null : id
}
function columns(items: Speaker[]): CSSProperties {
  return { '--speaker-columns': items.map(({ id }) => id === expandedSpeaker.value ? '1.65fr' : '1fr').join(' ') }
}
</script>
<template>
  <section id="speakers" class="speakers">
    <div class="container">
      <h2 class="section-title">спикеры</h2>
      <div v-for="group in groups" :key="group.title" class="speaker-group">
        <p class="speaker-group-title">{{ group.title }}</p>
        <div class="speaker-grid" :style="columns(group.items)">
          <article v-for="speaker in group.items" :key="speaker.id" class="speaker-card" :class="{ 'is-expanded': expandedSpeaker === speaker.id }">
            <p class="speaker-role">{{ speaker.role }}</p>
            <img src="/assets/speaker.webp" :alt="speaker.name" loading="lazy" width="388" height="537">
            <div class="speaker-info">
              <h3 :id="`speaker-name-${speaker.id}`"><span class="desktop-name">{{ speaker.name }}</span><span class="tablet-name">Алексей Волков</span></h3>
              <div :id="`speaker-topic-${speaker.id}`" class="speaker-topic-reveal" :aria-hidden="expandedSpeaker !== speaker.id"><div class="speaker-topic-clip"><p class="speaker-topic">{{ speaker.topic }}</p></div></div>
            </div>
            <button class="speaker-toggle" type="button" :aria-labelledby="`speaker-name-${speaker.id}`" :aria-expanded="expandedSpeaker === speaker.id" :aria-controls="`speaker-topic-${speaker.id}`" @click="toggleSpeaker(speaker.id)" @keydown.esc="expandedSpeaker = null"></button>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
