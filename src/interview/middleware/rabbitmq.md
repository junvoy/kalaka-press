---
outline: [2, 3]
---

# RabbitMQ 面试题：先看路由，再谈可靠性

RabbitMQ 最容易答混的地方，是把 Exchange、Queue、Publisher Confirm 和消费者 ACK 当成一件事。本章以 **RabbitMQ 4.1、AMQP 0-9-1** 为版本边界，先把一条消息怎样找到队列讲清楚，再回答可靠投递、重试、顺序和高可用。

> 阅读建议：先掌握带 ⭐ 的高频题。每题按“直接回答 → 大白话 → 易错边界”组织，先形成能说出口的答案，再补机制。

## 目标：解决灵活路由下的任务交付

设想订单创建后，库存服务只关心扣库存，通知服务关心所有订单事件，风控服务只关心特定地区的高风险订单。真正的问题不是“怎样用 RabbitMQ”，而是：一条事件怎样按规则进入一个或多个队列；消费者暂时离线时消息怎样保留；任一节点失败后怎样知道责任交到了哪一步。

必须保护四个结果：

- 消息只有进入目标队列，才算完成路由；到达 Exchange 但没有匹配队列仍可能被丢弃。
- 关键消息被 Broker 接受后要有可恢复副本，不能把“durable”误解成完整可靠性方案。
- 消费者只有在业务成功后才能确认，失败消息必须进入有限重试、死信或人工处理流程。
- 重投可能发生，业务效果必须幂等。

## 拆掉三个常见误解

| 常见说法 | 问题在哪里 | 正确追问 |
| --- | --- | --- |
| “Producer 把消息发到 Queue” | AMQP 0-9-1 的生产者通常先发给 Exchange | Exchange 用什么规则把消息路由到哪些 Queue？ |
| “收到 Publisher Confirm 就消费成功了” | Confirm 不知道消费者是否处理 | 它只确认生产者到 Broker 的哪一段？ |
| “队列 durable、消息 persistent 就绝不丢” | 单节点故障、未收到 Confirm、错误路由仍需处理 | 是否使用 Confirm、Quorum Queue 和不可路由检测？ |

## 从基本事实重新构造 RabbitMQ 模型

RabbitMQ 把“接收消息”和“保存消息”拆开：Exchange 负责匹配规则，Queue 负责保存并向消费者投递，Binding 把两者连接起来，Routing Key 是生产者附带的路由信息。

![RabbitMQ 消息从生产者经 Exchange、Binding 路由到队列并完成两段确认的流程](/.image/interview/middleware/mq/rabbitmq-routing-confirm.svg)

大白话理解：Exchange 像分拣台，Routing Key 像包裹标签，Binding 像分拣规则，Queue 才是等待领取的货架。Publisher Confirm 是分拣中心告诉寄件人“我接住了”，消费者 ACK 是收件人告诉分拣中心“我处理完了”；这两张回执互相不知道对方的状态。

## RabbitMQ 高频面试题

### ⭐ 1. RabbitMQ 的核心组件是什么？消息怎样流转？

**直接回答：** 生产者把消息和 Routing Key 发布到 Exchange；Exchange 根据类型和 Binding 把消息路由到一个或多个 Queue；Broker 再把 Queue 中的消息投递给消费者。Connection 是 TCP 连接，Channel 是其上的轻量逻辑通道，大多数 AMQP 操作都在 Channel 中完成。

**大白话：** 先分拣，再排队，最后领取。Exchange 不长期保存普通队列消息，Queue 才承担排队。

**易错边界：** 消息到达 Exchange 不等于进入 Queue。没有匹配 Binding 时，消息可能成为不可路由消息；关键发布要结合 `mandatory` 返回和 Publisher Confirm 观察。

### ⭐ 2. direct、fanout、topic、headers Exchange 有什么区别？

**直接回答：**

| Exchange | 匹配依据 | 典型场景 |
| --- | --- | --- |
| direct | Routing Key 与 Binding Key 精确匹配 | 按业务类型投递，如 `order.paid` |
| fanout | 忽略 Routing Key，广播到所有绑定队列 | 同一事件通知多个独立系统 |
| topic | Routing Key 按点分词，`*` 匹配一段，`#` 匹配零到多段 | `order.*.created` 等分层规则 |
| headers | 根据消息头键值匹配 | 路由条件不适合表达成字符串层级时 |

**大白话：** direct 是“门牌号完全相等”，fanout 是“全楼广播”，topic 是“按门牌通配”，headers 是“看包裹属性”。

