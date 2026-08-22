import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "kalaka-press",
  description: "press",
  // 源路径·
  srcDir: '.',
  // base URL
  base: '/kalaka-press/',
  // 显示最后更新时间
  lastUpdated: true,
  // 删除 .html 后缀
  cleanUrls: true,
  markdown: {
    image: {
      // 默认禁用；设置为 true 可为所有图片启用懒加载。
      lazyLoading: true
    }
  },
  // 路由重写
  rewrites: {
    'src/index.md': 'index.md',
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '葵花宝典', link: '/src/interview/introduction' },
      { text: '求职指南', link: '/src/career/' },
      { text: 'kalaka-admin', link: 'https://redhill.red' }
    ],

    // 侧边栏
    sidebar: {
      '/src/interview/': [
        {
          text: 'Java',
          collapsed: false,
          items: [
            {
              text: '学习目录',
              link: '/src/interview/java/question',
            },
            { text: '1. Java 基础', link: '/src/interview/java/basic' },
            { text: '2. Java 集合', link: '/src/interview/java/collections' },
            { text: '3. 并发', link: '/src/interview/java/concurrency' },
            { text: '4. 多线程', link: '/src/interview/java/multithreading' },
            { text: '5. JVM', link: '/src/interview/java/jvm' }
          ]
        },
        {
          text: '数据库',
          collapsed: true,
          items: [
            {
              text: 'MySQL',
              link: '/src/interview/mysql/question',
            },
            {
              text: 'Redis',
              link: '/src/interview/redis/question',
            }
          ]
        }
      ],
      '/src/career/': [
        {
          text: '求职指南',
          items: [
            { text: '开始', link: '/src/career/' },
            { text: '1. 编写简历', link: '/src/career/resume-writing' },
            { text: '2. 简历样式', link: '/src/career/resume-style' },
            { text: '3. 简历投递', link: '/src/career/resume-delivery' },
            { text: '4. 面试指南', link: '/src/career/interview-guide' },
            { text: '5. 面试复盘', link: '/src/career/interview-review' }
          ]
        }
      ]
    },

    outline: {
      label: "页面导航"
    },

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
