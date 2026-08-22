---
outline: [2, 3]
---

# AI 基础概念面试题

这一章先回答“为什么会出现这些概念”。每题都按同一顺序讲：它解决什么问题、没有它之前怎么办、核心思想是什么、适用边界在哪里。面试时不要只下定义，要先说原来的痛点，再说明为什么选这个方案。

## 概念关系速览

| 概念 | 解决的主要问题 | 最容易混淆的点 |
| --- | --- | --- |
| LLM | 理解和生成自然语言、非结构化内容 | 它不是业务规则引擎，也不是事实数据库 |
| Prompt | 让模型按任务、格式和约束工作 | 写得长不等于可靠，不能代替权限和校验 |
| RAG | 用可更新的外部知识补充模型上下文 | 它不等于实时查库，也不保证答案正确 |
| Tool Calling | 让模型提出结构化的外部调用意图 | 模型不会自行执行，也不能自行获得权限 |
| MCP | 让 AI 客户端用统一方式接入工具、资源和提示词 | 它是集成协议，不是业务 API 或安全系统 |
| Agent | 让模型在有限工具中循环判断和推进任务 | 它不适合固定、高风险的全自动流程 |
| Workflow | 用代码明确固定步骤和状态迁移 | 它不擅长理解开放、变化大的自然语言需求 |

## 核心流程：模型提出意图，系统决定是否执行

![从用户任务、LLM 理解、Tool Calling、服务端校验、MCP 或 HTTP 工具，到权威业务系统返回真实结果并继续决策的受控执行闭环](/.image/interview/ai-agent/fundamentals/ai-tool-agent-loop.svg)

图中的边界非常关键：模型只能提出调用意图；服务端负责 schema、权限和业务规则校验；MCP 或 HTTP 只是工具接入方式；最终业务事实必须以权威系统返回为准。

## 模型与知识

### 1. 什么是大语言模型（LLM）？它解决什么问题？

**面试一句话：** LLM 是根据上下文预测和生成文本（也可处理图像、音频等）的模型，擅长理解、归纳、抽取、分类和生成非结构化内容；它解决的是传统程序很难穷举规则的语言理解问题。

**没有它之前怎么办？** 对固定表单和格式化数据，用规则、正则、关键词、分类模型或人工处理；对邮件、合同、客服对话等表达多样的文本，规则会越来越长，维护成本高且覆盖不全。

**核心思想：** 不把每一种自然语言表达写成代码规则，而是把任务说明、示例和上下文交给预训练模型，让它基于语义完成理解或生成。

**限制与边界：** LLM 可能幻觉、遗漏条件或受输入措辞影响；它不天然知道最新业务事实，也不具备数据库事务、权限校验和确定性计算能力。因此金额、库存、审批状态等必须由权威系统查询和校验。

### 2. 什么是 Prompt Engineering？

**面试一句话：** Prompt Engineering 是把任务目标、上下文、输出格式、约束和示例组织为模型可稳定执行的指令，使模型在给定任务上更可控。

**没有它之前怎么办？** 最原始的方式是直接提问，例如“帮我处理这封邮件”。这种输入缺少角色、目标和边界，模型容易理解成聊天、总结或擅自补全信息。

**核心思想：** 将不变的系统规则、当前任务、可信数据和期望输出分层传入，并要求模型按明确 schema 返回结果。例如只抽取订单号、金额、还款日期和缺失字段，而不是生成一段自由文本。

**限制与边界：** Prompt 只能提高模型遵循指令的概率，不能成为安全边界。外部邮件、网页或附件可能包含注入内容；权限、金额范围、写库和审批必须在服务端用确定性代码校验。

### 3. 什么是 RAG？它为什么出现？

**面试一句话：** RAG（检索增强生成）是在回答前先从受控知识库检索相关证据，再把证据放进模型上下文生成答案，解决模型知识过期、私有知识缺失和答案难以追溯的问题。

**没有它之前怎么办？** 可以把文档直接贴进 Prompt，但受上下文长度和成本限制；也可以微调模型，但文档更新后需要重新训练，且不适合频繁变化的制度或产品资料；最常见的旧方案仍是人工搜索文档。

**核心思想：** 将文档切分并建立索引，查询时先召回候选片段、按相关性重排，再让模型只依据这些片段回答并给出来源。模型负责组织语言，检索系统负责提供证据。

**限制与边界：** 检索不到或检索错了，模型仍可能答错；权限必须在检索前过滤；RAG 不应替代订单、库存、余额等实时权威数据查询。没有足够证据时，应拒答或转人工，而不是要求模型“尽量回答”。