**易错边界：** Exchange 类型在声明后不能随意改；绑定过多和过度复杂的 topic 规则会增加治理难度。默认 Exchange 是一个特殊 direct exchange，队列声明时会自动用队列名作为 Routing Key 绑定。

### ⭐ 3. RabbitMQ 怎样尽量避免消息丢失？

**直接回答：** 要按三段分别保护：

1. 生产者开启 Publisher Confirm，处理 NACK、超时和不可路由返回；重发使用稳定事件 ID。
2. Exchange、Queue 声明为 durable，关键消息标记 persistent；需要节点故障容忍时使用 Quorum Queue，并确认已经形成法定副本数。
3. 消费者关闭自动 ACK，在本地事务成功后手动 ACK；失败按类型 NACK、有限重试或进入死信流程。

**大白话：** 发件人要收“仓库已接货”的回执，仓库要有可靠库存，收件人办完业务后再签收。少一段，都只能证明局部成功。

**易错边界：** Confirm 超时表示结果未知，不等于 Broker 一定没收到；直接重发可能重复。durable 保护定义元数据，persistent 描述消息持久性，Quorum Queue 才进一步处理多节点复制；三者不能互相替代。

### ⭐ 4. Publisher Confirm 和消费者 ACK 有什么区别？

**直接回答：** Publisher Confirm 是 Broker 对生产者发布的确认；消费者 ACK 是消费者对某次投递的确认。两者方向相反、彼此独立。对持久消息和 durable queue，Confirm 的返回时机与队列类型及持久化条件有关；消费者 ACK 只应在应用完成所需处理之后发送。

**大白话：** 前一张回执说“仓库接管了包裹”，后一张回执说“收件人办完了事情”。仓库接货不代表收件人已签收。

**易错边界：** 不可路由消息也可能得到 Confirm，因为 Exchange 已完成发布处理；要用 `mandatory` 和 Return 回调发现“没有进入任何目标队列”。Confirm 回调可能批量、异步到达，不能把回调顺序当作业务顺序。

### ⭐ 5. ACK、NACK、Reject 和 Requeue 怎样选择？

**直接回答：**

- `basic.ack`：处理成功，Broker 可以删除该投递对应的消息。
- `basic.reject`：拒绝单条消息，选择重新入队或丢弃/死信。
- `basic.nack`：RabbitMQ 对 AMQP 0-9-1 的扩展，可一次拒绝多条，也可选择重新入队。
- `requeue=true`：消息重新排队；`false`：按配置进入 DLX，否则丢弃。

**大白话：** ACK 是“办完了”，NACK/Reject 是“这次办不了”；Requeue 决定“马上重新排队”还是“转异常处理”。

**易错边界：** 永久错误若一直 `requeue=true`，会形成热循环并打满 CPU 与网络。业务成功后、ACK 到达前宕机会造成重复投递，所以消费者仍要幂等。Delivery Tag 只在所属 Channel 内有效，不能跨 Channel 确认。

### ⭐ 6. Prefetch 解决什么问题？是不是越大越好？

**直接回答：** Prefetch 限制一个消费者同时持有多少条“已投递但未 ACK”的消息，用来控制在途消息和消费者压力。值太小会让消费者等消息，值太大则会造成单个消费者囤积、内存升高、负载不均和故障后大量重投。

**大白话：** 一次只从仓库领自己吃得下的工作。领一万件并不代表处理更快，只是别人暂时拿不到。

**易错边界：** 合理值取决于单条处理耗时、并发模型、消息大小和目标延迟，需要压测。扩消费者之前还要检查下游数据库或接口是否有余量。

### ⭐ 7. RabbitMQ 怎样设计重试和死信队列？

**直接回答：** 先区分瞬时错误、永久错误和系统过载。瞬时错误进入带退避和次数上限的延迟重试；永久错误直接死信；过载错误先限流或熔断。消息因 `reject/nack(requeue=false)`、过期、超过队列长度等条件可被投递到 Dead Letter Exchange，再由路由规则进入异常队列。

**大白话：** 临时网络抖动可以稍后再办，参数错误重试一百次也不会好，下游已经过载时立即重试只会继续添堵。

**易错边界：** DLX 是一次新的内部发布，默认死信转发并非所有队列类型下都提供同等安全保证。死信队列必须有告警、责任人、失败原因和受控重放，不能只负责“存起来”。

### 8. TTL + DLX 为什么能做延迟消息？有什么坑？

