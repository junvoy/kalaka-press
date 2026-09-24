---
outline: [2, 3]
---

# Java 多线程：任务怎样调度、取消和隔离？

本章讨论线程生命周期、任务调度、线程池和异步结果。共享变量怎样通过 JMM、锁与 CAS 保持正确，统一放在[并发正确性](./concurrency)。

## 线程与任务

### 1. 进程、线程和任务有什么区别？

**直接回答：** 进程是拥有独立地址空间和系统资源的运行实例；线程是进程内可被调度的执行单元，同一进程的线程共享堆等资源；任务是“要做什么”的业务描述，可以交给不同线程执行。

把任务与线程分开很重要：`Runnable`、`Callable` 描述工作，Executor 决定何时、在哪个线程执行。业务代码通常不应为每个任务都手动创建平台线程。

### 2. Java 创建线程有哪些方式？推荐哪一种？

**直接回答：** 可以继承 Thread、传入 Runnable、使用 Callable/Future，或提交到 Executor；业务代码通常优先提交任务给受控的 Executor，因为它能统一管理并发数、排队、拒绝、命名和关闭。

```java
ExecutorService executor = Executors.newFixedThreadPool(4);
Future<Integer> future = executor.submit(() -> calculate());
```

“四种创建线程方式”更准确地说是不同任务提交与结果抽象；Future 和 CompletableFuture 本身不是线程。生产环境还要显式命名线程、选择队列和拒绝策略，不应只靠默认工厂。

### 3. `start()` 和 `run()` 有什么区别？

**直接回答：** `start()` 请求 JVM 启动新线程，随后由新线程调用 `run()`；直接调用 `run()` 只是当前线程的一次普通方法调用，不会创建新线程。同一个 Thread 对象只能成功启动一次。

```java
Thread thread = new Thread(() ->
    System.out.println(Thread.currentThread().getName()));

thread.run();   // 当前线程
thread.start(); // 新线程
```

`start()` 返回不代表任务已完成，线程何时真正运行由调度决定；等待完成应使用 `join()`、Future 或更高层协调工具。

### 4. Java 线程有哪些状态？

**直接回答：** `Thread.State` 定义 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED 六种状态。Java 的 RUNNABLE 同时覆盖操作系统层“正在运行”和“可运行但等待 CPU”的情况。

![Java 线程状态与常见转换](/.image/interview/java/multithreading/thread-states.svg)

- 等待进入 `synchronized` 监视器是 BLOCKED。
- `Object.wait()`、`Thread.join()` 等无超时等待常见为 WAITING。
- `sleep()`、带超时的 wait/join 常见为 TIMED_WAITING。
- 等待 Socket I/O 在 Java 层不一定显示为 BLOCKED，不能只凭状态名下结论。

线程转储是某一时刻的证据，排障应多次采样并结合锁拥有者、栈帧、CPU 和请求指标。

### 5. `sleep()` 和 `wait()` 有什么区别？

**直接回答：** `sleep()` 是 Thread 的定时暂停，不要求持有监视器，也不会释放已经持有的锁；`wait()` 是对象监视器的条件等待，必须在持有该监视器时调用，并会释放对应监视器。

`wait()` 被唤醒后还要重新竞争锁，并在 `while` 中检查条件；`sleep()` 到期只表示线程重新有资格被调度，不保证立即执行。二者都可能被中断。

### 6. 怎样正确停止一个线程？

**直接回答：** 使用协作式取消：调用 `interrupt()` 发出请求，任务在阻塞点或循环中检测中断，完成清理后退出。不要使用已废弃的 `stop()` 强行终止，也不要吞掉 `InterruptedException`。

```java
while (!Thread.currentThread().isInterrupted()) {
    try {
        doOneTask();
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        break;
    }
}
```

中断不是“杀死线程”，只是一个协议。任务若调用不响应中断的外部 API，还需要超时、关闭资源或组件专用的取消机制。

### 7. 什么是线程上下文切换？为什么线程越多不一定越快？

