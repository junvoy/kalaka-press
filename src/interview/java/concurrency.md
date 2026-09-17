---
outline: [2, 3]
---

# Java 并发：共享状态怎样保持正确？

并发章只回答“多个执行单元共享数据时，怎样保证结果正确”。线程怎样创建、排队、取消和复用，放在[多线程与线程池](./multithreading)；集合类自身的结构放在[Java 集合](./collections)。

## 先建立选择顺序

1. 能不共享，就用局部变量、不可变对象、消息传递或数据分片消除共享。
2. 只发布一个独立状态，考虑 `volatile`；复合不变量需要锁或原子复合操作。
3. 冲突少、操作短时可以考虑 CAS；冲突多时要评估自旋浪费。
4. 需要超时、中断、多个条件队列时考虑 `Lock`；简单互斥先看 `synchronized`。
5. 选择并发工具后，再验证原子边界、可见性、过载和失败恢复。

## 内存模型与可见性

### 1. 什么是线程安全？

**直接回答：** 多个线程以允许的方式交错执行时，程序仍保持业务不变量，并且结果满足对外承诺，才叫线程安全。它不等于“用了并发集合”或“方法加了锁”。

```java
if (stock > 0) { // 检查
    stock--;     // 修改
}
```

即使单次读写本身原子，“检查后再修改”仍是复合操作；两个线程可能都看到库存大于 0。判断线程安全要先写出不变量，例如“库存不能小于 0”“同一订单只能扣款一次”，再确定哪一段必须原子执行。

### 2. Java 内存模型（JMM）解决什么问题？

**直接回答：** JMM 规定线程之间何时必须看见写入、哪些操作具有顺序关系，以及读写在什么条件下构成数据竞争。它屏蔽了处理器缓存、编译器优化和指令重排的差异，但不会自动让有竞争的代码正确。

并发常说的三个问题分别是：

- **原子性：** 一个操作是否会被中途观察到部分结果。
- **可见性：** 一个线程的写入何时对另一个线程可见。
- **有序性：** 编译器和处理器调整执行顺序后，是否仍满足允许的观察结果。

JMM 是语言层契约，不等于“主内存与工作内存就是某一级 CPU 缓存”的硬件图。

### 3. 什么是 happens-before？

**直接回答：** 如果操作 A happens-before 操作 B，那么 A 的效果必须对 B 可见，并且在 JMM 的顺序中位于 B 之前。它是可见性与顺序保证，不代表真实时间上两步紧挨着执行。

常用规则包括：程序次序、监视器解锁先于后续加锁、volatile 写先于后续读、线程 `start()` 与 `join()`，以及传递性。

![volatile 发布建立 happens-before 的过程](/.image/interview/java/concurrency/jmm-happens-before.svg)

```java
data = load();     // 普通写
ready = true;      // volatile 写

if (ready) {       // volatile 读
    use(data);     // 必须看见发布前的数据写入
}
```

### 4. volatile 有什么作用？能保证 `count++` 安全吗？

**直接回答：** volatile 变量的写与后续读可以建立可见性和顺序保证，适合状态发布、开关和独立配置；它不能把“读—改—写”变成一个原子操作，所以不能单独保证 `count++` 安全。

`count++` 至少包含读取旧值、计算新值和写回。多个线程可能读取同一个旧值并互相覆盖。计数可以使用 `AtomicLong`、`LongAdder`，或把相关状态放进同一临界区；选哪一种还取决于是否需要精确瞬时值和复合不变量。

## 锁、CAS 与同步器

### 5. `synchronized` 和 `ReentrantLock` 怎么选？

**直接回答：** 简单互斥优先 `synchronized`，语法范围结束会自动释放；需要可中断获取、超时尝试、公平策略或多个 `Condition` 时使用 `ReentrantLock`，并在 `finally` 中解锁。

```java
lock.lock();
try {
    updateSharedState();
} finally {
    lock.unlock();
}
```

两者都提供互斥与相应的内存语义。“Lock 性能一定更高”是过时的无条件结论；性能取决于 JDK、竞争强度、临界区和调度，正确性与所需能力应先于微基准。

### 6. `synchronized` 的“锁升级”应该怎样回答？