**直接回答：** 消息先进入设置 TTL 且绑定 DLX 的等待队列；到期后被死信路由到真正消费队列。它适合精度要求不高的有限档位延迟任务。

**大白话：** 先把任务放在候车室，到期后再转到办理大厅。

**易错边界：** 过期消息通常在到达队头时才会被真正丢弃或死信。若同一队列混放不同过期时间，前面的长 TTL 消息可能挡住后面的短 TTL 消息。执行关单等业务前仍要读取最新状态，不能把“到期可投递”当作“准时且必然执行”。

### ⭐ 9. Classic Queue、Quorum Queue 和 Stream 怎样选？

**直接回答：**

| 类型 | 核心模型 | 更适合 | 主要边界 |
| --- | --- | --- | --- |
| Classic Queue | 传统队列 | 非复制或可接受较弱故障保护的普通任务 | 不等于多副本高可用 |
| Quorum Queue | 基于 Raft 的复制队列 | 关键业务消息与节点故障容忍 | 多数副本不可用时停止服务，资源成本更高 |
| Stream | 追加日志、按保留策略保存 | 大吞吐、历史回放、多个消费者各自读取 | 语义和客户端使用方式更接近日志流 |

**大白话：** Classic 像普通取件队列，Quorum 像多仓库共同记账，Stream 像可按位置反复读取的流水账。

**易错边界：** RabbitMQ 4.0 已移除经典镜像队列能力，旧面试答案中的 mirrored classic queue 不能当成 4.x 方案。集群有多个节点也不代表每条 Queue 自动拥有副本。

### ⭐ 10. RabbitMQ 能保证消息顺序吗？

**直接回答：** 在单一发布 Channel、单一 Exchange、单一 Queue 和单一消费通道等约束下，可以讨论投递顺序；但多生产者、多消费者、重新入队和异步业务处理都可能让“完成顺序”不同于“入队顺序”。强顺序场景可按业务键拆队列，并考虑 Single Active Consumer 或应用状态版本。

**大白话：** 排队顺序不等于办结顺序。三个窗口同时办业务时，后领取的人可能先办完。

**易错边界：** 为了全局顺序只保留一个消费者，会牺牲吞吐和可用性。大多数订单场景真正需要的是同一订单的状态不能倒退，可用业务键和状态机保护。

### 11. RabbitMQ 集群怎样理解？为什么“多节点”不等于“消息有副本”？

**直接回答：** RabbitMQ 集群共享拓扑等元数据，但消息是否复制由队列类型决定。Quorum Queue 和 Stream 有自己的副本与 Leader；普通 Classic Queue 不能因为集群节点数增加就自动获得等价的消息副本保护。

**大白话：** 多开几家仓库，只能说明它们属于同一家公司；某件货是否在多地备份，要看这条队列自己的复制规则。

**易错边界：** 高可用还受节点数、故障域、法定多数、磁盘和客户端重连影响。三节点 Quorum Queue 通常只能容忍少数副本故障；失去多数派时，停服务比脑裂写入更安全。

### ⭐ 12. RabbitMQ 消息积压怎样排查？

**直接回答：** 先看 Queue 的 Ready、Unacked、入队/确认速率、最老消息年龄和 Consumer Capacity，再分层定位：

1. Ready 持续涨：消费总速率小于生产速率，或没有有效消费者。
2. Unacked 很高：消费者拿走但处理/确认慢，检查 Prefetch、线程池和下游耗时。
3. 反复 Redelivered：消费失败或连接不稳定，检查异常类型和重试循环。
4. 单队列热点：Routing Key 或队列拆分不合理。

**大白话：** Ready 是仓库里没人领的货，Unacked 是已经领走但还没签收的货。两者高，排查方向完全不同。

**易错边界：** 盲目加消费者可能把数据库压垮；扩容后应同时观察 MQ 出队速率、下游 P95/P99 延迟和错误率。

### 13. RabbitMQ 和 Kafka 到底怎样选？

**直接回答：** RabbitMQ 更擅长 AMQP 路由、单条任务投递、低延迟业务协作和明确的 ACK/DLX 流程；Kafka 更擅长分区日志、高吞吐、较长时间保留与按 Offset 回放。若核心问题是“这条任务交给谁处理”，优先评估 RabbitMQ；若核心问题是“这条事件流要被多套系统长期、独立读取”，优先评估 Kafka。

**大白话：** RabbitMQ 更像智能分拣中心，Kafka 更像多人各自记录阅读位置的事件流水账。

