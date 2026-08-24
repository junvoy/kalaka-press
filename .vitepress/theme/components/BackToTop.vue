<script setup lang="ts">
import { useRoute } from 'vitepress';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const route = useRoute();
const isVisible = ref(false);
let scrollFrame: number | undefined;

const updateVisibility = () => {
  scrollFrame = undefined;
  isVisible.value = window.scrollY > 480;
};

const scheduleVisibilityUpdate = () => {
  if (scrollFrame !== undefined) {
    return;
  }

  scrollFrame = window.requestAnimationFrame(updateVisibility);
};

const scrollToTop = () => {
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  window.scrollTo({
    behavior: reducedMotion ? 'auto' : 'smooth',
    top: 0,
  });
};

onMounted(() => {
  updateVisibility();
  window.addEventListener('scroll', scheduleVisibilityUpdate, { passive: true });
});

watch(
  () => route.path,
  () =>
    nextTick(() => {
      updateVisibility();
    })
);

onUnmounted(() => {
  window.removeEventListener('scroll', scheduleVisibilityUpdate);

  if (scrollFrame !== undefined) {
    window.cancelAnimationFrame(scrollFrame);
  }
});
</script>

<template>
  <Transition name="back-to-top">
    <button
      v-if="isVisible"
      aria-label="页眉"
      class="BackToTop"
      title="页眉"
      type="button"
      @click="scrollToTop"
    >
      <span aria-hidden="true" class="vpi-arrow-up" />
    </button>
  </Transition>
</template>

<style scoped>
.BackToTop {
  position: fixed;
  z-index: 30;
  right: max(24px, env(safe-area-inset-right));
  bottom: max(24px, env(safe-area-inset-bottom));
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-2);
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.BackToTop:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  box-shadow: var(--vp-shadow-3);
  transform: translateY(-2px);
}

.BackToTop:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 3px;
}

.BackToTop .vpi-arrow-up {
  width: 18px;
  height: 18px;
}

.back-to-top-enter-active,
.back-to-top-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.back-to-top-enter-from,
.back-to-top-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 640px) {
  .BackToTop {
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
  }
}

@media (min-width: 1280px) {
  .BackToTop {
    right: max(280px, calc((100vw - 1440px) / 2 + 280px));
  }
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top-enter-active,
  .back-to-top-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
