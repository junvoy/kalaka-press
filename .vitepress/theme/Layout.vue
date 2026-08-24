<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';

import BackToTop from './components/BackToTop.vue';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #layout-bottom>
      <BackToTop />
    </template>
  </Layout>
</template>
