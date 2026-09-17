---
outline: [2, 3]
---

# Java 面试题学习路线

这套题不是按博客出现顺序堆知识点，而是按面试中的追问链组织：先给能直接说出口的结论，再解释原理、代码、源码版本和失效边界。第一次复习只看高频题，第二轮再看源码与场景题。

::: tip 推荐答题顺序
先说结论，再讲原因；接着给一个代码或业务场景；最后补充版本、条件和易错点。不要一上来背源码数字，也不要只说“底层是某某数据结构”。
:::

## 六章边界

| 顺序 | 章节 | 高频主线 | 不在本章重复讲 |
| --- | --- | --- | --- |
| 1 | [Java 基础](./basic) | 运行方式、对象、字符串、异常、泛型、反射 | 集合结构、JVM 调优 |
| 2 | [Java 集合](./collections) | List、Set、Map、Queue、迭代与选型 | JMM、线程池 |
| 3 | [并发正确性](./concurrency) | JMM、volatile、锁、CAS、AQS、并发容器 | 线程创建和任务调度 |
| 4 | [多线程与线程池](./multithreading) | 线程状态、中断、线程池、Future、虚拟线程 | 共享变量的内存语义 |
| 5 | [JVM](./jvm) | 内存、GC、类加载、JIT、线上排查 | Java 语法和集合 API |
| 6 | [现代 Java](./modern-java) | Lambda、Stream、Optional、时间、record、模式匹配 | 虚拟线程的调度细节 |

并发与多线程容易混在一起。本题库把“共享状态怎样保证正确”放在并发章，把“任务怎样创建、排队、取消和隔离”放在线程章；同一个概念只保留一个主讲位置，其他页面只做链接。

## 按时间复习

### 30 分钟：先过高频题

1. Java 怎样编译和运行？`==`、`equals()`、`hashCode()` 有什么关系？
2. ArrayList 和 LinkedList 怎么选？HashMap 怎样定位 Key？
3. JMM 解决什么问题？volatile、synchronized、CAS 分别保证什么？
4. 线程池的参数和执行流程是什么？怎样停止任务？
5. JVM 运行时区域有哪些？G1 的基本思路是什么？
6. Stream、Optional 和 `java.time` 各自解决什么问题？

### 2 小时：补上追问链

- 基础：值传递、泛型擦除、异常关闭、注解和反射。
- 集合：扩容、树化、比较器、fail-fast、并发集合。
- 并发：happens-before、锁选择、ABA、AQS、ThreadLocal。
- 多线程：状态转换、死锁、队列与拒绝策略、Future、虚拟线程。
- JVM：可达性、收集算法、类加载、OOM 与 CPU 排查。
- 现代 Java：惰性计算、并行流、不可变数据、模式匹配和模块边界。

### 完整学习：能验证而不是只会背

每章至少完成四件事：运行一个最小示例；能指出一个常见误区；能说清一种工程取舍；能从固定版本的规范或源码找到验证入口。

## 题目优先级怎么看？

- **高频题：** Java 后端面试经常作为起点，必须能在 30 秒内先给结论。
- **追问题：** 用来判断是否真正理解机制，通常需要代码、图或源码入口。
- **场景题：** 不只有唯一答案，要先确认数据规模、并发方式、延迟目标和失败恢复。
- **版本题：** JDK 实现可能变化，回答时先讲稳定语义，再限定 OpenJDK 21 的实现。

“热门”只用于决定先学什么，不用于证明技术结论。文中的语言语义以 Java SE 21 规范为准，实现细节以固定的 OpenJDK 21 源码为准。

## 选题参考与核验原则

- [JavaGuide Java 知识体系](https://javaguide.cn/java/)：用于对照基础、集合、并发、JVM 与新特性的常见覆盖范围。
- [JavaGuide 面试突击版](https://interview.javaguide.cn/home.html)：用于识别高频题和突击复习路径。
- [二哥的 Java 进阶之路](https://www.javabetter.cn/sidebar/sanfene/javathread.html)：用于参考问答分组、图解和追问组织方式。
- [Java SE 21 规范](https://docs.oracle.com/en/java/javase/21/docs/specs/)与 [OpenJDK 21 源码](https://github.com/openjdk/jdk/tree/jdk-21-ga)：用于核验最终技术结论和版本边界。

本站不复制博客答案：热门资料决定“哪些题先讲”，规范、JEP 与固定版本源码决定“答案能否成立”。

## Java 核心之后学什么？

完成六章后，按[面试学习地图](../question)进入 Spring、MySQL、Redis、消息队列、分布式系统和 AI Agent；需要按技术名查找时使用[技术索引](../technology-index)。

---

[开始：Java 基础 →](./basic)
