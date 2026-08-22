import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "云程阁",
  description: "Java、AI 面试与求职成长知识库",
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
      { text: '天机秘卷', link: '/src/interview/ai/' },
      { text: '青云策', link: '/src/career/' },
      { text: 'kalaka-admin', link: 'https://redhill.red' }
    ],

    // 侧边栏
    sidebar: {
      '/src/interview/': [
        {
          text: '学习总览',
          collapsed: false,
          items: [
            { text: '后端技术地图与学习路径', link: '/src/interview/question' },
            { text: '面试题内容编写规范', link: '/src/interview/content-guide' }
          ]
        },
        {
          text: 'Java 核心',
          collapsed: true,
          items: [
            { text: '学习目录', link: '/src/interview/java/question' },
            { text: '1. Java 基础', link: '/src/interview/java/basic' },
            { text: '2. Java 集合', link: '/src/interview/java/collections' },
            { text: '3. 并发', link: '/src/interview/java/concurrency' },
            { text: '4. 多线程', link: '/src/interview/java/multithreading' },
            { text: '5. JVM', link: '/src/interview/java/jvm' },
            { text: '6. Java 8+', link: '/src/interview/java/modern-java' }
          ]
        },
        {
          text: '计算机与应用基础',
          collapsed: true,
          items: [
            { text: '网络与 I/O', link: '/src/interview/web/io-network' }
          ]
        },
        {
          text: '应用框架与数据访问',
          collapsed: true,
          items: [
            { text: 'Spring 与 Spring Boot', link: '/src/interview/spring/question' },
            { text: 'MyBatis', link: '/src/interview/persistence/mybatis' }
          ]
        },
        {
          text: '数据存储与缓存',
          collapsed: true,
          items: [
            { text: 'MySQL', link: '/src/interview/mysql/question' },
            { text: 'Redis', link: '/src/interview/redis/question' }
          ]
        },
        {
          text: '消息与系统集成',
          collapsed: true,
          items: [
            { text: '消息队列', link: '/src/interview/middleware/mq' },
            { text: '配置、调度与数据集成', link: '/src/interview/integration/question' }
          ]
        },
        {
          text: '分布式与微服务',
          collapsed: true,
          items: [
            { text: '分布式系统设计', link: '/src/interview/distributed/question' },
            { text: '微服务治理', link: '/src/interview/microservices/question' }
          ]
        },
        {
          text: '工程化与交付',
          collapsed: true,
          items: [
            { text: '设计模式与工程实践', link: '/src/interview/engineering/question' },
            { text: '可观测性与交付', link: '/src/interview/operations/question' }
          ]
        },
        {
          text: '业务领域与协作',
          collapsed: true,
          items: [
            { text: '车联网与实时通信', link: '/src/interview/iot/question' },
            { text: 'Vue 3 与运营平台协作', link: '/src/interview/frontend/question' }
          ]
        }
      ],
      '/src/interview/ai/': [
        {
          text: '天机秘卷',
          collapsed: false,
          items: [
            { text: '专栏导览', link: '/src/interview/ai/' },
            { text: 'AI 基础概念', link: '/src/interview/ai/fundamentals/question' },
            { text: 'AI Agent 工程化', link: '/src/interview/ai/agent/question' },
            { text: 'OpenAI SDK 与 Responses API', link: '/src/interview/ai/sdk/question' },
            { text: 'LangChain 与 LangGraph 编排', link: '/src/interview/ai/langchain/question' },
            { text: '三个落地案例', link: '/src/interview/ai/cases/question' }
          ]
        }
      ],
      '/src/career/': [
        {
          text: '青云策',
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
      copyright: 'Copyright © 2024-present 云程阁 · <a href="https://github.com/junvoy">Yao</a>'
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
