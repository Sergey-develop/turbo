<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import ProgramSection from './components/ProgramSection.vue'
import SpeakersSection from './components/SpeakersSection.vue'
import RegistrationSection from './components/RegistrationSection.vue'
import LocationSection from './components/LocationSection.vue'
import FaqSection from './components/FaqSection.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>
<template>
  <SiteHeader />
  <main><HeroSection /><ProgramSection /><SpeakersSection /><RegistrationSection /><LocationSection /><FaqSection /></main>
  <SiteFooter />
</template>
