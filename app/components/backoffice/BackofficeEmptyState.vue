<script setup lang="ts">
defineProps<{
  title: string
  message: string
}>()
</script>

<template lang="pug">
dd-center(intrinsic)
  dd-alert(info :title="title" :closable="false" icon)
    | {{ message }}
</template>
