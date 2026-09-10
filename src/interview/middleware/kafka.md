---
outline: [2, 3]
---

# Kafka 面试题：把消息队列看成可回放日志

Kafka 最容易答错的地方，是套用 RabbitMQ 的“消息被消费者取走后删除”模型。本章以 **Apache Kafka 4.1** 为版本边界，从追加日志、Partition 和 Offset 推导吞吐、顺序、副本、Rebalance 与 Exactly Once 的真实边界。

> 阅读建议：先掌握带 ⭐ 的高频题。每题按“直接回答 → 大白话 → 易错边界”组织；看到 `acks` 时想生产端，看到 Offset 时想消费进度，不要把两者混为一种 ACK。

## 目标：让多套系统独立读取同一条事件流

设想订单事件既要驱动履约，也要进入实时风控、数据仓库和审计系统。各系统处理速度、上线时间和重放需求不同。真正目标是：事件按可扩展的顺序日志保存；多个消费组各自维护位置；单个 Broker 故障时已提交数据仍可用；消费者可以从已知位置恢复或重放。

必须保护四个结果：

- 同一业务键需要顺序时，要稳定进入同一 Partition。
- 已确认消息的可靠性由 `acks`、ISR 和 `min.insync.replicas` 共同决定，不能只背一个参数。
- Offset 只表示消费组准备从哪里继续，不自动代表数据库业务成功。
- 重试、Rebalance 和超时可能重复处理，外部业务仍需幂等。

## 拆掉三个常见误解

| 常见说法 | 问题在哪里 | 正确理解 |
| --- | --- | --- |
| “Kafka 消费后消息就没了” | 数据删除主要由保留策略决定 | 消费组只推进自己的 Offset，其他组仍可读取 |
| “一个 Topic 全局有序” | 顺序边界是 Partition | 跨 Partition 没有统一总顺序 |
| “Kafka Exactly Once 保证数据库也只写一次” | Kafka 事务有明确系统边界 | Kafka 内读-处理-写可原子协调，外部副作用需另行设计 |

## 从基本事实重新构造 Kafka 模型

如果事件需要长期保存和重复读取，就不能在某个消费者成功后立刻删除。Kafka 把 Topic 拆成多个有序 Partition，每个 Partition 是只追加的日志；记录带 Offset，消费组为每个 Partition 保存下一次读取位置。副本保护日志，Consumer Group 分配读取工作。

![Kafka 按业务键写入分区、副本复制并由不同消费组维护各自 Offset 的流程](/.image/interview/middleware/mq/kafka-partition-consumer-group.svg)

大白话理解：Kafka 像一本分册的流水账。Partition 是不同分册，Offset 是页码，Consumer Group 是一支阅读团队。两支团队可以读同一本账，各自保存书签；同一团队里，一本分册在同一时刻通常只交给一名成员。

## Kafka 高频面试题

### ⭐ 1. Kafka 的核心组件是什么？

**直接回答：** Topic 是逻辑事件类别，Partition 是并行和顺序的物理分片，Broker 保存分区日志，Replica 提供副本，Producer 选择 Partition 写入，Consumer Group 让组内消费者分担分区，Offset 表示某消费组在某分区的读取位置。

**大白话：** Topic 是一套书，Partition 是分册，Broker 是书架，Replica 是备份本，Offset 是书签，消费组是一支共同读完这套书的团队。

**易错边界：** 同一 Partition 在同一传统 Consumer Group 内同一时刻只分配给一个消费者；消费者数大于 Partition 数时，多出的消费者通常空闲。Kafka 4.1 预览的 Share Group 是另一套语义，普通面试回答不要混入稳定的 Consumer Group 规则。

### ⭐ 2. Kafka 和 RabbitMQ 的模型差异是什么？

**直接回答：** Kafka 以可保留、可回放的分区日志为核心，消费者主动拉取并维护 Offset；RabbitMQ 以 Exchange 路由到 Queue、Broker 投递和逐条确认更为典型。Kafka 的同一份日志可以被多个消费组独立读取，RabbitMQ 同一 Queue 内的消费者通常竞争处理消息。

**大白话：** Kafka 是“大家各自记书签读流水账”，RabbitMQ 是“分拣后的任务由队伍中的一个人领走”。

**易错边界：** Kafka 也能做业务事件，RabbitMQ Stream 也能保留和回放。选型要看主模型和团队成本，不是说某产品绝对做不了另一类场景。详见 [RabbitMQ 面试题](./rabbitmq)。

### ⭐ 3. Kafka 为什么吞吐高？

**直接回答：** 关键不只是“顺序写”三个字，而是一组协同设计：Partition 允许并行；日志采用追加写；Producer 和 Consumer 使用批处理；批次可压缩并以压缩形式写入和传输；Consumer 拉取天然适合批量；文件与页缓存、批量网络传输减少小 I/O 和对象管理开销。

