---
outline: [2, 2]
---

# MQ 面试题：先懂共同原理，再分清 RabbitMQ 与 Kafka

消息队列（Message Queue，MQ）不是“接入后就不会丢消息”的保险箱。它把同步调用改造成跨时间、跨进程的异步协作，用解耦、缓冲和独立扩缩容换来了新的问题：消息可能延迟、重复、乱序、积压，也可能只在部分节点成功。

本章只保留一条学习主线：先从网络、故障和容量约束推导 MQ 的共同原理，再分别理解 RabbitMQ 的“路由队列”和 Kafka 的“分区日志”，最后根据业务场景选型。RocketMQ 作为业务消息方案放在共同原理中补充，不再拆成第三篇重复讲解。

> **先记结论：** RabbitMQ 更像“把任务按规则分到队列，处理完再确认”；Kafka 更像“把事件追加到可保留的日志，不同消费组各自记录读到哪里”。二者都可能丢、重、乱、积压，也都不能代替业务幂等。

## 阅读路线

1. 第一次学习：先读[一条消息的生命周期](#一条消息的生命周期)和[重复窗口](#为什么-ack-和-offset-必然带来重复窗口)。
2. 准备面试：重点读 [RabbitMQ](#rabbitmq-先看路由-再谈可靠性)、[Kafka](#kafka-把消息队列看成可回放日志)和[场景选型](#产品选型是约束匹配)。
3. 项目追问：再补 Outbox、RocketMQ 事务消息、积压排查和故障演练。

## 目标：不预设消息队列

先不问“选 RocketMQ 还是 Kafka”。真正的目标是：下单成功后，多个处理能力不同的下游最终收到业务事件；下游短时不可用时主链路仍可继续；重复、超时和局部失败不能破坏订单不变量。

设想下单接口同步调用库存、积分、短信和数据分析：任何一个下游变慢都会延长用户请求，任何一个下游故障都可能拖垮主链路，突发流量还会同时冲击所有系统。MQ 只是候选构造，系统必须先回答：

- 生产者超时后，Broker 到底有没有收到？
- 消费者业务成功、确认失败后，重复消息怎样不重复生效？
- Broker 宕机、消费者扩缩容或下游过载时，系统怎样继续收敛？
- 数据库事务成功但消息没发出时，业务状态和事件怎样重新一致？

## 拆掉现成答案

### 哪些是事实，哪些只是宣传或类比？

| 常见说法 | 分类 | 为什么 |
| --- | --- | --- |
| “用了 MQ 就解耦了” | 不完整结论 | 只是转移了时间与位置依赖，仍依赖消息契约和 Broker |
| “发送成功就表示业务完成” | 错误假设 | Broker 接受与消费者业务提交是不同阶段 |
| “Exactly Once 保证绝不重复” | 边界不明的宣传 | 必须说明是否覆盖数据库、HTTP 和人工副作用 |
| “扩消费者就能解决积压” | 错误假设 | 队列并行度和下游容量可能先成为上限 |
| “网络超时” | 可观察事实 | 只能证明调用方没有按时得到结果，不能证明服务端未执行 |

### 不可再省略的基本事实

1. **网络只有结果，不提供确定性。** 超时表示调用方没有按时得到结果，不等于服务端一定没有执行。
2. **节点会独立失败。** 生产者、Broker、消费者和数据库不可能在所有时刻同时可用。
3. **消费能力有上限。** 队列可以吸收短期峰值，不能凭空提高数据库和第三方接口的长期吞吐。

### 可靠消息需要保护什么？

- 已接受的关键事件最终能够被找到、处理或进入明确的异常状态。
- 同一业务事件被重复投递时，业务结果不会重复生效。
- 对要求顺序的业务键，旧状态不能被迟到的新投递覆盖成错误状态。
- 所有未收敛事件都能通过消息 ID、业务键和消费进度观察、告警与重放。
- 生产成功、Broker 持久化、消费确认和业务完成是不同事实，不能用一个“成功”混在一起。

## 从基本事实重新构造

假设没有任何 MQ 产品，只根据目标和基本事实构造：生产与消费不必同时在线，因此中间需要可持久保存事件的角色；生产速率可能短时高于消费速率，因此事件需要排队；节点会在任意阶段退出，因此每一阶段都需要确认、进度和重试；重试会重复，因此业务端必须幂等；自动恢复仍可能失败，因此还需要死信、告警和人工补偿。

推导到这里，才得到“生产者 + 持久化中介 + 消费者”的最小消息模型。Topic、Partition、MessageQueue、ACK 和 Consumer Group 都是继续优化分类、并行与进度管理的实现方式。

### 为什么异步能解耦和削峰？

最小消息模型只需要三个角色：生产者产生事件，Broker 暂存并投递事件，消费者处理事件。生产者不再等待所有下游完成，消费者也可以根据自身能力拉取或接收消息。

这带来三个能力：

- **时间解耦：** 生产和消费不必同时完成。
- **位置解耦：** 生产者面向 Topic，不直接绑定每个消费者地址。
- **速率整形：** 短时生产速率高于消费速率时，差值暂存在队列中。

代价是同步结果变成最终一致。登录校验、余额确认等必须立即得到权威结果的环节，不能只为“解耦”就改成异步。

### 一条消息的生命周期

![消息从生产者发送、Broker 存储到消费确认、重试和死信处理的完整生命周期](/.image/interview/middleware/mq/message-lifecycle.svg)

通用链路可以拆成七个可观察阶段：

```text
生成业务事件 -> 发送 -> Broker 持久化 -> 投递 -> 执行业务
             -> 提交确认/进度 -> 成功结束或重试、死信、补偿
```

发送成功只证明消息到达约定的 Broker 阶段，不证明下游业务完成；消费者拿到消息也不等于可以立即确认，确认必须位于业务成功之后。

在 RocketMQ 中，Topic 是逻辑分类，MessageQueue 是 Topic 下承载并行度与局部顺序的逻辑队列，Consumer Group 中的实例共同分担一份消费进度，Broker 负责存储与投递。RabbitMQ 更常用 Exchange、Queue、Binding，Kafka 使用 Topic、Partition、Consumer Group；术语不同，但都要定义分类、分片和进度归属。

### 发送方式只是等待策略

- 同步发送等待 Broker 结果，失败处理最直接。
- 异步发送通过回调获取结果，调用线程不用原地等待，但仍要处理回调失败、并发和进程退出。
- 单向发送不等待确认，只适合允许丢失的低价值数据。

关键事件无论同步还是异步，都应携带稳定的业务事件 ID，并记录发送结果、耗时和失败原因。超时后的重试可能造成重复，因此“等待方式”不能替代幂等。

```java
Message message = new Message(
    "order-events",
    "created",
    orderJson.getBytes(StandardCharsets.UTF_8)
);
message.setKeys(eventId);

SendResult result = producer.send(message, 3_000);
if (result.getSendStatus() != SendStatus.SEND_OK) {
    pendingEventRepository.record(eventId, orderJson);
    throw new MessageSendException(eventId);
}
```

这段代码只处理发送结果，不能修复“订单已经提交，应用还没发消息就宕机”的数据库与 MQ 双写窗口；这个问题要继续推导到 Outbox 或事务消息。

## 端到端可靠性怎样组成？

### 生产者、Broker 和消费者各守一段边界

可靠性不能只靠某个客户端开关：

- 生产端确认发送结果，对不确定状态使用稳定事件 ID 可靠重试或保存待发送记录。
- Broker 根据目标选择刷盘、副本和故障切换策略，明确可接受的数据丢失窗口与延迟。
- 消费端在业务提交后再确认；失败时返回可重试状态，并保留死信、告警和人工补偿入口。

RocketMQ 5.5.0 的 [`CommitLog.asyncPutMessage`](https://github.com/apache/rocketmq/blob/rocketmq-all-5.5.0/store/src/main/java/org/apache/rocketmq/store/CommitLog.java) 会设置存储时间、计算消息体 CRC、编码并把消息追加到 CommitLog。消费侧 [`ConsumeMessageConcurrentlyService`](https://github.com/apache/rocketmq/blob/rocketmq-all-5.5.0/client/src/main/java/org/apache/rocketmq/client/impl/consumer/ConsumeMessageConcurrentlyService.java) 调用业务监听器，再根据成功或稍后重试的结果处理消费进度。这两段实现验证了“Broker 接受”和“业务完成”是两个独立阶段。

### 为什么 ACK 和 Offset 必然带来重复窗口？

ACK 或 Offset 表示 Broker 眼中的消费进度。假设消费者先提交数据库事务，再提交进度：如果数据库已成功而进度提交前宕机，Broker 只能把消息重新投递。反过来先确认再执行业务，则可能在业务失败后永久丢失处理机会。

因此关键业务通常选择“至少一次投递 + 消费幂等”，用可修复的重复风险换取不轻易丢失。

### 幂等把重复投递变成一次业务效果

![消息消费通过事件唯一键、同一事务更新业务并在确认丢失后安全重投的幂等流程](/.image/interview/middleware/mq/idempotent-consume.svg)

```java
@Transactional
public void handle(OrderPaidEvent event) {
    boolean first = processedEventRepository.tryInsert(event.eventId());
    if (!first) {
        return;
    }
    orderRepository.markPaid(event.orderId(), event.paidAt());
}
```

`processed_event.event_id` 需要数据库唯一约束，幂等记录与业务更新必须处于同一个本地事务。只在 Redis 放一个短期 Key，可能遇到过期、淘汰或“Key 已写而数据库失败”。无法纳入本地事务的支付、短信等外部副作用，还需要下游幂等号、状态查询或补偿。

投递语义由此可以准确区分：

| 语义 | 不确定时怎样处理 | 主要代价 |
| --- | --- | --- |
| 最多一次 | 不重投 | 可能丢失 |
| 至少一次 | 再次投递 | 可能重复，需要幂等 |
| 端到端恰好一次 | 原子协调所有状态与副作用 | 适用边界窄、成本高 |

Kafka 事务或某个客户端的 Exactly Once 只覆盖它声明的边界；数据库、HTTP、短信和人工操作不会自动获得端到端恰好一次。工程中更常见的是至少一次投递配合幂等，得到“业务效果上的一次”。

### 顺序是业务键范围内的约束

同一订单的事件可以用稳定业务键路由到同一 MessageQueue，并在消费者侧串行处理；不同订单仍可以分布到不同队列并行。全局顺序会把所有业务压到一条通道，明显牺牲吞吐和可用性。

扩容、Rebalance、重试和生产端并发都可能影响顺序，因此业务状态机还应拒绝过期转换，例如“已退款”不能被迟到的“已支付”覆盖。能用状态版本解决的问题，不要强求昂贵的全局顺序。

## 故障、积压与恢复

### 重试必须区分错误类型

- 网络闪断、短暂限流等瞬时故障，可以使用有限次数、退避和抖动重试。
- 参数非法、状态不允许等永久错误，应停止自动重试并暴露原因。
- 下游已过载时立即连续重试只会放大流量，应结合超时、限流和熔断。

超过自动重试上限的消息进入死信队列（DLQ）。DLQ 是带原始消息、失败原因、责任人、修复和重放记录的异常清单，不是垃圾桶。重放前必须确认根因已修复、消费者幂等，并按业务键和可控速率执行。[RocketMQ 消费重试说明](https://rocketmq.apache.org/docs/featureBehavior/10consumerretrypolicy/)

### 积压是生产速率与消费能力失衡的结果

排查积压先比较生产速率、消费速率、Lag 和最老消息年龄，再检查消费者存活、失败重试、Rebalance、队列热点以及数据库和外部接口耗时。增加消费者前要确认 MessageQueue 数量能够提供并行度，下游也有剩余容量。

至少监控：生产/消费 TPS、Consumer Lag、最老消息年龄、成功率、重试与 DLQ 数、P95/P99 处理耗时、队列热点和下游错误率。队列只能吸收短期峰值；长期输入大于输出时，积压一定持续增长。

### Rebalance 为什么会暂停或重复？

消费组成员或队列集合变化后需要重新分配 MessageQueue。旧消费者撤销队列、新消费者接管进度之间可能暂停；若旧消费者业务已成功但 Offset 尚未提交，新消费者会再次处理。

因此要减少无意义的频繁扩缩容和重启，配置合理超时与优雅停机，并把幂等作为接管安全的底线。不能用反复重启消费者掩盖真实积压原因。

### Broker 存储和高可用保护不同故障

RocketMQ 把消息顺序追加到 CommitLog，再使用 ConsumeQueue 等逻辑索引支持按 Topic 与队列消费。顺序追加改善磁盘写入模式；索引负责快速定位消息。

刷盘回答“内存数据何时进入稳定存储”，副本回答“单机损坏后是否还有可用副本”。同步和异步策略对延迟、吞吐与数据丢失窗口的影响不同，“已持久化”也不等于任何故障下绝对零丢失。

延迟消息只保证消息在某个时间后才可见，不是毫秒级精确定时器。消费者执行订单关闭等动作前必须读取最新权威状态并使用条件更新；超长周期、海量且需要修改取消的任务，应评估专用调度系统或时间轮。

## 数据库与消息怎样最终一致？

### Outbox 把跨系统双写收缩为本地事务

![业务数据与 Outbox 在同一事务提交后由投递器可靠发送并由消费者幂等处理的流程](/.image/interview/middleware/mq/outbox-delivery.svg)

```java
@Transactional
public void createOrder(CreateOrderCommand command) {
    orderRepository.insert(command.toOrder());
    outboxRepository.insert(
        OutboxEvent.pending(command.eventId(), "order-created", command.toJson())
    );
}

public void publish(OutboxEvent event) {
    producer.send(toMessage(event));
    outboxRepository.markSent(event.id());
}
```

业务数据和待发送事件在同一数据库事务提交，独立投递器再扫描、发送和更新状态。如果消息已发送但 `markSent` 失败，事件会再次发送，所以消费端仍需幂等。Outbox 提供最终一致，不提供数据库与 MQ 的瞬时强一致，还要治理表膨胀、并发抢占、归档、失败告警和重复发送。

### RocketMQ 事务消息用回查消除未知状态

![RocketMQ 事务消息从 Half Message、本地事务到提交、回滚和 Broker 回查的流程](/.image/interview/middleware/mq/transaction-message-check.svg)

生产者先发送消费者不可见的 Half Message；Broker 接受后执行生产者本地事务，再根据结果 Commit 或 Rollback。若进程宕机或二阶段响应丢失，Broker 回查生产者的本地事务记录。

RocketMQ 5.5.0 的 [`TransactionalMessageServiceImpl.check`](https://github.com/apache/rocketmq/blob/rocketmq-all-5.5.0/broker/src/main/java/org/apache/rocketmq/broker/transaction/queue/TransactionalMessageServiceImpl.java) 扫描待确认 Half Message，结合 Half Offset 与 Op Offset 找出未知状态并触发回查；`commitMessage` 和 `rollbackMessage` 再根据 CommitLog Offset 定位原消息。

事务检查器必须能够根据本地事务记录幂等查询。事务消息保证的是生产者本地事务与消息发布之间的最终一致，**不保证消费者业务自动成功，更不等于端到端恰好一次**；下游仍需重试、幂等和补偿。[RocketMQ 事务消息说明](https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/)

## 先建立产品地图

| 维度 | RabbitMQ | Kafka | RocketMQ |
| --- | --- | --- | --- |
| 典型优势 | Exchange 路由灵活、协议生态成熟 | 高吞吐分区日志、事件回放 | 顺序、延迟、事务、重试等业务消息能力 |
| 常见场景 | 业务路由、任务分发、系统集成 | 日志、埋点、流式数据平台 | 订单、交易、通知等业务事件 |
| 重点评估 | 队列与路由治理 | 分区、Lag、保留周期 | Topic/队列、消费组、事务和运维 |

先明确吞吐、端到端延迟、顺序范围、回放周期、路由、延迟、事务、团队经验和总成本，再通过接近真实负载的压测与故障演练选择。产品标签只能初筛，不能替代约束分析。

### 三套术语不要混用

| 需要表达的事实 | RabbitMQ | Kafka | RocketMQ |
| --- | --- | --- | --- |
| 消息分类/入口 | Exchange + Routing Key | Topic | Topic + Tag |
| 并行与局部顺序载体 | Queue | Partition | MessageQueue |
| 消费成功后的进度信号 | Consumer ACK | Offset | 消费进度/Offset |
| 多实例怎样分工 | 同一 Queue 上竞争消费 | Consumer Group 分配 Partition | Consumer Group 分配 MessageQueue |
| 历史消息怎样再次读取 | 普通 Queue 不是主模型；Stream 另论 | 保留期内重置 Offset | 按产品能力和保留边界重置/重放 |

面试中可以先用共同原理解释“为什么会丢、重、乱、积压”，再切换到产品术语。不要在 RabbitMQ 中说“提交 Offset”，也不要把 Kafka 的 `acks=all` 当成消费者业务 ACK。

## RabbitMQ：先看路由，再谈可靠性

以下内容以 **RabbitMQ 4.1、AMQP 0-9-1** 为版本边界。共同的幂等、顺序、积压和 Outbox 原理不再重复，这里只回答 RabbitMQ 独有的路由、确认和队列模型。

### 1. 消息怎样从生产者走到消费者？ ⭐

**直接回答：** Producer 把消息和 Routing Key 发给 Exchange，Exchange 根据类型和 Binding 路由到一个或多个 Queue，Broker 再把 Queue 中的消息投递给 Consumer。Connection 是 TCP 连接，Channel 是连接上的轻量逻辑通道。

![RabbitMQ 消息从生产者经 Exchange、Binding 路由到队列并完成两段确认的流程](/.image/interview/middleware/mq/rabbitmq-routing-confirm.svg)

**大白话：** Exchange 是分拣台，Routing Key 是包裹标签，Binding 是分拣规则，Queue 才是存放包裹的货架。

**易错边界：** 消息到达 Exchange 不等于进入 Queue。没有 Binding 匹配时，它可能成为不可路由消息；关键消息要结合 `mandatory` 和 Return 回调发现这种情况。

### 2. 四种 Exchange 怎样区分？

| 类型 | 匹配方式 | 典型场景 |
| --- | --- | --- |
| direct | Routing Key 与 Binding Key 精确匹配 | 指定业务类型，如 `order.paid` |
| fanout | 忽略 Routing Key，广播给所有绑定队列 | 同一事件通知多个系统 |
| topic | `*` 匹配一段，`#` 匹配零到多段 | `order.*.created` 等分层路由 |
| headers | 根据消息头键值匹配 | 路由条件不适合写成字符串层级 |

**大白话：** direct 是门牌号完全相等，fanout 是全楼广播，topic 是通配门牌，headers 是检查包裹属性。

### 3. Publisher Confirm 和消费者 ACK 有什么区别？ ⭐

**直接回答：** Publisher Confirm 是 Broker 给生产者的发布确认；Consumer ACK 是消费者处理完成后给 Broker 的确认。两者方向相反、发生在不同阶段，任何一个都不能证明另一段已经成功。

**大白话：** Confirm 表示“仓库接住了”，Consumer ACK 表示“收件人办完了”。仓库接货不等于收件人已经处理。

**易错边界：** 不可路由消息也可能收到 Confirm，因此还要检查 Return；Confirm 超时表示结果未知，重发必须复用稳定事件 ID。

### 4. ACK、NACK、Reject、Requeue 和 Prefetch 怎样配合？ ⭐

- `basic.ack`：业务成功，可以删除这次投递。
- `basic.reject`：拒绝单条消息；`basic.nack` 还能批量拒绝。
- `requeue=true`：重新排队；`false`：按配置进入 DLX，否则丢弃。
- Prefetch：限制消费者手中“已投递但未 ACK”的消息数。

**大白话：** 消费者一次只领自己吃得下的任务；办完才签收，临时失败稍后重试，永久失败转异常队列。

**易错边界：** 永久错误持续 `requeue=true` 会形成热循环；Prefetch 过大只会让单个消费者囤积任务，不代表处理更快。

### 5. DLX、TTL 和延迟重试是什么关系？

消息因拒绝且不重新入队、过期或超过队列长度等原因，可以被重新发布到 Dead Letter Exchange，再路由到重试队列或异常队列。常见延迟方案是“TTL 等待队列 + DLX”，消息到期后再进入真正的消费队列。

**大白话：** 暂时失败的任务先去候车室，到时间再回来；超过次数或确定无法处理的任务进入人工异常清单。

**易错边界：** 同一队列混放不同 TTL 时，队头的长 TTL 消息可能挡住后面的短 TTL 消息。DLQ 必须有告警、责任人、失败原因和受控重放，不能只是“存起来”。

### 6. Classic Queue、Quorum Queue 和 Stream 怎样选？ ⭐

| 类型 | 核心模型 | 更适合 | 主要边界 |
| --- | --- | --- | --- |
| Classic Queue | 传统任务队列 | 可接受较弱故障保护的普通任务 | 多节点集群不代表消息自动有副本 |
| Quorum Queue | 基于 Raft 的复制队列 | 关键业务消息 | 多数副本不可用时停止服务，成本更高 |
| Stream | 按保留策略保存的追加日志 | 大吞吐、历史回放 | 使用方式更接近日志流 |

RabbitMQ 4.0 已移除经典镜像队列能力，旧答案中的 mirrored classic queue 不能当作 4.x 高可用方案。

### RabbitMQ 30 秒表达

“RabbitMQ 的核心是先路由、后排队。Producer 把消息发到 Exchange，Exchange 根据 Routing Key 和 Binding 分到 Queue；生产端用 Publisher Confirm 与 `mandatory` 分别观察 Broker 接收和不可路由，消费端在业务成功后手动 ACK。关键消息通常使用持久化配置和 Quorum Queue，但故障窗口仍会带来重复，所以消费端必须幂等，失败进入有限重试、DLX 和人工处理。”

## Kafka：把消息队列看成可回放日志

以下内容以 **Apache Kafka 4.1** 为版本边界。不要套用 RabbitMQ 的“任务被领取后删除”模型：Kafka 的核心是按保留策略保存的分区追加日志。

### 1. Topic、Partition、Consumer Group 和 Offset 是什么？ ⭐

**直接回答：** Topic 是事件类别，Partition 是并行和局部顺序的分片，Broker 保存分区日志，Replica 提供副本；同一 Consumer Group 内的消费者分担 Partition，每个组用 Offset 保存自己下一次从哪里读取。

![Kafka 按业务键写入分区、副本复制并由不同消费组维护各自 Offset 的流程](/.image/interview/middleware/mq/kafka-partition-consumer-group.svg)

**大白话：** Topic 是一套账本，Partition 是分册，Broker 是书架，Offset 是书签，Consumer Group 是共同读完这套账的团队。不同团队有各自的书签。

**易错边界：** 同一传统 Consumer Group 内，一个 Partition 同一时刻通常只交给一个消费者；消费者数超过 Partition 数，多出来的消费者通常空闲。

### 2. Kafka 为什么吞吐高？

它不是只靠“顺序写”，而是 Partition 并行、追加日志、批量发送与拉取、批次压缩、页缓存和批量网络传输共同作用。

**大白话：** 不为每张纸单独派车，而是压成一批，沿多条车道整车运输。

**易错边界：** `batch.size`、`linger.ms`、压缩和 Fetch 大小都在交换吞吐、延迟、CPU 与内存，最终值必须压测。

### 3. Partition 怎样决定并行度和顺序？ ⭐

同一订单需要有序时，用稳定的订单 ID 作为 Key，让同 Key 记录进入同一 Partition；不同 Partition 可以并行，但没有全局顺序。

**易错边界：** 增加 Partition 可能改变 Key 的映射；消费者再把记录交给无序线程池，也会打乱完成顺序。要求全局顺序通常意味着单 Partition，并牺牲吞吐。

### 4. `acks`、ISR、HW 和 LEO 怎样串起来？ ⭐

- `acks=0`：Producer 不等待 Broker 确认。
- `acks=1`：Leader 写入本地日志后确认。
- `acks=all`：等待当前 ISR 满足复制确认条件。
- ISR：当前保持同步资格的副本集合；LEO 是各副本日志末端位置；HW 是普通消费者可见的已提交边界。

关键消息通常组合 `acks=all`、合适的副本因子、`min.insync.replicas` 和禁用非同步副本选主。

**易错边界：** `acks=all` 不是等待配置中的所有 Replica，也不等于任何故障下零丢失；提高最小同步副本数，会在故障时更倾向拒绝写入，这是可靠性与可用性的交换。

### 5. Offset 为什么既可能重复，也可能漏处理？ ⭐

- 先完成数据库业务、后提交 Offset：中间宕机会从旧位置重读，可能重复。
- 先提交 Offset、后处理业务：中间失败会从新位置继续，可能漏处理。

关键业务通常选择前者，再用事件唯一键、条件更新或下游幂等号保证重复消息只产生一次业务效果。

**大白话：** 宁可一张工单再看一次，也不要把没办的工单标成已办；但再看一次不能重复扣款。

### 6. Rebalance 为什么会暂停或重复？ ⭐

消费组成员加入、离开、失效或订阅的 Partition 变化时，需要重新分配。撤销和接管期间可能暂停；旧消费者业务已成功但 Offset 尚未提交时，新消费者会重复处理。

降低影响要从缩短单批处理、合理设置超时、静态成员、合作式分配和优雅停机入手。不要把所有停顿都归因于 Rebalance，还要检查 GC、网络、Broker 和下游耗时。

### 7. 幂等 Producer、Kafka 事务和业务幂等各管哪一段？ ⭐

幂等 Producer 避免同一生产者会话中的协议级重试在日志里重复写入；Kafka 事务可以把多条 Kafka 写入以及消费 Offset 提交纳入一个原子结果，`read_committed` 消费者只读已提交事务记录。

**易错边界：** Kafka 事务不会自动包含 MySQL、HTTP、短信和人工操作。应用重新构造的同一业务事件也不一定被 Producer 幂等识别，跨系统仍需要业务幂等、Outbox 或补偿。

### 8. 为什么消费后还能回放？Kafka 4.x 还依赖 ZooKeeper 吗？

Kafka 按时间、容量或 Log Compaction 等策略保留数据，消费组移动 Offset 不会删除日志，因此保留窗口内可以重置 Offset 重放。Partition 的日志切成 Segment，并使用稀疏索引帮助定位。

Kafka 4.0 起只支持 KRaft 模式，元数据由 Kafka Controller Quorum 管理；ZooKeeper 属于旧版本架构和迁移历史。

**易错边界：** 可回放不等于永久保存，超过保留窗口的数据无法靠重置 Offset 找回；Compaction 也是后台渐进过程，不保证任意时刻每个 Key 只剩一条物理记录。

### Kafka 30 秒表达

“Kafka 的核心是可保留的分区追加日志。Producer 按 Key 选择 Partition，Partition 提供局部顺序和并行度；副本、ISR、`acks=all` 与 `min.insync.replicas` 共同决定确认边界。Consumer Group 让组内成员分担 Partition，每个组独立维护 Offset，所以能够回放。Offset 与外部数据库不能天然原子提交，工程上通常采用至少一次加业务幂等；Exactly Once 必须说明只覆盖哪些 Kafka 写入和 Offset。”

## 产品选型是约束匹配

先问业务主要是在“分发任务”，还是在“保存事件流”，再比较路由、回放、吞吐、顺序、延迟和团队运维能力。

| 业务约束 | 更自然的选择 | 原因 |
| --- | --- | --- |
| 多种 Routing Key、广播和通配规则 | RabbitMQ | Exchange + Binding 的路由表达直接 |
| 一个任务通常只由一名消费者完成 | RabbitMQ | Queue 的竞争消费模型自然 |
| 多个系统要独立读取同一份历史事件 | Kafka | Consumer Group 各自维护 Offset |
| 日志、埋点、CDC、流式处理和历史回放 | Kafka | 分区日志与批量吞吐是主模型 |
| 订单通知等普通业务事件 | 两者都可以 | 再比较规模、回放、路由和团队成本 |
| 需要事务消息、定时消息等开箱即用业务能力 | 可评估 RocketMQ | 仍要验证版本、故障边界和运维条件 |

**不要这样答：** “RabbitMQ 可靠、Kafka 吞吐高。”两者都能通过不同配置提高可靠性，也都要在吞吐、延迟、可用性和成本之间取舍。正确回答应先给场景约束，再说明哪种主模型更匹配。

## 验证与证伪

- 在消费者数据库提交后、ACK 前强制终止进程，验证消息会重投且幂等约束阻止重复生效。
- 让生产者发送超时后查询 Broker 或业务事件记录，证伪“超时等于未发送”。
- 暂停消费者并持续生产，观察 Lag 和最老消息年龄；恢复时限制消费速率，验证队列只能缓冲峰值而不能创造下游容量。
- 在 Outbox 消息发送成功、`markSent` 前注入故障，验证事件会重复发送，消费者幂等仍不可删除。
- 让事务消息二阶段响应丢失，验证 Broker 回查只能收敛生产者本地事务与消息发布，不能证明下游业务成功。
- 发送一个没有 Binding 匹配的 RabbitMQ 消息，对比是否启用 `mandatory` 时的返回结果，验证 Confirm 不等于进入目标 Queue。
- 让 Kafka 的 ISR 数低于 `min.insync.replicas`，验证 `acks=all` 的生产请求会失败，而不是在副本不足时继续承诺高可靠。
- 固定 Key 发送 Kafka 事件后增加 Partition，观察映射变化，证伪“同 Key 在扩容前后天然保持连续顺序”。

如果测试只覆盖正常路径，就不能支持“可靠消息”的结论；至少要覆盖发送不确定、消费重复、Broker/消费者重启和长期未收敛四类反例。

## 工程取舍与失败边界

- MQ 让调用链更松，但把即时一致换成了可观测、可恢复的最终一致流程。
- 同步刷盘、多副本和严格顺序通常提高可靠性或确定性，也会增加延迟、资源和运维成本。
- ACK 提前会丢处理机会，ACK 延后会产生重复窗口；关键业务通常选择后者并用幂等兜底。
- 无限重试会放大故障，死信无人治理会隐藏故障，盲目扩容可能先压垮下游。
- 任何“恰好一次”声明都必须写清覆盖边界；跨数据库、HTTP 和人工步骤时尤其如此。

## 理解自测与面试表达

下面保留原有问题标题以兼容旧链接。回答时先拆掉“用了 MQ 就可靠”等口号，从网络、节点和容量事实重新推导，再讲组件配置。

### 1. 为什么使用消息队列？它带来了什么代价？

检查点：时间、位置和速率解耦分别解决什么？同步结果为什么会变成最终一致？

### 2. 一条消息从生产到消费经历什么？

检查点：分别指出 Broker 接受、持久化、业务完成和进度确认的证据。

### 3. Topic、MessageQueue、Consumer Group 和 Broker 怎么理解？

检查点：不用产品术语时，如何描述分类、分片、共享进度和存储者？

### 4. 同步、异步和单向发送怎样选择？

检查点：三者改变了等待和确认方式，但为什么都不能解决数据库双写？

### 5. 怎样避免消息在生产端、Broker 和消费端丢失？

检查点：按三个故障边界说明证据、重试和恢复路径。

### 6. ACK、Offset 与重复消费是什么关系？

检查点：画出“业务成功、Offset 未提交”的故障窗口，并解释为什么不能提前 ACK。

### 7. 消费端怎样实现幂等？

检查点：事件 ID、唯一约束和业务更新为什么要处于同一事务？外部副作用怎么办？

### 8. 最多一次、至少一次和恰好一次有什么区别？

检查点：任何恰好一次声明都要追问哪些系统和副作用被包含在边界内。

### 9. 顺序消息如何实现？

检查点：为什么通常只保证业务键局部顺序？状态版本怎样抵抗迟到消息？

### 10. 消费失败后怎样设计重试？

检查点：怎样区分瞬时、永久和过载错误？为什么需要退避、上限和总超时？

### 11. 死信队列（DLQ）是什么？怎样安全重放？

检查点：重放前如何证明根因已修复、消费者幂等且旧消息仍有效？

### 12. 消息积压怎样排查？日常监控哪些指标？

检查点：从输入速率、输出速率、并行度和下游容量逐层定位。

### 13. 什么是 Rebalance？为什么会引发抖动或重复？

检查点：队列撤销、接管和进度提交之间有哪些不确定窗口？

### 14. RocketMQ 如何存储消息？Broker 高可用怎样理解？

检查点：CommitLog、ConsumeQueue、刷盘与副本分别解决什么，不解决什么？

### 15. 延迟消息适合哪些场景？

检查点：为什么“到期可见”不等于“准时执行”，执行前必须检查什么？

### 16. 本地事务与发消息怎样用 Outbox 保持一致？

检查点：Outbox 消除了哪个双写窗口，为什么仍会重复发送？

### 17. RocketMQ 事务消息与事务回查是什么？

检查点：Half Message、二阶段结果和本地事务记录怎样让未知状态最终收敛？

### 18. RabbitMQ、Kafka 和 RocketMQ 怎样选型？

检查点：先给业务约束、故障目标和运维条件，再说明产品匹配，不能只列标签；继续追问本章的 [RabbitMQ](#rabbitmq-先看路由-再谈可靠性) 与 [Kafka](#kafka-把消息队列看成可回放日志)。

### 30 秒表达骨架

“我不会从 MQ 产品能力开始，而从三个事实推导：网络会产生不确定结果，节点会独立失败，消费能力有上限。因此需要持久化中介、确认、进度、重试和幂等；工程上通常接受至少一次投递，再保证业务效果幂等，并为积压、死信和未收敛状态准备观测与补偿。”

### 3 分钟表达骨架

先用同步下单链路说明耦合和容量矛盾；画出消息七阶段生命周期；再解释 ACK 窗口为什么推导出至少一次加幂等；随后补充顺序、重试、DLQ、积压和 Rebalance；最后用 Outbox 或 RocketMQ 事务消息说明跨数据库与 MQ 的最终一致，以及它们为何不能提供下游端到端恰好一次。

## 参考资料

- [RabbitMQ 4.1：Exchanges](https://www.rabbitmq.com/docs/4.1/exchanges)
- [RabbitMQ：Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ 4.1：Dead Letter Exchanges](https://www.rabbitmq.com/docs/4.1/dlx)
- [RabbitMQ：Quorum Queues](https://www.rabbitmq.com/docs/quorum-queues)
- [Apache Kafka 4.1：Design](https://kafka.apache.org/41/design/design/)
- [Apache Kafka 4.1：Producer Configs](https://kafka.apache.org/41/configuration/producer-configs/)
- [Apache Kafka 4.1：Consumer Configs](https://kafka.apache.org/41/configuration/consumer-configs/)
- [Apache Kafka 4.1：KRaft 与 ZooKeeper](https://kafka.apache.org/41/getting-started/zk2kraft/)
- [RocketMQ 5.5.0 发布标签](https://github.com/apache/rocketmq/releases/tag/rocketmq-all-5.5.0)
- [RocketMQ：CommitLog](https://github.com/apache/rocketmq/blob/rocketmq-all-5.5.0/store/src/main/java/org/apache/rocketmq/store/CommitLog.java)
- [RocketMQ：并发消费服务](https://github.com/apache/rocketmq/blob/rocketmq-all-5.5.0/client/src/main/java/org/apache/rocketmq/client/impl/consumer/ConsumeMessageConcurrentlyService.java)
- [RocketMQ：事务消息](https://rocketmq.apache.org/docs/featureBehavior/04transactionmessage/)
- [RocketMQ：消费重试](https://rocketmq.apache.org/docs/featureBehavior/10consumerretrypolicy/)

---

[← 数据访问：MyBatis](../persistence/mybatis) · [下一层：分布式系统 →](../distributed/question)
