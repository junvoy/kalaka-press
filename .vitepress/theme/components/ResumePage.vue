<script setup lang="ts">
import { withBase } from 'vitepress'
import { resume } from '../../../src/resume/resume.content'

const { profile, highlights, skills, experience, projects, education } = resume
const careerGuideUrl = withBase('/src/career/')

function goBack() {
  if (typeof window === 'undefined') return

  const referrer = document.referrer
  const cameFromThisSite = referrer && new URL(referrer).origin === window.location.origin

  if (cameFromThisSite) {
    window.history.back()
  } else {
    window.location.assign(careerGuideUrl)
  }
}
</script>

<template>
  <main class="web-resume">
    <nav class="resume-back" aria-label="简历页面导航">
      <button type="button" @click="goBack">
        <span aria-hidden="true">←</span>
        返回上一页
      </button>
      <div>
        <a :href="careerGuideUrl">求职指南</a>
        <span aria-hidden="true">/</span>
        <span>网页简历</span>
      </div>
    </nav>

    <header class="profile-card">
      <div class="profile-card__accent" aria-hidden="true"></div>

      <div class="profile-card__main">
        <p class="profile-card__eyebrow">WEB RESUME · JAVA BACKEND · AI AGENT</p>
        <h1>{{ profile.name }}</h1>
        <p class="profile-card__title">{{ profile.title }}</p>

        <div class="profile-card__meta" aria-label="求职信息">
          <span>{{ profile.experience }}</span>
          <span>求职意向：{{ profile.intention }}</span>
          <span>期望城市：{{ profile.city }}</span>
        </div>
      </div>

      <address class="profile-card__contact">
        <div>
          <span class="contact-icon" aria-hidden="true">T</span>
          <span>{{ profile.phone }}</span>
        </div>
        <div>
          <span class="contact-icon" aria-hidden="true">@</span>
          <span>{{ profile.email }}</span>
        </div>
        <div>
          <span class="contact-icon" aria-hidden="true">ID</span>
          <span>{{ profile.personalInfo }}</span>
        </div>
      </address>
    </header>

    <div class="resume-layout">
      <article class="resume-content">
        <section class="resume-section" aria-labelledby="advantages-heading">
          <div class="section-heading">
            <span class="section-heading__index">01</span>
            <div>
              <p>PROFILE</p>
              <h2 id="advantages-heading">个人优势</h2>
            </div>
          </div>

          <div class="highlight-grid">
            <article v-for="(item, index) in highlights" :key="item.title" class="highlight-card">
              <span class="highlight-card__number">0{{ index + 1 }}</span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.content }}</p>
            </article>
          </div>
        </section>

        <section class="resume-section" aria-labelledby="experience-heading">
          <div class="section-heading">
            <span class="section-heading__index">02</span>
            <div>
              <p>EXPERIENCE</p>
              <h2 id="experience-heading">工作经历</h2>
            </div>
          </div>

          <div class="timeline">
            <article v-for="item in experience" :key="item.name" class="timeline-entry">
              <div class="timeline-entry__marker" aria-hidden="true"></div>
              <div class="entry-heading">
                <div>
                  <h3>{{ item.name }}</h3>
                  <p>{{ item.role }}</p>
                </div>
                <time>{{ item.period }}</time>
              </div>

              <p class="entry-summary">{{ item.summary }}</p>
              <ol class="detail-list">
                <li v-for="bullet in item.bullets" :key="bullet">{{ bullet }}</li>
              </ol>
            </article>
          </div>
        </section>

        <section class="resume-section" aria-labelledby="projects-heading">
          <div class="section-heading">
            <span class="section-heading__index">03</span>
            <div>
              <p>PROJECTS</p>
              <h2 id="projects-heading">项目经历</h2>
            </div>
          </div>

          <div class="project-list">
            <article v-for="project in projects" :key="project.name" class="project-card">
              <header class="entry-heading project-card__heading">
                <div>
                  <h3>{{ project.name }}</h3>
                  <p>{{ project.role }}</p>
                </div>
                <time>{{ project.period }}</time>
              </header>

              <p class="entry-summary">{{ project.summary }}</p>

              <div v-if="project.modules?.length" class="project-block">
                <h4>核心模块</h4>
                <p>{{ project.modules.join('、') }}</p>
              </div>

              <div class="tech-list" aria-label="技术选型">
                <span v-for="tech in project.technologies" :key="tech">{{ tech }}</span>
              </div>

              <div class="project-block">
                <h4>职责描述</h4>
                <ol class="detail-list">
                  <li v-for="item in project.responsibilities" :key="item">{{ item }}</li>
                </ol>
              </div>

              <div class="achievement-panel">
                <h4>项目业绩</h4>
                <ul>
                  <li v-for="item in project.achievements" :key="item">{{ item }}</li>
                </ul>
              </div>
            </article>
          </div>
        </section>
      </article>

      <aside class="resume-sidebar">
        <section class="sidebar-card" aria-labelledby="skills-heading">
          <div class="sidebar-heading">
            <p>CAPABILITIES</p>
            <h2 id="skills-heading">专业技能</h2>
          </div>

          <div class="skill-groups">
            <div v-for="group in skills" :key="group.title" class="skill-group">
              <h3>{{ group.title }}</h3>
              <div class="skill-tags">
                <span v-for="item in group.items" :key="item">{{ item }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="sidebar-card education-card" aria-labelledby="education-heading">
          <div class="sidebar-heading">
            <p>EDUCATION</p>
            <h2 id="education-heading">教育经历</h2>
          </div>

          <h3>{{ education.school }}</h3>
          <p>{{ education.degree }} · {{ education.major }}</p>
          <time>{{ education.period }}</time>
        </section>

        <section class="sidebar-card focus-card" aria-label="技术方向">
          <p class="focus-card__label">CURRENT FOCUS</p>
          <strong>Java × AI Agent</strong>
          <p>面向生产环境的 Agent 工程化、确定性编排、数据治理与高并发系统。</p>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.web-resume {
  width: min(1240px, calc(100% - 48px));
  margin: 0 auto;
  padding: 48px 0 72px;
  color: var(--vp-c-text-1);
}

.resume-back {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}

.resume-back button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}