**直接回答：** Java 语言只保证监视器的互斥和内存语义；对象头、轻量级锁、重量级锁等是 HotSpot 特定版本的实现。JDK 21 中不能再沿用“无锁 → 偏向锁 → 轻量级锁 → 重量级锁”的固定口诀，因为偏向锁已被禁用并废弃。

![synchronized 稳定语义与 HotSpot 版本实现边界](/.image/interview/java/concurrency/synchronized-lock-upgrade.svg)

稳定原理是：无竞争时 JVM 尽量降低同步开销；出现真实竞争和阻塞需要时，可能使用更重的协调机制。具体状态转换应限定 JVM 与版本，并通过 JOL、JFR 或源码验证，而不是把对象头布局当 Java 规范。

### 7. CAS 是什么？有什么问题？

**直接回答：** CAS 比较内存中的当前值与期望值，相等才原子地写入新值；失败方可以重试。它避免了某些阻塞，但可能带来 ABA、自旋浪费、公平性差和多变量一致性难题。

```java
do {
    oldValue = counter.get();
    newValue = oldValue + 1;
} while (!counter.compareAndSet(oldValue, newValue));
```

ABA 表示值从 A 变 B 又回到 A，单看当前值无法知道中间发生过变化。若版本变化有业务意义，可以加入版本戳；若多个字段必须一起保持不变量，锁、不可变状态整体替换或事务往往更直接。

### 8. AtomicLong 和 LongAdder 怎么选？

**直接回答：** 需要每次更新都落在单一线性化值、随后立即精确读取时用 `AtomicLong`；高并发统计且允许读取时汇总各分片，用 `LongAdder` 降低热点竞争。

LongAdder 在竞争时把更新分散到多个 Cell，读取 `sum()` 再聚合，因此它适合指标累加，不适合“余额扣减后立刻做条件判断”这类依赖单点精确原子值的业务。

### 9. AQS 是什么？

**直接回答：** `AbstractQueuedSynchronizer` 是构建锁和同步器的框架：子类定义同步状态怎样获取与释放，AQS 负责获取失败后的排队、阻塞、唤醒和取消。`ReentrantLock`、`Semaphore`、`CountDownLatch` 等都复用了这种骨架。

理解 AQS 时分三层：同步状态、等待队列、具体同步器的获取规则。AQS 队列不是普通业务队列，也不代表所有同步器只有完全相同的公平语义。

### 10. 公平锁和非公平锁有什么区别？

**直接回答：** 公平锁倾向让等待更久的线程先获得锁，减少饥饿；非公平锁允许刚到的线程抢占机会，通常能减少调度切换、提高吞吐，但等待时间更不稳定。

公平不是严格的实时保证，也不意味着业务请求全链路公平。选择要看吞吐、尾延迟和饥饿风险，不能只凭名字判断哪个“更正确”。

### 11. `Condition` 和 `wait/notify` 有什么区别？

**直接回答：** `wait/notify` 依附对象监视器；`Condition` 依附 `Lock`，一个锁可以创建多个条件队列。两者都要求在持有对应锁时等待或通知，并应在循环中重新检查条件。

```java
lock.lock();
try {
    while (queue.isEmpty()) {
        notEmpty.await();
    }
    return queue.removeFirst();
} finally {
    lock.unlock();
}
```

用 `while` 是因为线程被唤醒时条件可能又被其他线程改变，也可能发生虚假唤醒。通知只是让等待者有资格继续竞争，不是把锁直接交给它。

### 12. CountDownLatch、CyclicBarrier 和 Semaphore 怎么选？

**直接回答：** CountDownLatch 等待一组一次性事件完成；CyclicBarrier 让固定数量的参与者在阶段边界互相等待并可重复使用；Semaphore 用许可证限制同时进入某资源的数量。

- 服务启动等待若干依赖初始化：`CountDownLatch`。
- 多个并行任务每轮汇合后进入下一轮：`CyclicBarrier`。
- 限制同时访问下游接口或连接的任务数：`Semaphore`。

它们解决的是协调，不自动处理任务失败、超时和资源泄漏；生产代码还要明确取消和兜底。

### 13. 读写锁适合什么场景？

