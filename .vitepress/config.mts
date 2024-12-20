import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "kalaka-press",
  description: "press",
  // 源路径·
  srcDir: './',
  // base URL
  base: '/kalaka-press',
  // 显示最后更新时间
  lastUpdated: true,
  markdown: {
    image: {
      // 默认禁用；设置为 true 可为所有图片启用懒加载。
      lazyLoading: true
    }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏
    nav: [
      { text: '首页', link: '/src' },
      { text: '葵花宝典', link: '/src/interview/introduction' }
    ],

    // 侧边栏
    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/src/markdown-examples' },
          { text: 'Runtime API Examples', link: '/src/api-examples' },
          { 
            text: '葵花宝典', 
            link: '/src/interview/introduction', 
            items: [
              { 
                text: 'Redis',
                link: '/src/interview/redis/question'
              }
            ]
          }
        ]
      }
    ],

    // 搜索
    search: {
      provider: 'local'
    },


    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    // 页脚
    footer: {
      message: 'Released under the <a href="https://github.com/junvoy/kalaka-press/blob/main/LICENSE">MIT License.</a>',
      copyright: 'Copyright © 2024-present <a href="https://github.com/junvoy">Yao</a>'
    },

    editLink: {
      pattern: 'https://github.com/junvoy/kalaka-press/edit/main/:path',
      text: '在 GitHub 上编辑此页面'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/junvoy' }
    ]
  }
})
