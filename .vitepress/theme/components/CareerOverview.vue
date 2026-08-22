<script setup lang="ts">
import { withBase } from 'vitepress'

const steps = [
  {
    index: '01',
    title: '编写简历',
    label: 'WRITE',
    description: '从事实证据出发，提炼可验证、可追问的项目亮点。',
    output: '事实台账 · 主简历 · 岗位版本',
    link: '/src/career/resume-writing'
  },
  {
    index: '02',
    title: '简历样式',
    label: 'DESIGN',
    description: '建立清晰的信息层级，并完成网页、附件和隐私检查。',
    output: '视觉规范 · 网页简历 · 检查表',
    link: '/src/career/resume-style'
  },
  {
    index: '03',
    title: '简历投递',
    label: 'DELIVER',
    description: '评估岗位匹配度，选择正确版本并记录每次反馈。',
    output: '岗位评分 · 匹配矩阵 · 投递记录',
    link: '/src/career/resume-delivery'
  },
  {
    index: '04',
    title: '面试指南',
    label: 'INTERVIEW',
    description: '把简历结论准备成能讲清背景、方案、贡献与取舍的证据。',
    output: '自我介绍 · 项目讲稿 · 追问地图',
    link: '/src/career/interview-guide'
  },
  {
    index: '05',
    title: '面试复盘',
    label: 'REVIEW',
    description: '记录问题、定位根因，把一次面试转化为下一轮行动。',
    output: '问题库 · 能力评分 · 改进计划',
    link: '/src/career/interview-review'
  }
]

const principles = [
  {
    title: '真实性优先',
    description: '经历、职责、时间和数字都应能够经受连续追问。优化表达，不虚构证据。'
  },
  {
    title: '岗位驱动',
    description: '从目标岗位与真实经历的交叉点准备，不从堆砌关键词和通用题库开始。'
  },
  {
    title: '持续闭环',
    description: '投递数据和面试复盘要回写到简历、岗位筛选与下一轮准备中。'
  }
]
</script>

<template>
  <main class="career-overview">
    <section class="career-hero">
      <div class="career-hero__glow" aria-hidden="true"></div>
      <div class="career-hero__content">
        <p class="career-kicker">CAREER PLAYBOOK · 求职行动手册</p>
        <h1>从真实经历出发，<br /><span>完成求职闭环。</span></h1>
        <p class="career-hero__description">
          一套可以反复执行的流程：建立证据、组织简历、匹配岗位、准备面试，并用每次反馈持续迭代。
        </p>

        <div class="career-hero__actions">
          <a class="career-button career-button--brand" :href="withBase(steps[0].link)">
            从编写简历开始
            <span aria-hidden="true">→</span>
          </a>
          <a class="career-button" :href="withBase('/src/resume/')">查看网页简历示例</a>
        </div>
      </div>

      <div class="career-hero__summary" aria-label="指南摘要">
        <div><strong>5</strong><span>个求职阶段</span></div>
        <div><strong>1</strong><span>套执行闭环</span></div>
        <div><strong>0</strong><span>项虚构经历</span></div>
      </div>
    </section>

    <section class="career-section" aria-labelledby="journey-title">
      <header class="career-section__heading">
        <div>
          <p>THE JOURNEY</p>
          <h2 id="journey-title">求职路径</h2>
        </div>
        <span>按真实流程依次完成，也可以从当前卡点进入。</span>
      </header>

      <div class="career-steps">
        <a
          v-for="step in steps"
          :key="step.index"
          class="career-step"
          :href="withBase(step.link)"
        >
          <div class="career-step__top">
            <span class="career-step__index">{{ step.index }}</span>
            <span class="career-step__label">{{ step.label }}</span>
          </div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.description }}</p>
          <div class="career-step__output">{{ step.output }}</div>
          <span class="career-step__arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <section class="career-section" aria-labelledby="principles-title">
      <header class="career-section__heading">
        <div>
          <p>WORKING PRINCIPLES</p>
          <h2 id="principles-title">执行原则</h2>
        </div>
      </header>

      <div class="career-principles">
        <article v-for="(item, index) in principles" :key="item.title">
          <span>0{{ index + 1 }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="career-ready">
      <div>
        <p>READY TO START?</p>
        <h2>先完成事实证据台账，再开始润色。</h2>
        <span>这是整套流程中最重要、也最容易被跳过的一步。</span>
      </div>
      <a class="career-button career-button--brand" :href="withBase(steps[0].link)">
        进入编写简历
        <span aria-hidden="true">→</span>
      </a>
    </section>
  </main>
</template>

<style scoped>
.career-overview {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 48px 0 72px;
  color: var(--vp-c-text-1);
}

.career-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 40px;
  overflow: hidden;
  padding: 52px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 26px;
  background:
    radial-gradient(circle at 84% 16%, var(--vp-c-brand-soft), transparent 32%),
    linear-gradient(145deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--vp-shadow-2);
}

