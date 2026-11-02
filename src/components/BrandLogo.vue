<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>
<template>
  <span class="brand-lockup" :class="{ 'is-compact': compact }" aria-label="Турбо Облако и Forbes">
    <img class="turbo-logo" src="/assets/turbo-logo.png" alt="Турбо Облако" width="227" height="35">
    <span class="brand-divider" aria-hidden="true"></span>
    <img class="forbes-logo" src="/assets/forbes-logo.png" alt="Forbes" width="101" height="28">
  </span>
</template>

<style scoped lang="scss">
.brand-lockup { display: flex; align-items: center; gap: 23px; width: max-content; max-width: 100%; }
img { display: block; height: auto; }
.turbo-logo { width: 227px; }
.forbes-logo { width: 101px; }
.brand-divider { width: 1px; height: 20px; background: #b4b4b4; }
@media (min-width:768px) and (max-width:1599px) {
  .brand-lockup { gap: 20px; }
  .turbo-logo { width: 168px; }
  .forbes-logo { width: 75px; }
  .brand-divider { height: 15px; }
}
@media (max-width:767px) {
  .turbo-logo { width: 124px; }
  .is-compact .forbes-logo, .is-compact .brand-divider { display: none; }
  .brand-lockup:not(.is-compact) { gap: 20px; }
  .brand-lockup:not(.is-compact) .turbo-logo { width: 168px; }
  .brand-lockup:not(.is-compact) .forbes-logo { width: 75px; }
  .brand-lockup:not(.is-compact) .brand-divider { height: 15px; }
}
</style>
