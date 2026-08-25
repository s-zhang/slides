<!-- Section tracker: <SectionTracker :active="2" /> highlights the current topic.
     Placed on section intro slides only. -->
<script setup>
defineProps({ active: { type: Number, default: 0 } })
const sections = ['Evals', 'Cyber', 'Next Steps']
</script>

<template>
  <div class="section-tracker">
    <template v-for="(s, i) in sections" :key="i">
      <span class="st-item" :class="{ active: i + 1 === active }">{{ s }}</span>
      <span v-if="i < sections.length - 1" class="st-sep">/</span>
    </template>
  </div>
</template>

<style scoped>
.section-tracker {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.st-item { color: #94a3b8; transition: color 0.2s; }
.st-item.active { color: #ea580c; font-weight: 700; }
.st-sep { color: #cbd5e1; }
</style>
