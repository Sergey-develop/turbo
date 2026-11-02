<script setup lang="ts">
import { computed, ref } from 'vue'
const hoodPinned = ref(false)
const hovered = ref(false)
const hoodOpen = computed(() => hoodPinned.value || hovered.value)
</script>
<template>
  <section class="hero" :class="{ 'hood-open': hoodOpen }">
    <div class="hero-art" aria-hidden="true"></div>
    <div class="hero-art hero-art-open" aria-hidden="true"></div>
    <div class="hero-heading container">
      <div><h1>под капотом<br>турбо<span class="orange">_</span>рейв</h1><a class="button hero-cta" href="#registration">Регистрация</a></div>
      <div class="hero-details"><p>27 ноября 2026&nbsp; 18.30 – 00.00<br>Москва, пространство Суперметалл</p><p class="muted">Клиентский вечер Турбо Облака,<br class="wide-break"> объединяющий деловую программу,<br class="wide-break"> личное общение и электронную музыку.</p></div>
    </div>
    <div class="hero-magnifier" aria-hidden="true"></div>
    <button class="hood-control" :aria-pressed="hoodPinned" @mouseenter="hovered = true" @mouseleave="hovered = false" @click="hoodPinned = !hoodPinned"><svg class="scan-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M12 4H6a2 2 0 0 0-2 2v6m16-8h6a2 2 0 0 1 2 2v6M4 20v6a2 2 0 0 0 2 2h6m16-8v6a2 2 0 0 1-2 2h-6M8 16h16" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>{{ hoodOpen ? 'Под капотом Турбо' : 'Наведите курсор' }}<br>{{ hoodOpen ? 'Нажмите, чтобы закрыть' : 'и загляните под капот' }}</span></button>
    <a class="button mobile-hero-cta" href="#registration">Регистрация</a>
    <div id="about" class="about container"><h2>Обсудим итоги года через опыт реальных проектов: какие задачи решали клиенты, что сработало и какие подходы могут пригодиться вашему бизнесу.</h2><p>Вы сможете напрямую задать вопросы команде Турбо, обсудить свои ИТ-задачи и познакомиться с планами развития продуктов. А в разговоре с коллегами из других компаний сравнить опыт<br class="wide-break"> и найти идеи для собственных решений.</p></div>
    <div class="forbes container"><div class="forbes-inner"><img src="/assets/forbes.webp" alt="Forbes" width="300" height="108"><p class="muted">Партнёр деловой программы</p><h2>Клиентские кейсы и открытый<br class="wide-break"> диалог с модератором издания</h2></div></div>
  </section>
</template>
