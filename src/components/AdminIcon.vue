<script setup lang="ts">
defineProps<{name:string}>()
const paths:Record<string,string>={
 overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 registrations:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 analytics:'M4 20h17M5 16v-4M10 16V8M15 16v-6M20 16V4M4 8l6-5 5 3 6-5',
 content:'M4 5h6l2 2h8a1 1 0 0 1 1 1v11H3V6a1 1 0 0 1 1-1Z',
 templates:'M3 5h18v14H3zM3 6l9 7 9-7',mail:'M3 5h18v14H3zM3 6l9 7 9-7',
 settings:'m9 3-1 3-3 1-2 4 2 2 1 4 3 1 3 3 3-1 3-1 2-4-2-2-1-4-3-1-3-3Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 audit:'M7 3h10v3h3v15H4V6h3zM8 10h8M8 14h8M8 18h5',roles:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7zM9 12l2 2 4-5',
 checkin:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 20v-2',
 retention:'M4 4h16v5H4zM6 9v12h12V9M10 13h4',arrow:'M19 12H5m6-6-6 6 6 6',refresh:'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6',
 user:'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
}
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name]||paths.overview"/></svg></template>