**直接回答：** 调度器从一个可运行线程切到另一个线程时，要保存和恢复执行上下文，还可能破坏 CPU 缓存局部性。线程超过 CPU 与阻塞需求后，切换、竞争、内存占用和下游压力可能抵消并行收益。

CPU 密集任务的并行上限主要受核心数限制；I/O 密集任务可以允许更多并发来覆盖等待，但仍受连接池、数据库、远端限流和内存约束。线程数不能脱离整条资源链路单独计算。

## 线程池与过载

### 8. 线程池的核心参数和执行流程是什么？

**直接回答：** ThreadPoolExecutor 的关键参数是 corePoolSize、maximumPoolSize、keepAliveTime、workQueue、threadFactory 和 handler。提交任务时通常按“核心线程 → 队列 → 非核心线程 → 拒绝”决策。

![ThreadPoolExecutor 接收任务的关键分支](/.image/interview/java/multithreading/thread-pool-submit.svg)

```text
运行线程少于 corePoolSize        -> 创建核心线程
否则队列还能接收                -> 入队
否则线程少于 maximumPoolSize    -> 创建非核心线程
否则                            -> 执行拒绝策略
```

这个顺序解释了为什么使用无界队列时 maximumPoolSize 常常没有机会生效。源码可从 OpenJDK 21 [`ThreadPoolExecutor.execute`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/ThreadPoolExecutor.java) 验证。

### 9. 线程池队列怎么选？

**直接回答：** 队列表达系统愿意缓存多少等待工作：有界队列能形成过载边界；无界队列容易让延迟和内存不断增长；`SynchronousQueue` 不存任务，要求提交者直接交给可用工作线程。

- `ArrayBlockingQueue`：固定容量，内存与过载边界清晰。
- `LinkedBlockingQueue`：可设容量，不设时容量非常大，不等于没有代价。
- `SynchronousQueue`：直接移交，常配合能弹性增长的线程数。
- `DelayQueue`、优先队列：只有业务确实需要相应顺序语义时使用。

队列不是越大越安全。任务处理速度低于到达速度时，任何有限系统最终都要排队、拒绝、限流或降级。

### 10. 线程池有哪些拒绝策略？

**直接回答：** JDK 内置 AbortPolicy 抛异常、CallerRunsPolicy 让提交线程执行、DiscardPolicy 静默丢弃、DiscardOldestPolicy 丢弃队头后重试。生产选择必须匹配任务能否丢、调用方能否被反压以及是否需要审计补偿。

CallerRunsPolicy 可以减慢提交方，但如果提交线程是事件循环或持有关键锁，反而会放大故障；静默丢弃通常需要额外指标和补偿，否则业务只会“悄悄消失”。

### 11. `execute()` 和 `submit()` 有什么区别？

**直接回答：** `execute(Runnable)` 没有返回结果，未捕获异常通常进入工作线程的异常处理路径；`submit(...)` 返回 Future，任务结果或异常被 Future 保存，调用 `get()` 时再观察。

```java
Future<?> future = executor.submit(() -> {
    throw new IllegalStateException("failed");
});

future.get(); // 抛 ExecutionException，cause 是原异常
```

如果提交后从不读取 Future，也没有统一的任务装饰器或监控，异常就可能长期不被发现。线程池不仅要“跑任务”，还要让排队、耗时、拒绝与失败可观察。

### 12. 线程池中的任务异常怎样处理？

**直接回答：** 在任务边界记录必要上下文；execute 路径可配置 `UncaughtExceptionHandler`，submit 路径要读取 Future，或重写 `afterExecute` 统一提取异常。不要只在业务内部无差别 catch 后继续运行。

异常策略要区分可重试、不可重试和进程级错误。失败重试还必须有次数、退避、幂等和死信/人工处理边界，否则线程池可能被同一批失败任务占满。

### 13. 线程池大小应该怎样设置？

**直接回答：** 先按 CPU 密集或等待密集得到初始值，再以压测和生产指标校准；同时受数据库连接池、下游限流、内存和延迟目标约束。不存在脱离工作负载的万能公式。

