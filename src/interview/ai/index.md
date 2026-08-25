---
outline: [2, 3]
---

# 天机秘卷

这里用第一性原理解释 AI 系统怎样理解输入、使用知识、调用工具并安全影响真实业务：先放下“Agent 就应该自主执行”的惯例，确认模型输出具有概率性、业务写入必须确定这两个基本事实，再重新构造权威状态、权限、幂等、人工复核、审计与评测组成的控制面。

本专栏与“葵花宝典”保持独立入口，方便集中学习 AI Agent；写作方法保持一致：先定义问题和不变量，再推导机制，用实现与案例验证，最后通过自测问题检查理解。

## 当前章节

- [AI 基础概念](/src/interview/ai/fundamentals/question)：LLM、Prompt、RAG、Tool Calling、MCP、Agent 与 Workflow 的原理和边界。
- [AI Agent 工程化](/src/interview/ai/agent/question)：确定性状态机、胖工具、幂等、人工复核、安全、审计与评测。
- [OpenAI SDK 与 Responses API](/src/interview/ai/sdk/question)：工具调用、结构化输出、会话状态、流式响应、成本与可观测性。
- [LangChain 与 LangGraph 编排](/src/interview/ai/langchain/question)：框架边界、Workflow、Agent、Checkpoint、HITL 与追踪评测。
- [三个落地案例](/src/interview/ai/cases/question)：已投产的线下还款 Agent，以及知识助手、工单分流两个通用方案。

## 建议学习方式

建议按“基础概念 → SDK 基础 → 编排取舍 → 高风险工程控制 → 落地案例”的顺序学习。学完一个主题后，尝试不依赖框架名称解释它解决的矛盾、信任边界和失败路径；能做到这一点，再组织面试表达会自然得多。
