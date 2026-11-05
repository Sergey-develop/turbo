<script setup lang="ts">
import { computed, type Component } from 'vue'
import { LayoutDashboard, Users, ChartNoAxesCombined, Folder, Mail, Send, Settings, ClipboardList, ShieldCheck, Archive, ArrowLeft, RefreshCw, UserRound } from '@lucide/vue'
const props=defineProps<{name:string}>()
const icons:Record<string,Component>={overview:LayoutDashboard,registrations:Users,invitees:UserRound,analytics:ChartNoAxesCombined,content:Folder,templates:Mail,mail:Send,settings:Settings,audit:ClipboardList,roles:ShieldCheck,retention:Archive,arrow:ArrowLeft,refresh:RefreshCw,user:UserRound}
const icon=computed(()=>icons[props.name]||LayoutDashboard)
</script>
<template><component :is="icon" :size="20" :stroke-width="1.75" aria-hidden="true" focusable="false"/></template>
