import DefaultTheme from 'vitepress/theme';
import { nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vitepress';
import type PhotoSwipe from 'photoswipe';
import type { SlideData } from 'photoswipe';
import 'photoswipe/style.css';

import Layout from './Layout.vue';
import './index.css';

const CONTENT_SELECTOR = '.vp-doc';
const IMAGE_SELECTOR = 'img:not([data-no-preview])';

type ImageSlideData = SlideData & {
  element: HTMLImageElement;
};

const getFallbackDimensions = (image: HTMLImageElement) => {
  const bounds = image.getBoundingClientRect();

  return {
    height: Math.max(Math.round(image.height || bounds.height), 1),
    width: Math.max(Math.round(image.width || bounds.width), 1),
  };
};

const getImageDimensions = (
  image: HTMLImageElement,
  source: string
): Promise<{ height: number; width: number }> => {
  if (image.naturalHeight > 0 && image.naturalWidth > 0) {
    return Promise.resolve({
      height: image.naturalHeight,
      width: image.naturalWidth,
    });
  }

  return new Promise((resolve) => {
    const probe = new Image();
    let settled = false;

    const finish = (dimensions: { height: number; width: number }) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      resolve(dimensions);
    };

    const timeoutId = window.setTimeout(
      () => finish(getFallbackDimensions(image)),
      5000
    );

    probe.onload = () => {
      finish({
        height: probe.naturalHeight,
        width: probe.naturalWidth,
      });
    };
    probe.onerror = () => finish(getFallbackDimensions(image));
    probe.src = source;
  });
};

const createSlideData = async (
  image: HTMLImageElement
): Promise<ImageSlideData> => {
  const source = image.currentSrc || image.src;
  const dimensions = await getImageDimensions(image, source);

  return {
    alt: image.alt,
    element: image,
    height: dimensions.height,
    msrc: source,
    src: source,
    srcset: image.srcset || undefined,
    width: dimensions.width,
  };
};

