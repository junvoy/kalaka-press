---
outline: [2, 3]
---

# OpenAI SDK 与 Responses API 面试题

本章回答“模型如何可靠地接入业务系统”。重点不在背参数，而在理解模型输出、工具执行和应用层控制之间的边界。示例使用 Python 伪代码，字段名以官方 Responses API 为准。

## API 选择与上下文

### 1. 为什么新项目优先考虑 Responses API？

**面试一句话：** Responses API 用同一个请求模型组织文本、多模态输入、结构化输出、内置工具、自定义函数和 MCP 工具，适合需要持续扩展工具能力的 Agent；既有 Chat Completions 链路可按兼容性和迁移成本逐步演进。

不要把“新”当作唯一理由。若现有接口稳定、只做简单问答且没有多工具编排需求，先评估兼容、观测和回归成本，再决定是否迁移。

**追问要点：** 迁移时先固化评测集，比较同一批输入的结构化输出合规率、任务成功率、延迟、成本和异常率，而不是只比较回答文采。

### 2. Function Calling 的完整闭环是什么？

**面试一句话：** 模型返回函数调用意图后，应用读取调用名和参数，完成 schema、权限与业务规则校验，执行受控工具，再以关联的调用 ID 回传工具结果，之后才让模型生成下一步或由状态机推进。

```python
response = client.responses.create(
    model=model,
    input=user_input,
    tools=[query_repayment_tool],
)

for call in function_calls(response.output):
    args = validate_schema(call.arguments)
    result = execute_after_authorization(call.name, args, trusted_context)
    tool_outputs.append({"type": "function_call_output", "call_id": call.call_id, "output": result})

next_response = client.responses.create(
    model=model,
    previous_response_id=response.id,
    input=tool_outputs,
)
```

解析成功不是授权成功。对金额、订单、租户、环境等关键参数，应从可信会话或后端查询补齐，不能直接信任模型或外部文本给出的值。

### 3. Structured Outputs 与 JSON Mode 有什么区别？

**面试一句话：** JSON Mode 主要保证输出是可解析 JSON；Structured Outputs 用 JSON Schema 约束字段、类型和必填项，更适合分类、路由、审批结果等需要稳定机器消费的场景。

即使 schema 合规，也仍要做业务校验。例如 `amount` 是数字不代表它在订单金额范围内；`action=submit` 也不代表调用方拥有提交权限。

### 4. `tool_choice` 和并行工具调用怎样设置？

**面试一句话：** 默认让模型在允许的工具中选择即可；只有某一轮必须查询或必须执行特定工具时才约束 `tool_choice`。并行工具调用只用于相互独立、无副作用或已被幂等保护的查询，写操作通常串行并经过状态闸门。

例如同时读取订单、用户权限和知识库可以并行；“创建申请 → 审批 → 入账”有因果关系，必须按状态顺序推进。

### 5. `previous_response_id`、`conversation` 与自管状态如何取舍？

**面试一句话：** 多轮对话可以引用前一 Response 或使用 Conversation 管理上下文；高风险业务仍要把订单状态、审批状态和幂等键保存到自己的数据库，因为模型会话不是业务事实来源。

会话历史负责“模型看过什么”；业务库负责“动作是否真的发生”。重启恢复时，应先读取业务权威状态，再构建必要上下文。

## 可靠性、成本与安全

### 6. 流式响应怎样接入才不会误导用户？

**面试一句话：** 流式响应适合改善用户对长文本的等待体验，但工具调用、审批和写操作的最终状态必须等服务端确认后再展示；前端不能把中间 token 当成已完成结果。

界面应区分“正在分析”“等待工具结果”“等待人工复核”“已完成/失败”，并让用户能看到最终可追踪的业务编号。

### 7. 内置工具、远程 MCP 和自定义函数如何选择？

**面试一句话：** 通用检索、文件处理等可优先评估平台内置工具；需要调用企业私有系统或执行受控副作用时，用自定义函数或经过鉴权的 MCP 服务，并在服务端保留权限、审计和幂等控制。

MCP 是工具接入协议，不会自动给企业系统加上权限控制。无论入口来自 SDK 函数还是 MCP，真正的写操作都必须由自己的服务校验。

### 8. 如何处理限流、超时和不完整响应？

**面试一句话：** 对可重试的限流与网络错误使用带抖动的指数退避，并设置请求超时、最大尝试次数和降级策略；对 `incomplete`、工具失败或输出不符合业务条件的结果，记录原因并回到安全状态，而不是无限重发。

重试前先判断动作是否有副作用。写操作必须先按幂等键或业务键查询最终状态；无法确认时应进入人工处置队列。

### 9. 如何监控 Agent 的成本和质量？

**面试一句话：** 以 `run_id` 串联模型用量、调用轮次、工具耗时、工具错误、人工转交和最终业务结果；同时按任务成功率、错误动作率、P95 耗时、单任务成本和安全拒绝率看板化。

优化顺序通常是先减少无意义上下文和重复调用，再用缓存、检索压缩或任务分级控制成本。更便宜的方案只有在通过相同评测门槛时才算优化。

### 10. 调用 OpenAI SDK 时有哪些数据边界？

**面试一句话：** 先做数据最小化和脱敏，只发送完成当前任务必需的内容；API Key 仅保存在服务端；用户标识使用稳定的非直接身份标识；审计中保存摘要和关联 ID，而非完整敏感 Prompt。

外部邮件、附件和网页都属于不可信数据。它们可以作为模型要处理的内容，不能成为覆盖系统指令或扩大工具权限的依据。

## 延伸阅读

- [OpenAI：Responses API 参考](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [OpenAI：Function Calling 指南](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI：Structured Outputs 指南](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI：模型与工具使用指导](https://developers.openai.com/api/docs/guides/latest-model)

---

[← AI Agent 工程化](/src/interview/ai/agent/question) · [下一章：LangChain 与 LangGraph 编排 →](/src/interview/ai/langchain/question)