**直接回答：** 共享数据读多写少、读取时间不短，并且读之间确实可以并行时，读写锁可能提高吞吐；写频繁、临界区很短或存在写饥饿时，普通互斥锁可能更简单。

“读多写少”只是候选条件。还要测量竞争强度、读锁管理成本、缓存一致性和尾延迟。乐观读工具如 `StampedLock` 还要求读取后验证版本，使用复杂度更高。

## 线程隔离与并发容器

### 14. ThreadLocal 是什么？为什么可能泄漏？

**直接回答：** ThreadLocal 把值绑定到当前线程，适合传递请求上下文等线程私有状态；在线程池中线程会长期复用，如果任务结束不 `remove()`，旧值可能串到后续任务并长期占用内存。

```java
try {
    REQUEST_ID.set(requestId);
    handle();
} finally {
    REQUEST_ID.remove();
}
```

ThreadLocalMap 的 Key 是弱引用不等于 Value 会立即消失；Entry 仍可能由存活线程间接持有。异步切换线程时，上下文也不会天然传播，应显式传参或使用受控的上下文机制。

### 15. ConcurrentHashMap 为什么适合并发场景？

**直接回答：** 它让读取、不同桶的更新和扩容协作尽量并发进行，避免像 Hashtable 那样让所有常用操作都围绕一个对象监视器串行。JDK 21 写入主要结合 CAS、桶级同步和协作扩容。

![ConcurrentHashMap 写入关键分支](/.image/interview/java/concurrency/concurrenthashmap-put.svg)

它不允许 null Key 和 null Value，以免并发读取时无法区分“没有映射”和“映射值为 null”。单方法线程安全不等于业务复合操作安全，优先使用 `compute`、`merge`、`putIfAbsent` 等原子复合 API，并检查回调是否可能阻塞或递归修改。

### 16. 不可变对象为什么更容易线程安全？

**直接回答：** 对象构造完成后状态不再改变，就没有并发写入与中间状态暴露，多个线程可以安全共享它的值；但仍要保证构造期间没有 `this` 逃逸，并通过正确发布让其他线程看到完整状态。

`final` 字段有特殊初始化安全语义，但 `final List<T>` 只保证引用不重新赋值，不保证列表内容不可变。真正的不可变需要封装可变成员、构造时防御性复制、对外不泄漏修改入口。

### 17. 怎样系统地减少锁竞争？

**直接回答：** 优先减少共享和缩小临界区，再考虑分片、读写分离、原子类或换锁；不要先用更复杂的锁掩盖过大的共享状态。

排查顺序可以是：确认不变量 → 用 JFR/线程转储定位竞争点 → 缩短锁内 I/O 和计算 → 拆分独立状态 → 控制线程数量与过载 → 最后再微调同步原语。增加线程可能让竞争、上下文切换和下游压力更严重。

## 面试表达与验证

### 30 秒回答骨架

> 并发正确性先看共享状态的不变量，再分别处理原子性、可见性和有序性。能消除共享就先消除；只做状态发布可用 volatile，复合不变量用锁或原子复合操作；CAS 适合短操作低冲突，并发容器只保证其契约内的原子边界。最后要用压力测试、JFR 或线程转储验证竞争和失败路径。

### 最小实验

```java
int count = 0;
// 多线程各执行很多次 count++，最终结果通常小于期望值。
```

再依次换成 `volatile int`、`AtomicInteger` 和锁保护，观察 volatile 为什么仍会丢失更新。另在线程池中复用 ThreadLocal 而不清理，验证上下文串用，再补上 `finally remove()`。

## 权威参考

- [JLS 21 第 17 章：Threads and Locks](https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html)
- [Java SE 21 并发包](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
- [OpenJDK 21 `AbstractQueuedSynchronizer`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/locks/AbstractQueuedSynchronizer.java)
- [OpenJDK 21 `ConcurrentHashMap`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/ConcurrentHashMap.java)
- [OpenJDK 21 `Striped64`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/atomic/Striped64.java)
- [JEP 374：Disable and Deprecate Biased Locking](https://openjdk.org/jeps/374)

---

[← 上一章：Java 集合](./collections) · [下一章：多线程与线程池 →](./multithreading)