.resume-back button:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
}

.resume-back button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.resume-back > div {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.resume-back a {
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.resume-back a:hover {
  color: var(--vp-c-brand-1);
}

.profile-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 32px;
  overflow: hidden;
  padding: 42px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 24px;
  background:
    radial-gradient(circle at 88% 10%, var(--vp-c-brand-soft) 0, transparent 30%),
    linear-gradient(135deg, var(--vp-c-bg-soft), var(--vp-c-bg));
  box-shadow: var(--vp-shadow-2);
}

.profile-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-3), transparent 86%);
}

.profile-card__main,
.profile-card__contact {
  position: relative;
  z-index: 1;
}

.profile-card__eyebrow,
.section-heading p,
.sidebar-heading p,
.focus-card__label {
  margin: 0;
  color: var(--vp-c-brand-1);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.profile-card h1 {
  margin: 14px 0 0;
  font-size: clamp(42px, 6vw, 64px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.profile-card__title {
  margin: 14px 0 0;
  color: var(--vp-c-text-2);
  font-size: clamp(18px, 2.4vw, 24px);
  font-weight: 600;
}

.profile-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.profile-card__meta span,
.tech-list span,
.skill-tags span {
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
}

.profile-card__meta span {
  padding: 6px 11px;
  font-size: 13px;
  font-weight: 500;
}

.profile-card__contact {
  display: grid;
  align-content: center;
  gap: 12px;
  min-width: 245px;
  margin: 0;
  font-style: normal;
}

.profile-card__contact div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  text-decoration: none;
}

.contact-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 10px;
  font-weight: 800;
}

.resume-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 0.85fr);
  align-items: start;
  gap: 24px;
  margin-top: 24px;
}

.resume-content,
.resume-sidebar {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.resume-section,
.sidebar-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 18px;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-1);
}

.resume-section {
  padding: 30px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.section-heading__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 800;
}

.section-heading h2,
.sidebar-heading h2 {
  margin: 3px 0 0;
  font-size: 22px;
  line-height: 1.25;
}

.highlight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.highlight-card {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}

.highlight-card__number {
  position: absolute;
  top: 10px;
  right: 14px;
  color: var(--vp-c-brand-soft);
  font-size: 42px;
  font-weight: 900;
  line-height: 1;
}

.highlight-card h3,
.entry-heading h3,
.project-block h4,
.achievement-panel h4,
.skill-group h3,
.education-card h3 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.highlight-card h3 {
  position: relative;
  font-size: 15px;
}

.highlight-card p,
.entry-summary,
.project-block p,
.focus-card > p:last-child {
  color: var(--vp-c-text-2);
  line-height: 1.75;
}

.highlight-card p {
  position: relative;
  margin: 10px 0 0;
  font-size: 14px;
}

