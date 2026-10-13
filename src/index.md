---
layout: home
markdownStyles: false

hero:
  name: "云程阁"
  text: "Java · AI Agent<br>软件系统原理"
  tagline: 从基本问题出发，用源码与实践理解技术，再把理解变成解决问题的能力。
  actions:
    - theme: brand
      text: 查看学习地图
      link: /src/interview/question
    - theme: alt
      text: 按技术查找
      link: /src/interview/technology-index

features:
  - title: 葵花宝典
    details: Java 核心、网络、数据库与分布式系统。从运行机制到故障边界，串起后端知识。
    link: /src/interview/introduction
    linkText: 学习 Java 与后端
  - title: 天机秘卷
    details: 从大模型基础到工具调用、RAG 与 Agent 编排，理解 AI 应用如何可靠地参与业务。
    link: /src/interview/ai/
    linkText: 探索 AI Agent
  - title: 青云策
    details: 梳理真实项目，写好简历，准备面试。用每次投递与复盘推进下一步行动。
    link: /src/career/
    linkText: 准备求职与面试
---

<script setup>
import HomeOverview from '../.vitepress/theme/components/HomeOverview.vue'
</script>

<HomeOverview />
