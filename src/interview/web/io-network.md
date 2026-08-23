---
outline: [2, 3]
---

# 网络、NIO 与 I/O 多路复用面试题

I/O 是程序与文件、网络、数据库等外部世界交换数据的方式。本章从“线程为什么会等”开始，重点讲 Java NIO 的 Buffer、Channel、Selector 与 I/O 多路复用，再落到文件传输和网络服务排障。Netty 如何把这些能力工程化，见下一章。

::: tip 版本与边界
源码解析以 [OpenJDK 21](https://github.com/openjdk/jdk21u/tree/master) 为基准。Selector 是 Java 的跨平台抽象，Linux 上可能落到 epoll、macOS/BSD 上可能落到 kqueue；具体实现、默认参数和性能结论必须结合 JDK、操作系统和压测验证。
:::

## 一、先理解 I/O 与阻塞

### 1. 什么是 I/O？

**面试一句话：** I/O（Input/Output）是程序与文件、网络设备、数据库或其他进程交换数据的过程；网络 I/O 的核心矛盾通常是“数据和对端何时准备好”。

大白话：CPU 像厨师，网络和磁盘像外卖站。厨师把订单交出去后，最怕一直站在门口等骑手回来，什么别的菜都不做。

I/O 不等于网络 I/O。文件、标准输入输出、数据库驱动都涉及 I/O；本章重点是 Java 的文件与 Socket 通道模型。

### 2. 同步、异步、阻塞、非阻塞分别是什么意思？

**面试一句话：** 同步/异步描述结果由谁、何时通知；阻塞/非阻塞描述调用线程在等待期间能否继续做别的事，两组概念不能简单画等号。

| 维度 | 关注点 | 大白话 |
| --- | --- | --- |
| 阻塞 | 调用没结果时线程是否等待 | 人站在窗口前等号 |
| 非阻塞 | 调用立刻返回 | 人先去做别的，稍后再问 |
| 同步 | 调用方主动取得结果 | 自己不断查看订单状态 |
| 异步 | 完成后由系统通知调用方 | 外卖到门口时推送提醒 |

例如 `Selector.select()` 会阻塞等待“有事件就绪”，但它让一个线程等待的是一批连接，而不是只等待一条连接。

### 3. 什么是阻塞 I/O 和非阻塞 I/O？

**面试一句话：** 阻塞 I/O 在数据未准备好时让当前线程等待；非阻塞 I/O 会立即返回，调用方根据返回值稍后重试或由事件循环再次处理。

非阻塞 `read()` 返回 `0` 不代表“连接关闭”或“读取失败”，通常只表示此刻没有可读数据；返回 `-1` 才表示到达流末尾。处理逻辑必须区分这三种结果。

### 4. BIO、NIO 和 AIO 有什么区别？

**面试一句话：** BIO 通常一个连接配一个阻塞读写线程；NIO 用 Channel、Buffer 与 Selector 做非阻塞和多路复用；AIO 以完成回调/Future 通知结果，实际收益取决于操作系统和实现。

![BIO 的一连接一等待线程模型](/.image/interview/web/io-network/bio-thread-model.svg)

| 模型 | 典型形式 | 适合场景 |
| --- | --- | --- |
| BIO | 阻塞流 + 线程等待 | 连接少、代码简单、管理工具 |
| NIO | 非阻塞 Channel + Selector | 大量长连接或空闲连接 |
| AIO | 完成回调/Future | 特定异步文件或网络场景 |

NIO 不保证业务一定更快；它主要节省大量空闲连接的等待线程。CPU 已满、数据库很慢或业务 Handler 阻塞时，换 NIO 也不能自动解决问题。

### 5. Java NIO 的 Buffer、Channel、Selector 和 SelectionKey 分别是什么？

**面试一句话：** Buffer 存放数据，Channel 表示可读写通道，Selector 监听多个可选择通道的就绪事件，SelectionKey 记录某条通道的注册兴趣、就绪状态和附件。

大白话：Buffer 是收纳盒，Channel 是管道，Selector 是总调度台，SelectionKey 是每根管道挂在调度台上的工单。

它们各自解决不同问题：Buffer 解决数据位置管理，Channel 解决读写入口，Selector 解决“许多连接谁先有事”，Key 解决“这条连接关心什么、现在发生了什么”。

## 二、Buffer：先把数据位置讲明白

### 6. Buffer 的 `position`、`limit`、`capacity` 怎么理解？

**面试一句话：** `position` 是当前读写位置，`limit` 是本轮允许读写的边界，`capacity` 是总容量；写模式时通常从 `position` 写到 `limit`，读模式时从 `position` 读到 `limit`。

可以把它看成一张表格：`capacity` 是表格总格数，`position` 是笔尖或阅读书签，`limit` 是本轮允许走到的终点。

### 7. `flip()`、`clear()`、`compact()` 分别做什么？

**面试一句话：** `flip()` 把刚写入的数据切换为可读；`clear()` 丢弃未读内容并准备重新写；`compact()` 保留未读数据并把它挪到前面，适合处理半包。

![ByteBuffer 在写入、读取和保留半包之间的状态切换](/.image/interview/web/io-network/buffer-state-transition.svg)

#### 源码解析：`Buffer#flip`

以 [OpenJDK 21 `Buffer#flip`](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/nio/Buffer.java) 为例，核心操作非常直接：

```java
// OpenJDK 21 源码关键片段，已裁剪
limit = position;
position = 0;
mark = -1;
```

大白话：写完的末尾变成“这次最多能读到哪里”，然后把读书签放回开头。`clear()` 不会把底层字节逐个清零，它只是重置索引；若数据涉及敏感信息，不能误以为 `clear()` 已安全擦除。

### 8. 堆内 Buffer、直接 Buffer 和内存映射怎么选？

**面试一句话：** 堆内 Buffer 受 JVM 堆管理、创建方便；直接 Buffer 更贴近本地 I/O 但分配回收成本更高；内存映射适合特定的大文件随机访问，选择必须结合数据量、生命周期和内存限制。

直接内存不是“堆外就无需管理”。它仍受进程内存、JVM 直接内存上限和清理时机影响；频繁小块分配可能比复用缓冲区更糟。

### 9. `mark()` 和 `reset()` 适合什么场景？

**面试一句话：** `mark()` 记录当前 `position`，`reset()` 回到该位置，适合先读取协议头、发现消息体未到齐后回退；也可以通过手动保存位置实现同样目的。

它就像读题时先夹书签：发现后半页还没送到，就回到书签等下一批数据。标记在某些索引变化后会失效，不能把它当永久事务回滚机制。

### 10. 为什么网络 Buffer 不能假设“一次读完一条消息”？

**面试一句话：** TCP 传输的是连续字节流，不携带业务消息边界；一次 `read` 可能读到半条消息、刚好一条或多条消息，因此协议必须自己定义帧边界。

常见边界方案是固定长度、分隔符、长度字段和 TLV。长度字段必须校验最大值、魔数和版本，避免异常报文让服务分配过大内存。

## 三、Channel：通道不等于连接线程

### 11. Channel 和传统 InputStream/OutputStream 有什么不同？

**面试一句话：** Stream 更像单向连续字节流，Channel 是可执行读写等 I/O 操作的连接抽象，很多 Channel 支持双向读写、非阻塞模式和与 Selector 注册。

并非所有 Channel 都能注册 Selector。只有 `SelectableChannel` 的子类（如 `SocketChannel`、`ServerSocketChannel`）能参与网络 I/O 多路复用；`FileChannel` 不能。

### 12. `SocketChannel` 与 `ServerSocketChannel` 分别负责什么？

**面试一句话：** `ServerSocketChannel` 监听端口并接收新连接，`SocketChannel` 表示一条已连接的 TCP 通道并负责读写；两者都要在注册 Selector 前切为非阻塞模式。

```java
ServerSocketChannel server = ServerSocketChannel.open();
server.configureBlocking(false);
server.bind(new InetSocketAddress(8080));
server.register(selector, SelectionKey.OP_ACCEPT);
```

`configureBlocking(false)` 不是性能装饰；阻塞模式的 Channel 注册到 Selector 会抛出 `IllegalBlockingModeException`。

#### 源码解析：`AbstractSelectableChannel#register`

[OpenJDK 21 `AbstractSelectableChannel#register`](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/nio/channels/spi/AbstractSelectableChannel.java) 会先检查 Channel 是否打开、是否非阻塞，再创建或复用 Key。稳定结论是：注册不是“把对象塞进一个 Set”，它需要满足模式约束并维护 Channel 与 Selector 的关联。

```java
// OpenJDK 21 源码关键分支，已裁剪
if (blocking) {
    throw new IllegalBlockingModeException();
}
```

### 13. 什么是 Scattering Read 和 Gathering Write？

**面试一句话：** Scattering Read 把一次读取按顺序写入多个 Buffer，Gathering Write 把多个 Buffer 按顺序一次性写出，适合把协议头与消息体分开处理。

例如读取时先填 8 字节固定头，再填 body Buffer；发送时把 header Buffer 与 body Buffer 一起交给 `SocketChannel.write(ByteBuffer[])`。部分写仍然可能发生，不能假设数组中的所有 Buffer 都一次发完。

### 14. 非阻塞 `read()` 和 `write()` 的返回值要怎样处理？

**面试一句话：** 非阻塞读取返回正数表示读到字节、0 表示暂时无数据、-1 表示对端关闭；非阻塞写入可能只写出一部分，剩余数据必须保存并等待后续可写事件继续发送。

大白话：读不到数据是“现在没货”，不是“店关了”；写不完是“货车一次装不下”，不是“已经全部送达”。

### 15. `OP_READ`、`OP_WRITE`、`OP_ACCEPT`、`OP_CONNECT` 表示什么？

**面试一句话：** 它们是 SelectionKey 的兴趣/就绪操作位：读、写、接收新连接、完成非阻塞连接；服务端最常见的是 `OP_ACCEPT` 与子连接的 `OP_READ`。

`OP_WRITE` 不表示“已经有业务数据要发”，而是“内核发送缓冲还有空间，尝试写通常不会立刻阻塞”。长期注册 `OP_WRITE` 容易造成空转，只有有待发送数据时才应关注它。

## 四、Selector 与 I/O 多路复用

### 16. 什么是 I/O 多路复用？

**面试一句话：** I/O 多路复用让一个线程通过 Selector 同时等待多个非阻塞通道的就绪事件，只有就绪的连接才执行读写，从而减少大量空闲连接的线程等待成本。

![Selector 同时监听多个连接并分发就绪事件的流程](/.image/interview/web/io-network/nio-selector-flow.svg)

重点是“一个线程管理很多连接”，而不是“一个线程同时执行业务代码”。同一线程的业务仍顺序执行，耗时任务必须拆到合适的业务线程池。

### 17. Channel 注册 Selector 的完整步骤是什么？

**面试一句话：** 先打开 Selector 和 Channel，Channel 切换为非阻塞，调用 `register` 声明感兴趣事件并可附加连接状态，随后在循环中 `select`、处理 selected keys、必要时更新 interestOps。

![NIO Channel 注册到 Selector 并进入事件循环的流程](/.image/interview/web/io-network/selector-registration.svg)

```java
SelectionKey key = channel.register(selector, SelectionKey.OP_READ);
key.attach(connectionState);
```

附件适合保存这条连接的半包 Buffer、待发送队列等状态，但不能把跨连接共享的可变数据不加保护地塞进去。

### 18. `interestOps` 和 `readyOps` 有什么区别？

**面试一句话：** `interestOps` 是应用告诉 Selector“我关心哪些事件”，`readyOps` 是本次选择后系统提示“哪些事件目前可能就绪”；前者由应用设置，后者由选择结果给出。

![SelectionKey 的兴趣集合、就绪集合与事件处理关系](/.image/interview/web/io-network/selection-key-ops.svg)

就绪只是提示，不保证下一行读写绝对不会阻塞或返回 0。官方 API 也明确建议代码能处理这种提示落空的情况，因此要始终检查实际读写返回值。

### 19. `select()`、`selectNow()` 和 `select(timeout)` 怎么选？

**面试一句话：** `select()` 会等待直到有事件、被唤醒或被中断；`selectNow()` 立即返回；`select(timeout)` 最多等待指定时间，适合事件循环兼顾定时任务。

#### 源码解析：`Selector#select`

[OpenJDK 21 `Selector`](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/nio/channels/Selector.java) 将选择操作定义为“从操作系统等待已就绪 Key”的抽象。实现类负责落到具体平台；应用层应关注其唤醒条件、超时和 selected-key 处理，而不是把某个系统调用名字当成跨平台承诺。

```java
// Selector 是抽象 API；平台实现决定如何等待就绪事件
public abstract int select() throws IOException;
```

`select()` 不是忙等；用 `selectNow()` 写无限循环而没有退避，反而容易让 CPU 空转。

### 20. 一个标准的 Selector 事件循环怎样写？

**面试一句话：** 事件循环先选择就绪 Key，遍历并移除 selected set 中的 Key，再按 accept/connect/read/write 分支处理；读写失败或对端关闭时取消 Key 并关闭 Channel。

![Selector 从 select 到分发 accept、read、write 事件的循环](/.image/interview/web/io-network/selector-event-loop.svg)

```java
while (running) {
    selector.select();
    Iterator<SelectionKey> keys = selector.selectedKeys().iterator();
    while (keys.hasNext()) {
        SelectionKey key = keys.next();
        keys.remove();
        if (!key.isValid()) continue;
        if (key.isAcceptable()) accept(key);
        if (key.isReadable()) read(key);
        if (key.isWritable()) writePending(key);
    }
}
```

这是教学骨架；生产代码还要处理单个 Key 的异常隔离、关闭顺序、待发送队列上限、定时任务和监控。

### 21. 为什么遍历 selectedKeys 时必须 `remove()`？

**面试一句话：** selected-key 集合表示本次待处理的就绪事件；处理后不移除会让同一个 Key 在后续循环中被重复处理，可能重复读写或造成空转。

大白话：调度台的“待办清单”处理完要划掉；不划掉，下一轮又会当成新任务。不能用增强 `for` 时直接修改集合，应使用 Iterator 的 `remove()`。

### 22. `wakeup()` 为什么重要？

**面试一句话：** 当其他线程需要注册新 Channel、修改 interestOps 或提交任务时，可调用 `selector.wakeup()` 让阻塞在 `select()` 的事件循环尽快返回并处理变更。

它像叫醒正在等电话的值班员。`wakeup()` 不是任务队列：跨线程交接仍需要并发安全的数据结构、明确的状态所有权和异常处理。

### 23. Selector 线程模型有哪些常见选择？

**面试一句话：** 小型服务可一个 Selector 线程同时 accept/read/write；连接或业务压力上来后，通常由一个 acceptor 把连接分发给多个 I/O Reactor，再由业务线程池处理阻塞或耗时逻辑。

![Reactor 模型中 Acceptor、I/O Reactor 与业务线程池的分工](/.image/interview/web/io-network/reactor-thread-model.svg)

一个 Channel 在同一时刻最好由一个 I/O 线程负责注册、读写和 Key 状态变更，以减少锁竞争。多线程共享同一个 Selector 并随意改 Key，往往比线程模型本身更难排查。

### 24. 为什么 `OP_WRITE` 需要按需注册和取消？

**面试一句话：** Socket 在多数时候都可写，如果一直监听 `OP_WRITE`，Selector 会不断返回该 Key 导致空转；只有待发送队列非空时才加入 `OP_WRITE`，写完后应移除它。

```java
// 有待发送数据时才关注写事件
key.interestOps(key.interestOps() | SelectionKey.OP_WRITE);

// 队列清空后取消关注，避免空转
key.interestOps(key.interestOps() & ~SelectionKey.OP_WRITE);
```

这就是网络层的局部背压：发送端跟不上时积压要有限制，不能无限把 ByteBuffer 放入内存队列。

### 25. Reactor 模型和 Proactor 模型有什么区别？

**面试一句话：** Reactor 等待“可以开始做 I/O”的就绪事件，再由应用执行读写；Proactor 先提交异步 I/O，完成后收到结果通知。Java NIO Selector 是典型 Reactor 风格，AIO 更接近 Proactor。

不要把“非阻塞”说成“异步完成”。NIO 的 Socket read 通常仍由应用在就绪通知后主动调用；AIO 则把完成结果交给回调或 Future。

## 五、文件传输与零拷贝

### 26. 零拷贝到底是什么？

**面试一句话：** 零拷贝是尽量减少用户态/内核态之间的数据复制、上下文切换或 CPU 参与的优化统称；它不意味着所有路径都完全没有任何物理复制。

![FileChannel 将文件数据更直接交给 SocketChannel 的传输路径](/.image/interview/web/io-network/file-transfer-zero-copy.svg)

`FileChannel.transferTo`/`transferFrom` 是 Java 常见入口。它能否映射到高效内核能力，与操作系统、文件类型、TLS、目标 Channel 和 JDK 实现有关；必须用真实文件大小、并发度和延迟口径压测。

### 27. `transferTo()` 有什么边界？

**面试一句话：** `transferTo()` 适合文件到目标 Channel 的批量传输，但可能出现部分传输或返回 0，调用方要循环推进位置；启用 TLS、跨平台部署和超大文件时尤其要验证行为。

#### 源码解析：`FileChannel#transferTo`

[OpenJDK 21 `FileChannel#transferTo`](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/nio/channels/FileChannel.java) 定义的是传输语义而非“必然 sendfile”的承诺。业务代码应以返回的实际传输字节数为准，不能只调用一次就假设整个文件已发完。

```java
public abstract long transferTo(
    long position, long count, WritableByteChannel target
) throws IOException;
```

### 28. 内存映射文件（MappedByteBuffer）适合什么场景？

**面试一句话：** 内存映射把文件区域映射进虚拟内存，适合大文件随机访问或进程内按页访问；它不是通用的文件读写替代方案，还要考虑页缓存、映射生命周期和操作系统资源。

大白话：像把一本大书按需要摊到桌面上，而不是一次复印整本；翻页很方便，但桌面和书架空间仍有限。映射后的资源释放不能只依赖“感觉 GC 很快”，要避免无界映射。

## 六、NIO 与上层网络工程

### 29. Java NIO 和 Netty 如何选？

**面试一句话：** Java NIO 适合学习底层机制或实现极小的自定义网络服务；生产协议服务通常优先使用 Netty，因为它封装了事件循环、Pipeline、半包处理、ByteBuf 生命周期和连接治理。

不要因“Netty 更高性能”就跳过 NIO 原理：Netty 的 EventLoop、Channel 和编解码能力正是对这些底层问题的工程化处理。详细面试题见[Netty 框架](./netty)。

### 30. NIO 服务怎样排查 CPU 高、连接卡住或内存增长？

**面试一句话：** 先区分 Selector 空转、`OP_WRITE` 常驻、事件线程阻塞、半包缓存未设上限、待发送队列积压、直接内存压力和连接未关闭，再用线程栈、连接数、事件次数、队列大小与 GC/进程内存指标定位。

常见误区是只增加 Selector 线程数。应先检查 selected key 是否被正确移除、可写兴趣是否在队列清空后取消、慢客户端是否有背压、异常路径是否取消 Key 并关闭 Channel。优化必须用压测验证吞吐、P99 延迟、CPU 和内存，而不是只看单项 QPS。

## 参考资料

- [Java SE 21 `java.nio` 概览](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/package-summary.html)
- [Java SE 21 `Selector` API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/Selector.html)
- [Java SE 21 `java.nio.channels` 包说明](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/nio/channels/package-summary.html)
- [OpenJDK 21 源码](https://github.com/openjdk/jdk21u/tree/master)

---

[← Java 核心：Java 8+](../java/modern-java) · [下一章：Netty 框架 →](./netty)
