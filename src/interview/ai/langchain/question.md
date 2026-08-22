---
outline: [2, 3]
---

# LangChain 与 LangGraph 编排面试题

本章关注“何时让模型自由决策，何时让代码控制路径”。LangChain 提供模型、工具和 Agent 的集成抽象；LangGraph 用图和持久化管理长运行状态；LangSmith 用于追踪与评测。框架能加速实现，但不能替代业务规则。

## 框架边界与编排取舍

### 1. LangChain、LangGraph、LangSmith 分别解决什么问题？

**面试一句话：** LangChain 偏向模型、Prompt、工具和 Agent 循环的应用抽象；LangGraph 偏向有状态、可恢复的流程编排；LangSmith 偏向追踪、数据集和评测。它们可以组合使用，但都不替代领域服务和业务数据库。

回答时不要把它们说成同一个框架：前两者解决运行时编排，LangSmith 解决观测和质量闭环。

### 2. Workflow 和 Agent 怎么选？

**面试一句话：** 步骤固定、风险高、规则明确时优先 Workflow；需要根据用户问题动态选择检索或查询工具时才给 Agent 有限的决策空间。实际系统常是“外层确定性 Workflow，局部使用 Agent”。

例如线下还款的入账、审批和状态迁移必须固定；对邮件正文抽取、异常说明归类等非结构化理解环节可用模型辅助。

### 3. `bind_tools` 与 `with_structured_output` 分别适合什么？

**面试一句话：** `bind_tools` 让模型在需要外部数据或动作时提出工具调用；`with_structured_output` 让模型把分类、路由或抽取结果返回为稳定对象。两者可组合，但都需要在业务层再校验。

```python
class TicketRoute(BaseModel):
    category: Literal["payment", "account", "other"]
    confidence: float
    missing_fields: list[str]

router = model.with_structured_output(TicketRoute)
route = router.invoke(ticket_text)
```

这段代码的价值是稳定机器接口，不是让模型直接决定数据库写入或最终审批。

### 4. 为什么要显式维护 Graph State？

**面试一句话：** Graph State 把输入、已获得的证据、工具结果、审批状态、错误原因和最终结果显式化，使每个节点只读写自己负责的状态，也便于恢复、审计与测试。

状态中不应混入密钥、完整原始隐私数据或不可验证的“模型猜测”。关键业务事实应保存权威 ID，并按需回查。

### 5. Checkpoint 能解决什么，不能解决什么？

**面试一句话：** Checkpoint 能保存图的执行状态，支持失败后从已完成步骤恢复、人工中断后续跑和问题复盘；它不能自动保证外部写操作恰好一次，仍需业务幂等键和最终状态查询。

生产环境使用持久化 Checkpointer；内存实现只适合本地演示或测试。恢复时还要验证外部资源与权限是否仍然有效。

## 人工复核、可观测性与评测

### 6. LangGraph 的 HITL 如何用于高风险工具？

**面试一句话：** 在工具执行前按风险策略触发 interrupt，保存待执行动作、证据和可编辑参数；审核人 approve、edit 或 reject 后，使用同一线程恢复图执行，并把决策写入审计链路。

审批不是“模型问用户一句话”。审批卡应包含业务摘要、风险提示、关键参数、数据来源、审批人和过期时间；申请人与审批人要按业务要求隔离。

### 7. 如何防止 Agent 在图中无限循环？

**面试一句话：** 给图定义清晰的成功、失败和转人工终态，并限制每个节点的重试次数、总步数和总耗时；每次回环都必须基于新增证据或可恢复错误，不能仅因模型要求继续就重跑。

将“缺少订单号”“权限不足”“对账不一致”等状态直接路由到补充信息或人工队列，而不是反复调用同一工具。

### 8. 追踪数据应该记录什么？

**面试一句话：** 至少记录 run、节点、模型调用、工具调用、状态迁移、耗时、token 用量、错误和最终业务结果，并用 `run_id` 与业务键关联；内容日志应脱敏并控制访问权限。

追踪用于回答“为什么走到这个分支、依据什么调用了工具、哪里变慢或失败”，不能只留下最终自然语言回复。

### 9. 怎样做回归评测？

**面试一句话：** 把真实但脱敏的正常、边界和失败输入固化成数据集，为每个案例定义结构化期望：路由是否正确、工具是否被禁止或选择正确、状态是否允许迁移、是否应转人工、最终结果是否匹配。

模型、Prompt、工具描述或规则变更后，都要跑同一评测集；高风险用例出现一次越权或错误写入就应阻断发布。

### 10. 面试中如何解释“用了 LangChain，但没有过度依赖框架”？

**回答框架：** 说明框架负责模型与工具的适配、编排状态和追踪；领域服务仍负责权限、幂等、事务和审计；关键流程即使替换模型或框架，也能依靠状态机与业务接口继续成立。

这比“我会调用 AgentExecutor”更能说明工程能力。

## 延伸阅读

- [LangChain：Workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [LangGraph：Persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
- [LangChain：Human-in-the-loop](https://docs.langchain.com/oss/python/langchain/human-in-the-loop)
- [LangGraph：概览](https://docs.langchain.com/oss/python/langgraph/overview)

---

[← OpenAI SDK 与 Responses API](/src/interview/ai/sdk/question) · [下一章：三个落地案例 →](/src/interview/ai/cases/question)