export default {
  ...DefaultTheme,
  Layout,

  setup() {
    const route = useRoute();
    let activePhotoSwipe: PhotoSwipe | undefined;
    let contentElement: HTMLElement | undefined;
    let outlineClassObserver: MutationObserver | undefined;
    let outlineScrollFrame: number | undefined;
    let openRequestId = 0;

    const syncActiveOutlineLink = () => {
      outlineScrollFrame = undefined;

      const activeLink = document.querySelector<HTMLAnchorElement>(
        '.VPDocAsideOutline .outline-link.active'
      );
      const asideContainer = activeLink?.closest<HTMLElement>('.aside-container');

      if (!activeLink || !asideContainer) {
        return;
      }

      const linkBounds = activeLink.getBoundingClientRect();
      const containerBounds = asideContainer.getBoundingClientRect();
      const visibleTop = containerBounds.top + 16;
      const visibleBottom = containerBounds.bottom - 48;

      if (linkBounds.top >= visibleTop && linkBounds.bottom <= visibleBottom) {
        return;
      }

      asideContainer.scrollBy({
        behavior: 'auto',
        top: linkBounds.top - containerBounds.top - asideContainer.clientHeight / 2
      });
    };

    const scheduleOutlineSync = () => {
      if (outlineScrollFrame !== undefined) {
        return;
      }

      outlineScrollFrame = window.requestAnimationFrame(syncActiveOutlineLink);
    };

    const destroyOutlineSync = () => {
      outlineClassObserver?.disconnect();
      outlineClassObserver = undefined;

      if (outlineScrollFrame !== undefined) {
        window.cancelAnimationFrame(outlineScrollFrame);
        outlineScrollFrame = undefined;
      }
    };

    const refreshOutlineSync = () => {
      destroyOutlineSync();

      const outline = document.querySelector<HTMLElement>('.VPDocAsideOutline');

      if (!outline) {
        return;
      }

      outlineClassObserver = new MutationObserver((records) => {
        if (
          records.some(
            (record) =>
              record.target instanceof HTMLAnchorElement &&
              record.target.classList.contains('outline-link')
          )
        ) {
          scheduleOutlineSync();
        }
      });
      outlineClassObserver.observe(outline, {
        attributeFilter: ['class'],
        attributes: true,
        subtree: true
      });

      scheduleOutlineSync();
    };

    const destroyImageViewer = () => {
      openRequestId += 1;
      contentElement?.removeEventListener('click', handleImageClick);
      contentElement = undefined;
      activePhotoSwipe?.destroy();
      activePhotoSwipe = undefined;
    };

    const openImage = async (
      clickedImage: HTMLImageElement,
      requestId: number
    ) => {
      if (!contentElement) {
        return;
      }

      const images = Array.from(
        contentElement.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)
      );
      const index = images.indexOf(clickedImage);

      if (index < 0) {
        return;
      }

      const [slides, { default: PhotoSwipeClass }] = await Promise.all([
        Promise.all(images.map(createSlideData)),
        import('photoswipe'),
      ]);

      if (requestId !== openRequestId || !clickedImage.isConnected) {
        return;
      }

      activePhotoSwipe?.destroy();

      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      const photoSwipe = new PhotoSwipeClass({
        arrowNextTitle: '下一张图片',
        arrowPrevTitle: '上一张图片',
        bgClickAction: 'close',
        bgOpacity: 1,
        clickToCloseNonZoomable: false,
        closeOnVerticalDrag: true,
        closeTitle: '关闭图片',
        dataSource: slides,
        doubleTapAction: 'zoom',
        errorMsg: '图片加载失败',
        imageClickAction: 'zoom',
        index,
        indexIndicatorSep: ' / ',
        initialZoomLevel: 'fit',
        loop: false,
        maxZoomLevel: 5,
        paddingFn: (viewportSize) => {
          const isMobile = viewportSize.x <= 640;

          return {
            bottom: isMobile ? 76 : 88,
            left: isMobile ? 8 : 72,
            right: isMobile ? 8 : 72,
            top: isMobile ? 56 : 72,
          };
        },
        pinchToClose: true,
        secondaryZoomLevel: 2.5,
        showHideAnimationType: reducedMotion ? 'none' : 'zoom',
        tapAction: 'toggle-controls',
        wheelToZoom: true,
        zoomTitle: '缩放图片',
      });

      photoSwipe.on('uiRegister', () => {
        photoSwipe.ui?.registerElement({
          ariaLabel: '切换全屏',
          appendTo: 'bar',
          className: 'pswp__button--fullscreen',
          html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>',
          isButton: true,
          name: 'fullscreen',
          onClick: async () => {
            const viewer = photoSwipe.element;

            if (!viewer) {
              return;
            }

            if (document.fullscreenElement === viewer) {
              await document.exitFullscreen();
              return;
            }

            await viewer.requestFullscreen();
          },
          onInit: (element) => {
            const syncFullscreenState = () => {
              element.setAttribute(
                'aria-pressed',
                String(document.fullscreenElement === photoSwipe.element)
              );
            };

            document.addEventListener('fullscreenchange', syncFullscreenState);
            photoSwipe.on('destroy', () =>
              document.removeEventListener('fullscreenchange', syncFullscreenState)
            );
            syncFullscreenState();
          },
          order: 8,
          title: '切换全屏',
        });
        photoSwipe.ui?.registerElement({
          appendTo: 'bar',
          ariaLabel: '下载图片',
          className: 'pswp__button--download',
          html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 16v4h14v-4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>',
          isButton: true,
          name: 'download',
          onInit: (downloadElement) => {
            const updateDownload = () => {
              const source = photoSwipe.currSlide?.data.src;

              if (downloadElement instanceof HTMLAnchorElement && source) {
                downloadElement.href = source;
                downloadElement.download = new URL(source, window.location.href)
                  .pathname.split('/')
                  .pop() ?? 'image';
              }
            };

            photoSwipe.on('change', updateDownload);
            updateDownload();
          },
          order: 9,
          tagName: 'a',
          title: '下载图片',
        });
        photoSwipe.ui?.registerElement({
          appendTo: 'root',
          className: 'pswp__caption',
          name: 'caption',
          onInit: (captionElement) => {
            const updateCaption = () => {
              const alt = photoSwipe.currSlide?.data.alt?.trim() ?? '';
              captionElement.textContent = alt;
              captionElement.hidden = alt.length === 0;
            };

            photoSwipe.on('change', updateCaption);
            updateCaption();
          },
          order: 9,
        });
      });

      photoSwipe.on('destroy', () => {
        if (activePhotoSwipe === photoSwipe) {
          activePhotoSwipe = undefined;
        }

        if (document.fullscreenElement === photoSwipe.element) {
          void document.exitFullscreen();
        }
      });

      activePhotoSwipe = photoSwipe;
      photoSwipe.init();
    };

    function handleImageClick(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof HTMLImageElement) || !target.matches(IMAGE_SELECTOR)) {
        return;
      }

      event.preventDefault();
      openRequestId += 1;
      void openImage(target, openRequestId);
    }

    const refreshImageViewer = () => {
      destroyImageViewer();
      contentElement =
        document.querySelector<HTMLElement>(CONTENT_SELECTOR) ?? undefined;

      if (!contentElement?.querySelector(IMAGE_SELECTOR)) {
        contentElement = undefined;
        return;
      }

      contentElement.addEventListener('click', handleImageClick);
    };

    onMounted(() => {
      refreshImageViewer();
      refreshOutlineSync();
      window.addEventListener('resize', scheduleOutlineSync);
    });

    watch(
      () => route.path,
      () =>
        nextTick(() => {
          refreshImageViewer();
          refreshOutlineSync();
        })
    );

    onUnmounted(() => {
      window.removeEventListener('resize', scheduleOutlineSync);
      destroyOutlineSync();
      destroyImageViewer();
    });
  },
};
