import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "kalaka-press",
  description: "press",
  // 源路径·
  srcDir: './src',
  // base URL
  base: '/kalaka-press/',
  // 显示最后更新时间
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '葵花宝典', link: '/interview/introduction' }
    ],

    // 侧边栏
    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
          { 
            text: '葵花宝典', 
            link: '/interview/introduction', 
            items: [
              { 
                text: 'Redis',
                link: ''
              }
            ]
          }
        ]
      }
    ],

    // 页脚
    footer: {
      message: 'Released under the <a href="https://github.com/junvoy/kalaka-press/blob/main/LICENSE">MIT License.</a>',
      copyright: 'Copyright © 2024-present <a href="https://github.com/junvoy">Yao</a>'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/junvoy' }
    ]
  }
})
