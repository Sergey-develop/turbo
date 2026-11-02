<script setup lang="ts">
import { speakers, type Speaker } from '../content'
const groups: { title: string; items: Speaker[] }[] = [
  { title: 'Выступления в формате TED', items: speakers.slice(0, 4) },
  { title: 'Клиентская дискуссия с модератором Forbes', items: speakers.slice(4) },
]
</script>
<template>
  <section id="speakers" class="speakers"><div class="container"><h2 class="section-title">спикеры</h2><div v-for="group in groups" :key="group.title" class="speaker-group"><p class="speaker-group-title">{{ group.title }}</p><div class="speaker-grid"><article v-for="speaker in group.items" :key="speaker.id" class="speaker-card" :class="{ 'with-topic': speaker.topic }"><p class="speaker-role">{{ speaker.role }}</p><img src="/assets/speaker.webp" :alt="speaker.name" loading="lazy" width="388" height="537"><div class="speaker-info"><h3><span class="desktop-name">{{ speaker.name }}</span><span class="tablet-name">Алексей Волков</span></h3><p v-if="!speaker.topic" class="mobile-topic">Тема доклада спикера Тема доклада спикера Тема доклада спикера Тема доклада спикера</p><p v-if="speaker.topic">{{ speaker.topic }}</p></div></article></div></div></div></section>
</template>
