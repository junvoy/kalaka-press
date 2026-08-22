---
outline: [2, 3]
---

# Java 多线程面试题

多线程关注线程本身的创建、状态、协作和管理。生产代码的重点不是“会 new Thread”，而是能控制线程数量、处理异常并安全停止任务。

::: tip 本章边界
本章讲的是“线程怎样被创建、协作和管理”。如果问题在问共享变量为什么看不见、锁怎样保证原子性、CAS 或 AQS 的原理，应回到上一章“并发”。
:::

## 线程基础

### 1. 进程和线程有什么区别？

**面试一句话：** 进程是操作系统分配资源的基本单位，线程是 CPU 调度的基本单位；同一进程内的线程共享堆等资源，但每个线程有自己的程序计数器和虚拟机栈。

可以把进程理解成一家餐厅，线程是餐厅里的厨师。厨师共享厨房和食材，但每个人有自己的工作步骤。共享提高了协作效率，也带来了数据竞争问题。

### 2. 创建线程有哪些方式？推荐哪一种？

常见写法包括继承 `Thread`、实现 `Runnable`、使用 `Callable + Future`，以及把任务提交给线程池。

**面试一句话：** 生产代码更推荐把任务与线程分离，通过线程池执行 Runnable 或 Callable；这样能复用线程、限制并发量并统一管理生命周期。

直接为每个任务创建线程会产生创建、销毁和上下文切换开销，任务突增时还可能耗尽内存。

### 3. `start()` 和 `run()` 有什么区别？

**面试一句话：** 调用 `start()` 会请求 JVM 创建并调度一个新线程，新线程随后执行 `run()`；直接调用 `run()` 只是当前线程的一次普通方法调用，不会产生新线程。

```java
Thread worker = new Thread(() ->
    System.out.println(Thread.currentThread().getName())
);

worker.start(); // 在新线程执行
// worker.run(); // 在当前线程直接执行
```

同一个 Thread 对象只能成功启动一次，重复调用 `start()` 会抛出 `IllegalThreadStateException`。

### 4. Java 线程有哪些状态？

**面试一句话：** Java 定义了 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING 和 TERMINATED 六种线程状态；操作系统层面的“正在运行”和“可运行”在 Java 中通常都归入 RUNNABLE。

![Java 线程状态及常见转换](/.image/interview/java/multithreading/thread-states.svg)

- **BLOCKED**：等待进入 synchronized 保护的区域。
- **WAITING**：无限期等待其他线程唤醒，例如 `wait()`、`join()`。
- **TIMED_WAITING**：带超时时间地等待，例如 `sleep()`、`wait(timeout)`。

## 线程协作

### 5. `sleep()` 和 `wait()` 有什么区别？

| 对比项 | `Thread.sleep()` | `Object.wait()` |
| --- | --- | --- |
| 所属类 | Thread | Object |
| 是否需要持有监视器 | 不需要 | 必须在 synchronized 中持有对象监视器 |
| 是否释放锁 | 不释放已持有的锁 | 会释放对应对象的监视器锁 |
| 如何恢复 | 时间到或被中断 | notify、notifyAll、超时或被中断 |

**面试一句话：** sleep 用于让当前线程暂停一段时间，不会释放锁；wait 用于线程间协作，会释放对应的监视器锁。

现代业务代码中，更常使用 `BlockingQueue`、`CountDownLatch`、`Condition` 等更高层工具表达协作关系。

### 6. 怎样正确停止一个线程？

**面试一句话：** 通常使用中断机制请求线程停止：调用方执行 `interrupt()`，任务通过中断标记或 `InterruptedException` 感知请求，清理资源后自行退出。

```java
while (!Thread.currentThread().isInterrupted()) {
    doOneTask();
}
```

中断是一种协作信号，不是强制杀死线程。捕获 `InterruptedException` 后如果不能立即退出，通常应重新设置中断标记，避免把停止信号吃掉。

### 7. 什么是线程上下文切换？

**面试一句话：** CPU 从一个线程切换到另一个线程时，需要保存前一个线程的执行现场并恢复后一个线程的现场，这就是上下文切换；线程过多会增加调度和缓存失效成本。

线程不是越多越快。CPU 密集任务的线程数通常接近可用核心数；I/O 密集任务可以适当更多，但仍要结合等待时间、内存、下游容量和压测结果决定。

## 线程池

### 8. 线程池的核心参数有哪些？任务如何执行？

**面试一句话：** 重点参数包括核心线程数、最大线程数、空闲存活时间、任务队列、线程工厂和拒绝策略；提交任务后通常先使用核心线程，再进入队列，队列满后创建非核心线程，最后触发拒绝策略。

![线程池提交任务的判断流程](/.image/interview/java/multithreading/thread-pool-submit.svg)

最容易记错的是顺序：达到核心线程数后，任务通常先排队；只有队列也放不下时，才继续创建线程直到最大线程数。线程和队列都到上限后，才会执行拒绝策略。

参数必须结合任务类型、耗时、峰值流量和机器资源压测决定。不要只背“CPU 核数加一”，也不要无脑使用无界队列，否则任务积压可能导致 OOM。

#### 源码解析：`ThreadPoolExecutor.execute` 的三段式决策

以 [OpenJDK 21 `ThreadPoolExecutor.execute`](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/util/concurrent/ThreadPoolExecutor.java) 为例，任务不是“直接放队列”。方法按下面顺序决策：