**大白话：** 与其每来一张纸就单独装车，Kafka 会把同一方向的一批纸压紧后整车运输，再按多条车道并行处理。

**易错边界：** `batch.size`、`linger.ms`、压缩和更大 Fetch 都是在延迟、内存、CPU 与吞吐之间交换，必须压测。不要死背“几次拷贝”；操作系统、TLS、压缩和客户端路径都会改变实际数据路径。

### ⭐ 4. Partition 有什么作用？怎样保证同一业务键有序？

**直接回答：** Partition 同时提供扩展单位、并行单位和局部顺序边界。需要同一订单有序时，用稳定的订单 ID 作为 Key，让同 Key 记录由分区器进入同一 Partition；Consumer 再按该 Partition 的记录顺序处理。

**大白话：** 同一订单的所有单据固定走同一条车道，车道内能排队；不同车道之间没有统一先后。

**易错边界：** 增加 Partition 会改变 Key 到 Partition 的映射，可能破坏变更前后的连续顺序。消费者若把记录扔进无序线程池，仍会打乱完成顺序。全局有序通常意味着单 Partition，会牺牲吞吐和可用性。

### ⭐ 5. `acks=0`、`1`、`all` 有什么区别？

**直接回答：**

- `acks=0`：Producer 不等待 Broker 确认，延迟低，但无法从响应判断是否写入。
- `acks=1`：Leader 写入本地日志后响应；若 Leader 在副本同步前永久故障，记录可能丢失。
- `acks=all`：等待当前 ISR 中副本完成规定的复制条件，是最强的可配置确认级别。

关键消息通常组合 `acks=all`、合适的副本因子、`min.insync.replicas` 和禁用非同步副本选主，并处理发送失败。

**大白话：** `0` 是寄出就走，`1` 是总仓签收，`all` 是当前合格备份组都完成接管后再回执。

**易错边界：** `acks=all` 不等于等待配置的所有 Replica，也不单独保证高可靠；若 ISR 已缩小且 `min.insync.replicas` 太低，确认仍可能只依赖很少副本。提高最小副本数会在故障时更倾向拒绝写入，是可靠性与可用性的交换。

### ⭐ 6. ISR、HW 和 LEO 怎样理解？

**直接回答：** ISR 是当前与 Leader 保持同步资格的副本集合；LEO 可理解为某副本日志的末端位置；HW 是消费者可见的已提交边界。Leader 只向普通消费者暴露已提交记录，副本落后超过条件会离开 ISR，追上后可重新加入。

**大白话：** LEO 是每个抄写员抄到哪一页，ISR 是仍跟得上的抄写员名单，HW 是目前可以放心给读者看的页码边界。

**易错边界：** 不要把“Follower 的 LEO 必须每时每刻等于 Leader”当作 ISR 定义；同步资格与时间窗口等配置有关。不同 Kafka 版本的复制细节会演进，面试先讲提交边界与故障目标。

### ⭐ 7. 幂等 Producer 和 Kafka 事务分别解决什么？

**直接回答：** 幂等 Producer 用 Producer ID、Partition 和序列信息，让同一生产者会话内的协议级重试不会在日志中写入重复记录。Kafka 事务则把多条、跨 Partition/Topic 的写入以及消费 Offset 的提交纳入一个原子结果；`read_committed` 消费者只读取已提交事务记录。

**大白话：** 幂等生产者解决“同一封信因为没收到回执而重发两遍”，事务解决“一组信要么都入账，要么都不对外可见”。

**易错边界：** 应用自己重新构造并发送一条业务相同的新消息，不一定被 Producer 幂等识别。Kafka 事务不会自动包含 MySQL、HTTP、短信等外部副作用；跨系统仍需业务幂等、Outbox 或补偿。Kafka 4.1 客户端默认会在没有冲突配置时启用幂等，但 `transactional.id` 仍需显式配置才能使用事务。

### ⭐ 8. 自动提交和手动提交 Offset 有什么区别？

**直接回答：** 自动提交按配置周期提交 `poll()` 返回记录对应的消费进度，代码简单，但提交时机可能与真实业务完成错位。手动提交允许应用在处理后调用同步或异步提交，更容易控制至少一次语义，但仍无法与外部数据库天然原子提交。

**大白话：** Offset 是书签。先夹书签再处理，宕机后可能跳过没办完的事；先办事再夹书签，宕机后可能从旧页重读。

**易错边界：** `commitSync()` 成功只表示 Kafka 记录了进度，不证明数据库事务成功。批量处理时不能在后面的记录成功后越过前面失败的记录随意提交连续 Offset。

