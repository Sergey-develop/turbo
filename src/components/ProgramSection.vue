<script setup lang="ts">
import { program } from '../content'
</script>
<template>
  <section id="program" class="program container"><h2 class="section-title"><span class="program-desktop-title" v-cms="'programTitle'">программа мероприятия</span><span class="program-mobile-title">спикеры</span></h2><ol class="program-list"><li v-for="(item, i) in program" :key="item.time" :class="{ 'is-rave': i === 4 }"><span class="program-number">{{ String(i + 1).padStart(2, '0') }}</span><h3>{{ item.title }}</h3><time :datetime="`2026-11-27T${item.time}:00+03:00`"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="6" fill="currentColor"/><path d="M8 5v4l2 1M3 2 1 4M13 2l2 2" fill="none" stroke="var(--orange)" stroke-width="1.6"/></svg>{{ item.time }}</time></li></ol></section>
</template>