```text
if (workerCount < corePoolSize) {
    addWorker(command, true);             // 1. 先补核心线程
} else if (workQueue.offer(command)) {
    if (线程池已停止) remove(command);     // 2. 入队后必须二次确认运行状态
    else if (workerCount == 0) addWorker(null, false);
} else if (!addWorker(command, false)) {
    reject(command);                      // 3. 队列满后才尝试最大线程，仍失败则拒绝
}
```

因此，队列类型会直接改变扩容行为：无界队列通常使线程数很少超过 `corePoolSize`；直接交接队列倾向于更快创建非核心线程；有界队列让排队、扩容和拒绝都可控。不要只背参数名，面试时要能按这三段解释任务为何被执行、排队或拒绝。

### 9. 线程池有哪些拒绝策略？

JDK 常见的四种策略：

- `AbortPolicy`：直接抛异常，默认策略，能明确暴露过载。
- `CallerRunsPolicy`：让提交任务的线程自己执行，形成一定反压。
- `DiscardPolicy`：静默丢弃当前任务。
- `DiscardOldestPolicy`：丢弃队列中最旧任务，再尝试提交。

**面试一句话：** 拒绝策略不能脱离业务选择；支付、订单等任务通常不能静默丢弃，还要配合告警、降级、持久化或重试机制。

### 10. 什么是死锁？怎样避免和排查？

**面试一句话：** 多个线程各自持有一部分资源，又互相等待对方释放资源，形成循环等待，就发生了死锁。

最直观的例子：线程 A 拿着锁 1 等锁 2，线程 B 拿着锁 2 等锁 1。

常见处理方式：

1. 所有线程按相同顺序获取锁。
2. 减少锁的范围和持有时间。
3. 使用 `tryLock()` 设置超时，失败后释放已持有资源。
4. 避免持锁期间进行网络请求、数据库慢查询等耗时操作。
5. 通过 `jstack`、线程转储或监控查找互相等待的线程和锁。

### 11. `execute()` 和 `submit()` 有什么区别？

**面试一句话：** execute 接收 Runnable 且不返回任务结果；submit 可以接收 Runnable 或 Callable，并返回 Future，但任务异常通常被保存在 Future 中，需要调用 get 或统一处理才能感知。

如果使用 `submit()` 后既不保存 Future，也没有其他异常监控，任务失败可能看起来像“悄悄消失”。生产线程池应设置有意义的线程名，并通过 Future、任务包装器或线程池钩子统一记录异常。

### 12. Future 和 CompletableFuture 有什么区别？

**面试一句话：** Future 主要表示一个稍后可取得的结果，直接调用 get 可能阻塞；CompletableFuture 还支持回调、任务组合、异常处理和多个阶段编排，更适合表达异步流程。

```java
CompletableFuture<User> userFuture = loadUserAsync();
CompletableFuture<Order> orderFuture = userFuture
    .thenCompose(user -> loadLatestOrderAsync(user.id()))
    .exceptionally(error -> fallbackOrder());
```

异步不等于更快。还要明确使用哪个线程池、怎样设置超时、异常如何传播，以及下游能承受多少并发。不要把耗时任务全部丢给默认公共线程池。

### 13. 线程池中的任务异常怎样处理？

**面试一句话：** execute 提交的未捕获异常通常会到线程的 UncaughtExceptionHandler；submit 会把异常封装进 Future，调用 get 时以 ExecutionException 暴露，因此应按提交方式设计统一的日志、监控和补偿策略。

业务任务应记录任务标识和必要上下文，但不要在最内层捕获所有异常后静默忽略。需要重试时还要限制次数、采用退避策略，并保证任务幂等，避免故障期间形成重试风暴。

### 14. 线程池大小应该怎样设置？

**面试一句话：** CPU 密集任务的线程数通常接近可用核心数；I/O 密集任务可根据“计算时间与等待时间之比”适当增加，但最终必须结合响应时间、队列长度、内存和下游容量压测确定。

一个常见估算思路是：

```text
线程数 ≈ CPU 核数 × 目标利用率 × (1 + 等待时间 / 计算时间)
```

它只是起点，不是固定答案。线程池还应按业务隔离，避免慢任务占满公共线程池；队列必须有容量边界，并对活跃线程、队列积压、拒绝次数和任务耗时设置监控。

### 15. 什么是虚拟线程？适合什么场景？

**面试一句话：** 虚拟线程是 JDK 21 正式提供的轻量级线程，JVM 可以把大量虚拟线程调度到较少的平台线程上，适合高并发、以阻塞 I/O 为主且希望保留同步编程风格的任务。

虚拟线程不会让 CPU 计算变快，也不会突破数据库连接池、外部接口等下游容量。使用时仍要通过信号量、连接池等限制稀缺资源，并关注会长时间占用载体线程的操作；具体限制需要结合所用 JDK 版本验证。

### 16. 定时任务为什么优先使用 ScheduledExecutorService？

**面试一句话：** ScheduledExecutorService 能复用受控线程执行延迟和周期任务，比 Timer 支持更多线程，且单个任务异常不会像 Timer 那样终止唯一调度线程。

- `scheduleAtFixedRate` 尽量按固定频率触发，适合关注执行节拍的任务。
- `scheduleWithFixedDelay` 在上一次执行结束后再等待固定时间，更适合不能重叠的轮询任务。

多实例部署时，本地定时线程可能在每台机器都执行一次。需要全局只执行一次的业务，应结合分布式调度、租约或分布式锁，而不是误以为单机线程池能解决集群协调。

---

[← 上一章：并发](./concurrency) · [下一章：JVM →](./jvm)