.career-hero__glow {
  position: absolute;
  top: -100px;
  right: -80px;
  width: 360px;
  height: 360px;
  border: 1px solid var(--vp-c-brand-2);
  border-radius: 50%;
  opacity: 0.14;
}

.career-hero__content,
.career-hero__summary {
  position: relative;
  z-index: 1;
}

.career-kicker,
.career-section__heading p,
.career-ready > div > p {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.career-hero h1 {
  margin: 16px 0 0;
  font-size: clamp(40px, 6vw, 68px);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.career-hero h1 span {
  color: var(--vp-c-brand-1);
}

.career-hero__description {
  max-width: 650px;
  margin: 22px 0 0;
  color: var(--vp-c-text-2);
  font-size: 17px;
  line-height: 1.8;
}

.career-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.career-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 11px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 650;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s, transform 0.2s;
}

.career-button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}

.career-button--brand {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.career-button--brand:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-2);
  color: var(--vp-c-white);
}

.career-hero__summary {
  display: grid;
  gap: 14px;
  min-width: 155px;
}

.career-hero__summary div {
  display: grid;
  grid-template-columns: 48px 1fr;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.career-hero__summary strong {
  color: var(--vp-c-brand-1);
  font-size: 30px;
  line-height: 1;
}

.career-hero__summary span {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
}

.career-section {
  margin-top: 52px;
}

.career-section__heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.career-section__heading h2,
.career-ready h2 {
  margin: 5px 0 0;
  font-size: 28px;
  letter-spacing: -0.02em;
}

.career-section__heading > span {
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.career-steps {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.career-step {
  position: relative;
  display: flex;
  grid-column: span 2;
  flex-direction: column;
  min-height: 240px;
  padding: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.career-step:nth-child(4) {
  grid-column: 2 / span 2;
}

.career-step:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-2);
  transform: translateY(-3px);
}

.career-step__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.career-step__index {
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 800;
}

.career-step__label {
  color: var(--vp-c-text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.career-step h3 {
  margin: 28px 0 0;
  font-size: 20px;
}

.career-step > p {
  margin: 10px 0 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}

.career-step__output {
  margin-top: auto;
  padding-top: 20px;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 600;
}

.career-step__arrow {
  position: absolute;
  right: 18px;
  bottom: 16px;
  color: var(--vp-c-brand-1);
  font-size: 20px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
}

.career-step:hover .career-step__arrow {
  opacity: 1;
  transform: translate(2px, -2px);
}

.career-principles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.career-principles article {
  padding: 22px;
  border-top: 3px solid var(--vp-c-brand-1);
  border-radius: 4px 4px 14px 14px;
  background: var(--vp-c-bg-soft);
}

.career-principles article > span {
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 800;
}

.career-principles h3 {
  margin: 16px 0 0;
  font-size: 17px;
}

.career-principles p {
  margin: 9px 0 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.75;
}

.career-ready {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  margin-top: 52px;
  padding: 28px 32px;
  border: 1px solid var(--vp-c-brand-soft);
  border-radius: 18px;
  background:
    radial-gradient(circle at 95% 0, var(--vp-c-brand-soft), transparent 35%),
    var(--vp-c-bg-soft);
}

.career-ready h2 {
  font-size: 22px;
}

.career-ready > div > span {
  display: block;
  margin-top: 7px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

@media (max-width: 820px) {
  .career-hero {
    grid-template-columns: 1fr;
    padding: 38px;
  }

  .career-hero__summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .career-hero__summary div {
    grid-template-columns: 1fr;
  }

  .career-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .career-step,
  .career-step:nth-child(4) {
    grid-column: auto;
  }

  .career-step:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .career-overview {
    width: calc(100% - 24px);
    padding: 20px 0 40px;
  }

  .career-hero {
    gap: 28px;
    padding: 28px 22px;
    border-radius: 18px;
  }

  .career-hero__description {
    font-size: 15px;
  }

  .career-hero__actions,
  .career-ready {
    align-items: stretch;
    flex-direction: column;
  }

  .career-button {
    width: 100%;
  }

  .career-hero__summary {
    grid-template-columns: 1fr;
  }

  .career-hero__summary div {
    grid-template-columns: 48px 1fr;
  }

  .career-section {
    margin-top: 38px;
  }

  .career-section__heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .career-steps,
  .career-principles {
    grid-template-columns: 1fr;
  }

  .career-step:last-child {
    grid-column: auto;
  }

  .career-ready {
    margin-top: 38px;
    padding: 24px 20px;
  }
}
</style>