### ⭐ 9. Kafka 为什么会重复消费或丢处理结果？

**直接回答：**

- 先处理业务、后提交 Offset：业务成功后若进程宕机，接管者从旧 Offset 重读，产生重复。
- 先提交 Offset、后处理业务：提交后若业务失败，接管者从新 Offset 开始，产生漏处理。

关键业务通常选择前者，并用事件 ID 唯一约束、状态条件更新或下游幂等号保证业务效果只生效一次。

**大白话：** 宁可同一张工单再看一次，也不要把没办的工单标成已办；但“再看一次”必须不会重复扣款。

**易错边界：** 只用一个会过期的 Redis Key 不能覆盖所有故障。幂等记录与数据库业务更新最好处在同一本地事务；外部副作用需要对方支持幂等键、结果查询或补偿。

### ⭐ 10. 什么是 Rebalance？什么时候触发？

**直接回答：** Rebalance 是 Consumer Group 重新分配 Topic Partition 的过程。成员加入、离开或失效，订阅 Topic/Partition 变化等都可能触发。分配期间会发生撤销与接管；若旧消费者业务已成功但 Offset 未提交，新消费者会重复处理。

**大白话：** 阅读团队有人进出时要重新分书。交接期间可能暂停，也可能把上一位读过但没记书签的页再读一次。

**易错边界：** 不要把所有消费停顿都归因于 Rebalance。还要检查长时间处理导致未及时 `poll()`、Stop-the-World、网络、Broker 和下游延迟。可通过合理的超时、缩短单批处理、静态成员、合作式分配和优雅停机降低无意义抖动。

### 11. Kafka 的消息消费后为什么还能重放？

**直接回答：** Kafka 的日志生命周期主要由时间/容量保留或 Log Compaction 等策略决定，不由某个消费组是否读过决定。消费组只保存自己的 Offset，因此可以重置 Offset 后从旧位置重读，其他消费组也有独立进度。

**大白话：** 读者移动书签不会撕掉书页；书什么时候清理，由图书馆的保留规则决定。

**易错边界：** 可重放不等于永远保留。超过保留窗口或已被清理的记录无法靠重置 Offset 找回。Compaction 保留每个 Key 的最新值取向，不等于普通按时间删除，也不保证只剩一条物理记录。

### 12. Kafka 怎样处理失败重试和“死信”？

**直接回答：** 传统 Consumer Group 的业务重试通常由应用设计：短暂错误可在当前处理内有限退避；较长重试可写入带重试次数和下一次时间的 Retry Topic；超过上限写入 DLQ Topic 并告警。重试记录要保留原 Topic、Partition、Offset、业务键、失败原因和追踪 ID。

**大白话：** Kafka 给你的是日志和位置，不会自动替每种业务决定“重试三次后去哪”。异常通道需要应用明确设计。

**易错边界：** 把失败记录发到 Retry Topic 后就提交原 Offset，会把可靠性责任转移到“发布重试消息”这一步；二者之间仍有双写窗口，需要 Kafka 事务或可恢复记录。重试跨 Topic 也可能改变原有顺序。

### ⭐ 13. Kafka 消息积压怎样排查？

**直接回答：** 先看每个 Consumer Group、Topic、Partition 的 Lag 和最老未处理记录年龄，再比较生产速率与消费速率。继续检查消费者存活、分区分配、Rebalance、单条处理时间、批量大小、反序列化/GC、热点 Partition，以及数据库和外部接口容量。

**大白话：** Lag 是书签离书尾还有多少页。总欠页数很大时，还要看是不是某一本分册特别慢，否则加人也可能帮不上忙。

**易错边界：** 同一组的有效并行度受 Partition 数限制；消费者数超过 Partition 数不会继续提升并行度。增加 Partition 可能影响 Key 映射和顺序，下游无余量时扩容消费者只会转移故障。

### 14. Segment、Index 和 Log Compaction 是什么？

**直接回答：** 一个 Partition 的日志会切成多个 Segment，便于按大小/时间滚动、清理和定位。Offset Index、Time Index 等稀疏索引帮助先定位 Segment 附近位置，再顺序扫描。Log Compaction 按 Key 保留最新值取向，适合重建状态；普通 Retention 则按时间或容量清理旧 Segment。

**大白话：** 一本无限增长的账拆成多册，目录只记每隔一段的大致页码；先查到附近，再往后翻。Compaction 像为每个账号保留较新的状态记录。

**易错边界：** 稀疏索引不需要为每条记录建一项。Compaction 是后台渐进过程，不能假设任意时刻同 Key 只存在一条记录；墓碑记录的保留也有时间边界。

### ⭐ 15. Kafka 4.x 为什么不能再回答“依赖 ZooKeeper”？