.timeline {
  position: relative;
  display: grid;
  gap: 26px;
  padding-left: 24px;
}

.timeline::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 5px;
  width: 1px;
  background: var(--vp-c-divider);
  content: '';
}

.timeline-entry {
  position: relative;
}

.timeline-entry__marker {
  position: absolute;
  top: 7px;
  left: -24px;
  width: 11px;
  height: 11px;
  border: 3px solid var(--vp-c-bg);
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.entry-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.entry-heading h3 {
  font-size: 17px;
  line-height: 1.45;
}

.entry-heading div > p {
  margin: 3px 0 0;
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 600;
}

.entry-heading time,
.education-card time {
  flex: 0 0 auto;
  color: var(--vp-c-text-3);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.entry-summary {
  margin: 12px 0 0;
  padding: 12px 14px;
  border-left: 3px solid var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}

.detail-list {
  display: grid;
  gap: 9px;
  margin: 14px 0 0;
  padding-left: 22px;
  color: var(--vp-c-text-2);
}

.detail-list li {
  padding-left: 4px;
  font-size: 14px;
  line-height: 1.75;
}

.detail-list li::marker {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.project-list {
  display: grid;
  gap: 18px;
}

.project-card {
  padding: 22px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 15px;
  background: var(--vp-c-bg-soft);
}

.project-card__heading h3 {
  font-size: 19px;
}

.tech-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.tech-list span,
.skill-tags span {
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 500;
}

.project-block {
  margin-top: 16px;
}

.project-block h4,
.achievement-panel h4 {
  font-size: 13px;
}

.project-block p {
  margin: 7px 0 0;
  font-size: 13px;
}

.achievement-panel {
  margin-top: 18px;
  padding: 15px;
  border: 1px solid var(--vp-c-brand-soft);
  border-radius: 12px;
  background: color-mix(in srgb, var(--vp-c-brand-soft) 62%, transparent);
}

.achievement-panel ul {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: 9px 0 0;
  padding: 0;
  list-style: none;
}

.achievement-panel li {
  position: relative;
  padding-left: 14px;
  color: var(--vp-c-text-2);
  font-size: 13px;
  line-height: 1.55;
}

.achievement-panel li::before {
  position: absolute;
  top: 0.62em;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  content: '';
}

.resume-sidebar {
  position: sticky;
  top: calc(var(--vp-nav-height) + 20px);
}

.sidebar-card {
  padding: 24px;
}

.sidebar-heading {
  margin-bottom: 20px;
}

.skill-groups {
  display: grid;
  gap: 22px;
}

.skill-group h3 {
  font-size: 14px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.skill-tags span:hover,
.tech-list span:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.education-card h3 {
  font-size: 17px;
}

.education-card > p {
  margin: 7px 0 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.focus-card {
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0, var(--vp-c-brand-soft), transparent 42%),
    var(--vp-c-bg);
}

.focus-card strong {
  display: block;
  margin-top: 9px;
  font-size: 21px;
}

.focus-card > p:last-child {
  margin: 10px 0 0;
  font-size: 13px;
}

@media (max-width: 960px) {
  .profile-card {
    grid-template-columns: 1fr;
  }

  .profile-card__contact {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .resume-layout {
    grid-template-columns: 1fr;
  }

  .resume-sidebar {
    position: static;
    grid-row: auto;
  }
}

@media (max-width: 680px) {
  .web-resume {
    width: calc(100% - 24px);
    padding: 20px 0 40px;
  }

  .resume-back > div {
    display: none;
  }

  .profile-card {
    gap: 24px;
    padding: 28px 22px;
    border-radius: 18px;
  }

  .profile-card__contact {
    grid-template-columns: 1fr;
  }

  .resume-section,
  .sidebar-card {
    padding: 22px 18px;
    border-radius: 15px;
  }

  .highlight-grid {
    grid-template-columns: 1fr;
  }

  .entry-heading {
    flex-direction: column;
    gap: 7px;
  }

  .project-card {
    padding: 18px 15px;
  }

  .detail-list {
    padding-left: 20px;
  }
}

@media print {
  :global(.VPNav),
  :global(.VPFooter) {
    display: none !important;
  }

  .web-resume {
    width: 100%;
    padding: 0;
  }

  .profile-card,
  .resume-section,
  .sidebar-card,
  .project-card {
    break-inside: avoid;
    box-shadow: none;
  }

  .resume-layout {
    grid-template-columns: 1fr;
  }

  .resume-sidebar {
    position: static;
  }
}
</style>
