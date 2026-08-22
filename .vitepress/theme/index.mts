import DefaultTheme from 'vitepress/theme';
import { nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vitepress';
import mediumZoom, { type Zoom } from 'medium-zoom';

import './index.css';

const DIAGRAM_SELECTOR = '.vp-doc img[src$=".svg"]';

export default {
  ...DefaultTheme,

  setup() {
    const route = useRoute();
    let zoom: Zoom | undefined;

    const refreshDiagramZoom = () => {
      zoom ??= mediumZoom({
        background: 'var(--vp-c-bg)',
        margin: 24,
        scrollOffset: 40,
      });

      zoom.detach();
      zoom.attach(DIAGRAM_SELECTOR);
    };

    onMounted(refreshDiagramZoom);

    watch(
      () => route.path,
      () => nextTick(refreshDiagramZoom)
    );

    onUnmounted(() => {
      zoom?.detach();
      zoom = undefined;
    });
  },
};