**直接回答：** Kafka 4.0 起只支持 KRaft 模式，集群元数据由 Kafka 自己的 Controller Quorum 管理；`--zookeeper` 等旧管理方式已经移除。ZooKeeper 是旧版本架构和迁移历史，不是 Kafka 4.x 的当前运行依赖。

**大白话：** 过去 Kafka 请外部管理员 ZooKeeper 管元数据，现在把这套管理账本收回到自己的 Controller 集群。

**易错边界：** 面试时先问版本。讨论 3.x 老集群迁移可以讲 ZooKeeper，但回答 4.x 架构仍从 ZooKeeper 开始，会暴露版本知识过时。

## 最小 Java 代码：先处理，后提交，仍需幂等

```java
try (KafkaConsumer<String, OrderCreated> consumer = new KafkaConsumer<>(props)) {
    consumer.subscribe(List.of("order-events"));

    while (true) {
        ConsumerRecords<String, OrderCreated> records = consumer.poll(Duration.ofSeconds(1));
        for (ConsumerRecord<String, OrderCreated> record : records) {
            orderApplicationService.handleIdempotently(
                record.value().eventId(),
                record.value()
            );
        }
        consumer.commitSync(); // 业务完成后提交；故障窗口仍可能导致重读
    }
}
```

这段代码展示至少一次的基本顺序，但生产代码还要处理批次中途失败、分区级 Offset、Rebalance 撤销回调、慢处理与 `max.poll.interval.ms` 的关系。若处理结果仍写回 Kafka，可评估 Kafka 事务把输出记录与输入 Offset 原子提交；写 MySQL 时仍需数据库幂等或 Outbox。

## 版本实现与源码入口

以下入口以 Kafka 4.1.0 为例，用于把面试术语对应到实现：

- [`KafkaProducer.java`](https://github.com/apache/kafka/blob/4.1.0/clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java)：观察发送、批处理、幂等和事务 API 的边界。
- [`KafkaConsumer.java`](https://github.com/apache/kafka/blob/4.1.0/clients/src/main/java/org/apache/kafka/clients/consumer/KafkaConsumer.java)：观察订阅、Poll、位置与 Offset 提交 API。
- [`UnifiedLog.scala`](https://github.com/apache/kafka/blob/4.1.0/core/src/main/scala/kafka/log/UnifiedLog.scala)：观察 Partition 日志追加、读取与 Segment 管理入口。
- [`ReplicaManager.scala`](https://github.com/apache/kafka/blob/4.1.0/core/src/main/scala/kafka/server/ReplicaManager.scala)：观察副本读写请求与分区状态管理入口。

源码内部类会演进；回答时先讲“分区追加日志、复制提交边界、消费位置”这些稳定原理，再声明查看的实现版本。

## 验证与证伪

- 固定 Key 连续发送事件，再增加 Partition，观察变更前后 Key 的分区映射，证伪“同 Key 永远自动保持跨扩容顺序”。
- 在数据库提交后、Offset 提交前终止消费者，验证记录重读且唯一约束阻止重复生效。
- 设置 `acks=all` 后让 ISR 数低于 `min.insync.replicas`，验证 Producer 收到写入错误而不是继续宣称“高可用等于永远可写”。
- 重置测试消费组 Offset，验证保留窗口内可重放；缩短 Retention 后再次验证，明确“可回放”受数据保留边界限制。

## 30 秒面试表达

“Kafka 的核心不是传统取走即删的队列，而是可保留的分区追加日志。Producer 按 Key 选 Partition，Partition 提供局部顺序和并行度；副本、ISR、`acks=all` 与 `min.insync.replicas` 共同决定已确认写入的故障边界。Consumer Group 让组内成员分担 Partition，每组用 Offset 保存自己的进度，所以能独立消费和回放。Offset 与外部数据库不能天然原子提交，工程上通常采用至少一次加业务幂等；Kafka Exactly Once 也必须说明只覆盖哪些 Kafka 写入和 Offset。”

## 参考资料

- [Apache Kafka 4.1：Design](https://kafka.apache.org/41/design/design/)
- [Apache Kafka 4.1：Producer Configs](https://kafka.apache.org/41/configuration/producer-configs/)
- [Apache Kafka 4.1：Consumer Configs](https://kafka.apache.org/41/configuration/consumer-configs/)
- [KafkaProducer 4.1.2 API](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/producer/KafkaProducer.html)
- [KafkaConsumer 4.1.2 API](https://kafka.apache.org/41/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html)
- [Apache Kafka 4.1：KRaft vs ZooKeeper](https://kafka.apache.org/41/getting-started/zk2kraft/)

---

[← RabbitMQ 面试题](./rabbitmq) · [MQ 共同原理 →](./mq)