![RAG 从用户问题开始，先按用户与文档状态过滤权限，再检索、重排和判断证据充分性，最后生成带来源答案或拒答转人工的流程](/.image/interview/ai-agent/fundamentals/rag-answer-flow.svg)

**核心伪代码：有据回答而不是“尽量回答”。**

```python
def answer_with_rag(question: str, user: User) -> Answer:
    # 权限必须先于检索，不能先取回内容再让模型忽略。
    filters = {"department": user.department, "status": "published"}
    candidates = vector_store.search(question, filters=filters)
    evidence = rerank(question, candidates)[:5]

    if not has_sufficient_evidence(evidence):
        return Answer.refuse("未找到可确认依据，请补充信息或转人工")

    return llm.generate(
        instructions="只依据证据回答；每个结论标注来源；不能补充猜测。",
        input={"question": question, "evidence": evidence},
    )
```

## 工具与协议

### 4. 什么是 Tool Calling（Function Calling）？

**面试一句话：** Tool Calling 让模型依据工具的名称、说明和参数 schema，返回一个结构化的“我要调用什么、参数是什么”的意图，解决模型无法可靠访问实时数据或业务能力的问题。

**没有它之前怎么办？** 常见做法是让模型生成自然语言或 JSON，再由程序猜测用户想调用哪个接口；这会出现字段不稳定、意图歧义、解析脆弱和模型伪造结果等问题。

**核心思想：** 工具以清晰的名称、描述、输入 schema 和输出语义暴露给模型。模型负责选择工具和组织参数；应用程序负责验证、鉴权、执行，再把真实结果回传给模型继续推理。

**限制与边界：** Tool Calling 不会执行函数，也不赋予模型权限；参数 schema 合法也不代表业务合法。工具数量过多、描述模糊或副作用不可控都会降低选择质量。对写操作要限制调用次数、设置幂等键、查询最终状态，并在高风险场景走审批。

**核心伪代码：把模型输出当作不可信输入。**

```python
def execute_tool_call(call: ToolCall, actor: User) -> ToolResult:
    args = parse_and_validate_schema(call.arguments)
    trusted_args = hydrate_from_trusted_context(args, actor)  # 租户、操作者不能由模型决定

    authorize(actor, call.name, trusted_args)
    validate_business_rules(call.name, trusted_args)

    if is_write_operation(call.name):
        ensure_idempotency(trusted_args.business_key)
        require_approval_when_needed(trusted_args)

    return business_tools[call.name].execute(trusted_args)
```

### 5. MCP 是什么？它解决什么问题？

**面试一句话：** MCP（Model Context Protocol）是一套让 AI 客户端以统一方式发现和使用工具、资源与提示词的开放协议，解决“每个模型客户端都要为每个外部系统单独适配”的集成碎片化问题。

**没有它之前怎么办？** 每个 AI 应用分别对接邮件、数据库、知识库、代码仓库等系统：各自定义鉴权、工具描述、参数格式和错误处理。接入一多，重复开发和迁移成本都会很高。

**核心思想：** 将能力提供方做成 MCP Server，客户端通过协议发现其能力并发起调用；底层服务仍然可以是 HTTP API、数据库、文件系统或企业内部 RPC。协议层统一交互方式，业务层继续实现真正的能力。

**限制与边界：** MCP 不会替代现有业务 API，也不会自动解决身份认证、最小权限、审计、限流和幂等。接入第三方 Server 前必须审查其权限范围和数据去向；高风险写操作仍要经过自己服务端的业务校验。

**核心伪代码：MCP Server 暴露的是受控能力，不是裸数据库。**

```python
mcp = FastMCP("repayment-tools")

@mcp.tool()
def query_repayment(order_id: str, runtime: ToolRuntime) -> dict:
    actor = require_authenticated_actor(runtime)
    order = repayment_service.find(order_id, tenant_id=actor.tenant_id)
    authorize(actor, "repayment:read", order)
    return redact_for_model(order)
```

工具契约要说明输入、返回字段、失败语义和权限范围；认证、租户隔离、脱敏与审计仍由网关或业务服务落实。

### 6. MCP 和 Tool Calling 有什么区别与联系？

**面试一句话：** Tool Calling 是模型表达“想调用一个工具”的能力；MCP 是客户端与外部工具服务之间的标准化集成协议。前者解决模型如何提出结构化意图，后者解决工具如何被统一发现和接入。

**没有 MCP 时怎么办？** 仍然可以通过 SDK 自定义函数或普通 HTTP API 实现 Tool Calling；只是每个应用要自行维护工具注册、协议适配和客户端集成。