CPU 密集可从接近可用核心数开始；等待密集可以适当增加并发，但要测量实际计算时间与等待时间。至少观察吞吐、队列长度、活跃线程、拒绝数、任务等待时间、执行时间和下游饱和度。

### 14. 为什么不同业务要隔离线程池？

**直接回答：** 共享一个池时，慢 I/O、批处理或失败重试可能占满线程和队列，拖垮本来健康的请求。按延迟目标、资源依赖和失败模式隔离，可以把故障限制在较小范围。

隔离也有代价：线程、队列和监控数量变多，总并发若不受控仍会压垮下游。因此要同时设置全局资源预算，而不是每个模块各建一个“大池”。

## 异步结果与现代线程

### 15. Future 和 CompletableFuture 有什么区别？

**直接回答：** Future 表示一个稍后可取的结果，主要支持阻塞获取和取消；CompletableFuture 还能组合、转换、汇合和处理异常，适合表达异步依赖图。

```java
CompletableFuture<User> user = loadUserAsync(id);
CompletableFuture<List<Order>> orders =
    user.thenCompose(value -> loadOrdersAsync(value.id()));
```

异步不等于非阻塞：回调中仍可能做阻塞 I/O；未显式指定 Executor 时，部分异步方法会使用公共 ForkJoinPool，可能与其他任务互相干扰。生产代码应明确执行器、超时、取消和异常汇合。

### 16. 虚拟线程是什么？适合什么场景？

**直接回答：** Java 21 的虚拟线程是 JVM 管理的轻量线程，适合大量“一个请求一个线程”的阻塞式 I/O 任务；它不让 CPU 计算更快，也不会增加数据库连接数或远端服务容量。

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    Future<Response> future = executor.submit(() -> callRemote());
    return future.get();
}
```

虚拟线程通常不需要像平台线程那样池化来节省线程对象，但仍要用 Semaphore、连接池或限流器控制稀缺下游资源。在本章固定的 JDK 21 边界内，虚拟线程在 `synchronized` 中执行某些阻塞操作可能钉住载体线程，应通过 JFR 观察；JDK 24 的 JEP 491 已移除 `synchronized` 导致的主要钉住限制，因此回答时必须说明版本。

### 17. 定时任务为什么优先用 ScheduledExecutorService？

**直接回答：** 它把调度和任务执行纳入 Executor 生命周期，能配置延迟与周期，并支持 Future、取消和线程工厂；相比 `Timer`，它支持多个工作线程，一个任务异常也不会天然终止整套定时机制。

`scheduleAtFixedRate` 关注计划频率，任务过慢时可能连续追赶；`scheduleWithFixedDelay` 在上次结束后再等待固定间隔。两者都不是跨进程分布式调度，也不自动保证任务只执行一次。

## 面试表达与排障

### 30 秒回答骨架

> 我会把任务和线程分开，用受控 Executor 管理并发、队列、拒绝和关闭。线程池按核心线程、队列、最大线程、拒绝策略接收任务；取消采用中断协作。Future 负责结果，CompletableFuture 负责组合，虚拟线程适合高并发阻塞 I/O，但所有方案都必须服从下游容量和过载边界。

### 线程问题排查顺序

1. 看请求吞吐、延迟、错误和线程池队列是否同时异常。
2. 连续获取多份线程转储，寻找重复热点栈、锁等待和死锁。
3. 用 JFR、CPU profile 和下游指标区分计算、锁竞争、I/O 等待或过载。
4. 修复后用相同负载验证吞吐、尾延迟、拒绝和资源占用，而不是只看平均值。

## 权威参考

- [Java SE 21 `Thread`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Thread.html)
- [Java SE 21 `ThreadPoolExecutor`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html)
- [OpenJDK 21 `ThreadPoolExecutor`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/ThreadPoolExecutor.java)
- [OpenJDK 21 `CompletableFuture`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/CompletableFuture.java)
- [JEP 444：Virtual Threads](https://openjdk.org/jeps/444)
- [JEP 491：Synchronize Virtual Threads without Pinning](https://openjdk.org/jeps/491)

---

[← 上一章：并发正确性](./concurrency) · [下一章：JVM →](./jvm)
