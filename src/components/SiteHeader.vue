<script setup lang="ts">
import { ref } from 'vue'
import { nav } from '../content'
const menuOpen = ref(false)
</script>
<template>
  <header class="header container">
    <a href="#" aria-label="Турбо Облако и Forbes — главная"><picture><source media="(max-width:767px)" srcset="/assets/brand-mobile.webp"><img class="brand" src="/assets/brand.webp" alt="Турбо Облако | Forbes" width="390" height="50"></picture></a>
    <nav class="desktop-nav" aria-label="Основная навигация"><a v-for="item in nav" :key="item.href" :href="item.href">{{ item.label }}</a></nav>
    <button class="menu-toggle" :aria-expanded="menuOpen" aria-controls="mobile-nav" aria-label="Меню" @click="menuOpen = !menuOpen"><span></span><span></span></button>
    <a class="button header-cta" href="#registration">Регистрация</a>
    <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" aria-label="Мобильная навигация"><a v-for="item in nav" :key="item.href" :href="item.href" @click="menuOpen = false">{{ item.label }}</a></nav>
  </header>
</template>