**核心思想：** 二者可组合：模型通过 Tool Calling 选择某个 MCP 暴露的工具，MCP 客户端负责转发到 Server，Server 调用内部系统并返回结果。也可以只使用其中之一。

**限制与边界：** 不要把 MCP 等同于 Agent，也不要因使用了 MCP 就跳过权限和业务校验。是否采用 MCP 应看多客户端复用、工具生态与运维成本；只有一个稳定内部接口时，直接调用受控服务通常更简单。

## 编排与自动化

### 7. 什么是 AI Agent？它和聊天机器人有什么不同？

**面试一句话：** Agent 是以目标为中心、在有限工具和规则内循环执行“理解 → 决策 → 调用工具 → 读取结果 → 决定下一步”的应用；聊天机器人通常只生成一轮或多轮文本回复。

**没有它之前怎么办？** 用固定页面、表单、规则引擎和接口编排完成流程；当用户意图复杂或任务路径不固定时，人工客服或运营人员需要在多个系统间判断下一步。

**核心思想：** 将模型的语言理解与工具调用结合，使其能根据当前上下文选择下一步，并根据工具返回的真实信息修正后续动作。Agent 的价值是处理“目标明确但路径不完全确定”的任务。

**限制与边界：** Agent 的循环会带来延迟、成本、不可预测性和错误累积。固定流程、低复杂度查询或高风险不可逆操作，不应为了“智能”而强行使用 Agent；要设置工具白名单、最大轮次、超时、停止条件、审计和人工复核。

**核心伪代码：Agent 循环必须有确定的停止条件。**

```python
def run_agent(state: AgentState) -> AgentState:
    for _ in range(MAX_STEPS):
        decision = model.decide(state.safe_context(), allowed_tools=READ_TOOLS)
        if decision.is_final:
            return state.complete(decision.answer)

        result = execute_tool_call(decision.call, state.actor)
        state = state.record(result)

        if state.needs_review() or state.has_terminal_error():
            return state.wait_for_human_or_fail()

    return state.fail("达到最大执行步数，停止自动推进")
```

### 8. Workflow 和 Agent 如何选择？

**面试一句话：** Workflow 的路径由代码预先定义，适合规则明确、步骤固定的业务；Agent 由模型在受限范围内动态选择工具，适合输入和处理路径难以完全预先枚举的任务。

**没有 Agent 时怎么办？** 对能够列清分支的流程，普通后端编排、状态机、任务调度和规则引擎已经足够，并且更易测试、回放和审计。

**核心思想：** 两者不是对立关系。生产系统常采用“外层 Workflow 控制状态、权限和写操作；内层 Agent 或 LLM 处理邮件理解、知识检索、异常归类”等混合架构。

**限制与边界：** 当错误成本高、状态有限且路径明确时，优先 Workflow；当任务需要开放式搜索、归纳或动态工具选择时再引入 Agent。不要把业务状态机的责任交给模型。

### 9. 为什么 Agent 仍然需要人、规则和后端系统？

**面试一句话：** 模型擅长理解和建议，后端系统擅长权限、事务、一致性和权威数据；人负责处理证据不足、风险敏感和需要业务判断的例外，三者共同保证结果可控。

**没有这些约束会怎样？** 模型可能根据不可信文本选择错误工具、在超时后重复提交，或把看似合理的回答当作事实。仅靠 Prompt 无法保证不发生越权和重复写入。

**核心思想：** 将模型定位为不可信但有价值的决策辅助：先由模型提出候选，再由 schema、规则、权限、幂等和状态机决定是否执行；人工复核负责高风险终态的批准、修改或拒绝。

**限制与边界：** 人工审核也会形成瓶颈，因此只对不可逆、高金额、低证据或异常场景触发；低风险、证据完整的查询与可逆操作可自动化，但仍要留存审计和回滚能力。

## 通用回答模板

回答基础概念题时，可以用四句话收束：

1. “它解决的是 ___ 的问题。”
2. “没有它时，通常用 ___，但会遇到 ___。”
3. “它的核心是把 ___ 交给模型/协议，把 ___ 留在确定性系统。”
4. “所以它适合 ___，不适合 ___；高风险场景还需要 ___。”

## 延伸阅读

- [Model Context Protocol：架构概览](https://modelcontextprotocol.io/docs/learn/architecture)
- [OpenAI：Responses API 与工具](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [LangChain：Agents](https://docs.langchain.com/oss/python/langchain/agents)
- [LangGraph：Workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)

---

[返回天机秘卷](/src/interview/ai/) · [下一章：AI Agent 工程化 →](/src/interview/ai/agent/question)
