import DefaultTheme from 'vitepress/theme';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';
import mediumZoom from 'medium-zoom';

import './index.css';

export default {
  ...DefaultTheme,

  setup() {
    const route = useRoute();
    const initZoom = () => {
      // https://github.com/vuejs/vitepress/issues/854
      // 局部
      // mediumZoom('[data-zoomable]', { background: 'var(--vp-c-bg)' });
      // 全局
      mediumZoom('.main img', { background: 'var(--vp-c-bg)' });
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );
  },
};