**易错边界：** 两者能力有重叠，不能只按产品标签拍板。必须把吞吐、延迟、路由复杂度、保留/回放、顺序范围、故障目标和团队运维经验放进同一张约束表。详见 [Kafka 面试题](./kafka) 和 [MQ 共同原理](./mq)。

## 最小 Java 代码：两段确认不能少

下面用 RabbitMQ Java Client 的 API 说明边界，省略连接池、序列化和异常分类。逐条 `waitForConfirmsOrDie` 便于看清语义，但吞吐较低；生产环境通常使用异步 Confirm 或批量等待。

```java
channel.confirmSelect();
channel.basicPublish(
    "order.exchange",
    "order.created",
    true, // mandatory：不可路由时返回给生产者
    MessageProperties.PERSISTENT_TEXT_PLAIN,
    body
);
channel.waitForConfirmsOrDie(5_000); // 只确认发布到 Broker 的阶段

DeliverCallback callback = (consumerTag, delivery) -> {
    long tag = delivery.getEnvelope().getDeliveryTag();
    try {
        orderApplicationService.handle(delivery.getBody());
        channel.basicAck(tag, false); // 业务成功后再确认
    } catch (RetryableException ex) {
        channel.basicNack(tag, false, false); // 交给 DLX/延迟重试
    }
};
channel.basicConsume("order.created.q", false, callback, tag -> {});
```

真实项目还需要稳定事件 ID、消费幂等、Return/Confirm 回调映射、超时后的不确定状态处理，以及 Channel 的并发使用边界。

## 版本实现与源码入口

以下入口用于验证稳定机制，不要求逐行背源码：

- [`rabbit_channel.erl`（RabbitMQ 4.1.0）](https://github.com/rabbitmq/rabbitmq-server/blob/v4.1.0/deps/rabbit/src/rabbit_channel.erl)：观察 Basic.Publish、Confirm 和 ACK 等协议命令怎样进入 Broker 处理。
- [`rabbit_exchange_type_direct.erl`（RabbitMQ 4.1.0）](https://github.com/rabbitmq/rabbitmq-server/blob/v4.1.0/deps/rabbit/src/rabbit_exchange_type_direct.erl)：验证 direct exchange 根据 Routing Key 查询绑定目标。
- [`rabbit_quorum_queue.erl`（RabbitMQ 4.1.0）](https://github.com/rabbitmq/rabbitmq-server/blob/v4.1.0/deps/rabbit/src/rabbit_quorum_queue.erl)：观察 Quorum Queue 的声明、投递与确认入口。

源码目录会随版本调整；面试时先说稳定语义，再补“我查看的是 4.1.0 实现”。

## 验证与证伪

- 发布一条没有任何 Binding 能匹配的消息，分别关闭和开启 `mandatory`，验证“Confirm 成功不等于进入目标 Queue”。
- 在数据库事务提交后、ACK 前终止消费者，验证消息重新投递且业务唯一约束阻止重复生效。
- 把 Prefetch 从小到大逐级调整，同时观察吞吐、Unacked、内存和处理延迟，证伪“越大越快”。
- 暂停 Quorum Queue 的多数副本，验证系统拒绝继续正常写入，而不是声称任意节点故障都可用。

## 30 秒面试表达

“RabbitMQ 的关键是先分清路由和确认。生产者把消息发到 Exchange，Exchange 根据 Routing Key 与 Binding 路由到 Queue；生产端用 Publisher Confirm 和 mandatory 处理 Broker 接收与不可路由，Broker 侧用 durable、persistent 和 Quorum Queue 保护存储，消费端在业务成功后手动 ACK。因为 ACK 前后都有故障窗口，所以关键业务仍按至少一次投递设计，消费端必须幂等，失败进入有限重试、DLX 和人工补偿。”

## 参考资料

- [RabbitMQ 4.1：Exchanges](https://www.rabbitmq.com/docs/4.1/exchanges)
- [RabbitMQ：Consumer Acknowledgements and Publisher Confirms](https://www.rabbitmq.com/docs/confirms)
- [RabbitMQ 4.1：Dead Letter Exchanges](https://www.rabbitmq.com/docs/4.1/dlx)
- [RabbitMQ 4.1：TTL](https://www.rabbitmq.com/docs/4.1/ttl)
- [RabbitMQ：Quorum Queues](https://www.rabbitmq.com/docs/quorum-queues)
- [RabbitMQ 4.1：Streams](https://www.rabbitmq.com/docs/4.1/streams)
- [AMQP 0-9-1 Specification](https://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf)

---

[← MQ 共同原理](./mq) · [Kafka 面试题 →](./kafka)
