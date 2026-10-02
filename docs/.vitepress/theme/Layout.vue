<script setup>
import DefaultTheme from 'vitepress/theme'
import HomeVisual from './components/HomeVisual.vue'
import JoinCta from './components/JoinCta.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-hero-after>
      <HomeVisual />
    </template>
    <template #home-features-after>
      <JoinCta />
    </template>
  </Layout>
</template>
