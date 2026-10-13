<script setup lang="ts">
import { withBase } from 'vitepress'

const paths = [
  {
    title: '打牢 Java 与后端基础',
    description: '先理解数据和对象，再处理共享状态与运行时资源。',
    steps: [
      { text: 'Java 基础', link: '/src/interview/java/basic' },
      { text: '集合', link: '/src/interview/java/collections' },
      { text: '并发', link: '/src/interview/java/concurrency' },
      { text: 'JVM', link: '/src/interview/java/jvm' }
    ]
  },
  {
    title: '开始 AI 应用开发',
    description: '理解模型的能力边界，把工具、状态与执行过程连接起来。',
    steps: [
      { text: '基础概念', link: '/src/interview/ai/fundamentals/question' },
      { text: 'API 与工具', link: '/src/interview/ai/sdk/question' },
      { text: '流程编排', link: '/src/interview/ai/langchain/question' },
      { text: 'Agent 工程', link: '/src/interview/ai/agent/question' }
    ]
  },
  {
    title: '准备下一场面试',
    description: '从真实经历提炼亮点，把技术理解讲成有证据的项目表达。',
    steps: [
      { text: '梳理简历', link: '/src/career/resume-writing' },
      { text: '面试准备', link: '/src/career/interview-guide' },
      { text: '复盘改进', link: '/src/career/interview-review' }
    ]
  }
]

const topics = [
  { title: 'Spring', detail: '依赖、请求与事务', link: '/src/interview/spring/question' },
  { title: 'MySQL', detail: '索引、锁与日志', link: '/src/interview/mysql/question' },
  { title: 'Redis', detail: '缓存与一致性', link: '/src/interview/redis/question' },
  { title: '消息队列', detail: '可靠投递与幂等', link: '/src/interview/middleware/mq' },
  { title: '网络协议', detail: '从连接到请求', link: '/src/interview/web/network-protocol' },
  { title: '分布式系统', detail: '协作与故障恢复', link: '/src/interview/distributed/question' }
]
</script>

<template>
  <section class="home-overview" aria-labelledby="home-learning-title">
    <div class="home-overview__container">
      <header class="home-overview__heading">
        <h2 id="home-learning-title">从当前目标开始</h2>
        <p>第一次来，可以顺着路线学习；遇到具体问题，也可以直接进入专题。</p>
      </header>

      <div class="home-overview__body">
        <div class="learning-paths">
          <section v-for="(path, index) in paths" :key="path.title" class="learning-path">
            <span class="learning-path__number" aria-hidden="true">0{{ index + 1 }}</span>
            <div class="learning-path__content">
              <h3>{{ path.title }}</h3>
              <p>{{ path.description }}</p>
              <nav :aria-label="path.title">
                <ol class="learning-path__steps">
                  <li v-for="step in path.steps" :key="step.link">
                    <a :href="withBase(step.link)">{{ step.text }}</a>
                  </li>
                </ol>
              </nav>
            </div>
          </section>
        </div>

        <nav class="topic-links" aria-labelledby="home-topics-title">
          <div class="topic-links__heading">
            <h3 id="home-topics-title">常用专题</h3>
            <a :href="withBase('/src/interview/technology-index')">全部专题 <span aria-hidden="true">→</span></a>
          </div>
          <ul>
            <li v-for="topic in topics" :key="topic.link">
              <a class="topic-link" :href="withBase(topic.link)">
                <span>
                  <strong>{{ topic.title }}</strong>
                  <span class="topic-link__detail">{{ topic.detail }}</span>
                </span>
                <span class="topic-link__arrow" aria-hidden="true">→</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-overview {
  padding: 56px 24px 0;
}

.home-overview__container {
  max-width: 1152px;
  margin: 0 auto;
}

.home-overview__heading h2 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.5px;
  line-height: 1.5;
}

.home-overview__heading p {
  margin: 8px 0 0;
  color: var(--vp-c-text-2);
  font-size: 15px;
  line-height: 1.8;
}

.home-overview__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  margin-top: 24px;
}

.learning-path {
  display: flex;
  gap: 18px;
  padding: 24px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.learning-path:last-child {
  padding-bottom: 0;
}

.learning-path__number {
  padding-top: 2px;
  color: var(--vp-c-brand-1);
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 26px;
}

.learning-path__content {
  min-width: 0;
}

.learning-path h3,
.topic-links h3 {
  margin: 0;
  color: var(--vp-c-text-1);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.8;
}

.learning-path p {
  margin: 5px 0 10px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.8;
}

.learning-path__steps {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.learning-path__steps li {
  display: inline-flex;
  align-items: center;
}

.learning-path__steps li:not(:last-child)::after {
  content: '›';
  margin: 0 10px;
  color: var(--vp-c-text-3);
}

.learning-path__steps a,
.topic-links__heading a {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  color: var(--vp-c-brand-1);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  text-underline-offset: 4px;
}

.learning-path__steps a:hover,
.topic-links__heading a:hover {
  text-decoration: underline;
}

.topic-links {
  align-self: start;
  padding: 20px 24px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
}

.topic-links__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
}

.topic-links__heading a {
  gap: 6px;
  font-size: 13px;
}

.topic-links ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.topic-links li + li {
  border-top: 1px solid var(--vp-c-divider);
}

.topic-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.topic-link strong {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.topic-link__detail {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 1.8;
}

.topic-link__arrow {
  color: var(--vp-c-text-3);
  transition: transform 160ms ease;
}

.topic-link:hover strong,
.topic-link:hover .topic-link__arrow {
  color: var(--vp-c-brand-1);
}

.topic-link:hover .topic-link__arrow {
  transform: translateX(3px);
}

.home-overview a:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 4px;
  border-radius: 3px;
}

@media (min-width: 640px) {
  .home-overview {
    padding-inline: 48px;
  }
}

@media (min-width: 960px) {
  .home-overview {
    padding: 64px 64px 0;
  }

  .home-overview__body {
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 1fr);
    gap: 48px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .topic-link__arrow {
    transition: none;
  }
}
</style>
