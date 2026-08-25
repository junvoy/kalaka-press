---
outline: [2, 3]
---

# 现代 Java 怎样表达行为、数据与边界

现代 Java 的基本矛盾不是“语法越来越多”，而是程序需要组合行为、约束状态、表达缺失与时间、隔离依赖，代码又必须保持静态可检查和可维护。Lambda、Stream、Optional、`java.time`、record、`var` 与 JPMS，是这些问题在不同边界上的设计选择。

## 目标：不预设新语法

我们要解决的问题是：在不牺牲 Java 静态类型、可读性和错误边界的前提下，怎样让行为可以组合、数据含义可以被类型表达、模块依赖可以被检查？

学习后应当能够：

1. 从“行为需要传递”推导函数式接口、Lambda 与方法引用。
2. 从“数据变换与副作用必须分离”推导 Stream 的流水线和终止边界。
3. 从“缺失、时间和数据载体都需要明确语义”推导 Optional、`java.time` 与 record。
4. 区分 `var` 的局部类型推断和动态类型。
5. 从封装与依赖图推导 JPMS，并说清它没有解决的问题。
6. 区分语言保证、API 契约与 OpenJDK 21 的实现细节。

::: tip 本章边界
本章只解释现代 Java 特性的设计约束。集合存储结构见 [Java 集合如何从操作约束中产生](./collections)，任务并行与线程池容量见 [多线程与任务调度](./multithreading)。
:::

## 拆掉现成答案

| 常见说法 | 分类 | 被隐藏的条件 |
| --- | --- | --- |
| Lambda 就是匿名内部类的语法糖 | 过度简化 | 两者的作用域、`this`、目标类型和字节码实现并不等价 |
| Stream 一定比循环快 | 错误绝对化 | 流水线有包装与调度成本，性能取决于数据规模、操作和运行环境 |
| `parallelStream()` 会自动利用多核提速 | 缺条件结论 | 任务必须可拆分、计算量足够、无共享副作用，且公共线程池不能被阻塞拖住 |
| Optional 能消灭空指针 | 工具能力夸大 | 它只显式表达一个边界的缺失，调用方仍可误用，其他引用仍可能为 null |
| record 是不可变对象 | 条件结论 | record 组件引用不能重新赋值，但其引用的集合或对象仍可能变化 |
| `var` 是动态类型 | 概念错误 | 编译器在局部变量声明处确定一个静态类型，运行期不会变型 |
| 模块化可以解决依赖版本冲突 | 边界误判 | JPMS 检查可读性与包导出，不负责 Maven/Gradle 的依赖版本选择 |
| 新 API 应当替换所有旧写法 | 手段先行 | 特性只有在降低歧义和维护成本时才有价值，复杂业务流程可能仍适合命名方法和普通循环 |

## 从基本事实重新构造

### 从行为需要传递推导函数式接口

排序、过滤、重试和回调都包含两部分：稳定的控制结构，以及调用方想替换的一小段行为。如果每种行为都复制一遍控制结构，代码会重复；如果行为以无类型的文本传入，编译器又无法检查参数和结果。

Java 已有的最小模型是接口：用一个抽象方法描述“输入什么、输出什么”。当接口只有一个抽象方法时，一个行为就能成为该接口的实现：

```java
@FunctionalInterface
interface Retryable<T> {
    T run() throws Exception;
}

Retryable<String> request = () -> client.fetch();
```

这就是函数式接口。`@FunctionalInterface` 不是成为函数式接口的必要条件，但它让编译器验证“只能有一个抽象方法”的设计意图。`default`、`static` 方法和与 `Object` 公有方法同签名的方法不会增加这个抽象方法计数。

Lambda 在 Java 8 成为语言特性，它不是脱离类型存在的函数值，而是依赖上下文获得 **目标类型**。同一个 `x -> x + 1` 可以适配不同的兼容函数式接口；没有目标类型时，编译器无法确定它是什么。

### 从已有行为推导方法引用

如果 Lambda 只负责把参数转交给一个已有方法，它没有新增决策：

```java
names.forEach(name -> System.out.println(name));
names.forEach(System.out::println);
```

方法引用保留相同目标类型，只删除重复的参数转交。它适合让行为名称更清楚的场景；如果读者还要反推接收者和参数映射，显式 Lambda 或命名方法更容易验证。

常见形式是静态方法 `Integer::parseInt`、特定对象实例方法 `logger::info`、任意对象实例方法 `String::trim` 和构造器 `User::new`。这些是语法形式，不改变被引用方法本身的副作用和异常边界。

### 从生命周期差异推导 effectively final

方法局部变量随一次调用存在，Lambda 却可能被返回并在方法结束后执行。若 Lambda 直接共享可变的栈变量，“修改的是哪个调用的哪个槽位”将没有稳定模型。Java 因此只允许捕获 final 或 **事实上的 final** 局部变量，也就是初始化后不再重新赋值的变量：

```java
int threshold = 10;
Predicate<Integer> large = value -> value > threshold;
```

捕获的是值；实例字段和静态字段通过对象或类访问，不受局部变量规则限制，但仍可能产生并发数据竞争。把可变数组或单元素集合当作绕过规则的计数器，只是把问题藏进对象；并发计数仍需原子类、锁或状态隔离。

Lambda 中的 `this` 指向外围实例，而匿名内部类的 `this` 指向新对象。这也是“Lambda 等于匿名内部类语法糖”不能作为语言模型的原因。

### 从存储与计算分离推导 Stream

Collection 的责任是持有和组织元素；一次查询的责任是描述元素怎样经过筛选、映射和聚合。把两者分开后，处理过程可以形成流水线：

```text
数据源 → 中间操作描述 → 中间操作描述 → 终止操作触发消费
```

```java
List<String> result = names.stream()
    .filter(name -> name.length() >= 2)
    .map(String::toUpperCase)
    .toList();
```

Stream 通常不存储数据，它描述一次消费过程。`filter`、`map` 等中间操作是惰性的，终止操作到来后才遍历来源；一个 Stream 被终止消费后不能再次使用。这使实现可以融合操作和短路，但 API 契约并不保证它一定比循环快。

当每个输入恰好产生一个结果时使用 `map`；当每个输入产生零到多个结果，而目标需要一个扁平序列时使用 `flatMap`：

```java
Stream<Item> items = orders.stream()
    .flatMap(order -> order.items().stream());
```

如果使用 `map(Order::items)`，得到的是 `Stream<List<Item>>`。两者差异来自输出基数和嵌套层级，不是名字偏好。

### 从可推理性推导副作用边界

同一个输入若可能因为隐藏状态得到不同结果，流水线就难以重排、并行和测试。因此中间操作应尽量是无状态、无干扰的转换：

- `filter` 用条件决定元素是否保留，不负责修改业务状态。
- `peek` 让元素经过时执行观察动作，主要用于调试；短路或没有终止操作时，它未必覆盖所有元素。
- `forEach` 是终止操作，可以执行副作用，但顺序、异常、事务和重试必须显式设计。

数据库写入、发消息和跨元素共享计数若藏在长 Stream 中，会让失败发生在哪个边界难以判断。需要逐步处理、补偿或中途退出的业务流程，命名方法与普通 `for` 循环往往更诚实。

### 从结果所有权推导列表收集方式

流水线终止时，调用方必须知道结果是否允许修改。Java 16 增加的 `Stream.toList()` 在 API 契约上返回不可修改的 List；对它调用修改方法会抛出 `UnsupportedOperationException`，具体实现类没有保证。

`collect(Collectors.toList())` 不承诺返回类型、可修改性、可序列化性和线程安全，不能把当前实现常见的 `ArrayList` 当作契约。明确需要可变 `ArrayList` 时，直接声明意图：

```java
List<String> mutable = stream.collect(
    Collectors.toCollection(ArrayList::new)
);
```

选择依据不是哪种写法更短，而是结果的所有权与修改协议是否清楚。

### 从可分解计算推导 parallelStream

并行收益必须大于拆分、调度、合并和协调成本。最小近似可以写成：

```text
并行总耗时 ≈ 拆分成本 + 最慢分片计算 + 合并成本 + 竞争与调度成本
```

因此 `parallelStream()` 只有在数据可高效拆分、单元素计算足够重、操作独立且环境允许共享公共 ForkJoinPool 时才可能受益。阻塞 I/O 不会因为改成并行流就获得更多数据库连接或下游容量，反而可能占住公共工作线程。

并行 `forEach` 不保证 encounter order；要求顺序可以使用 `forEachOrdered`，但协调会削弱并行收益。线上决定前应在真实数据量、部署 CPU 和同机负载下基准测试，而不是从核数直接推导性能。

### 从“可能不存在”推导 Optional

普通引用同时承担“有对象”和“没有对象”两种状态，但方法签名 `User find(id)` 看不出缺失是否正常。Java 8 的 Optional 把这两个状态提升到返回类型：

```java
Optional<User> findUser(long id)
```

它的价值是让调用方在返回边界选择 `map`、`orElseGet`、`orElseThrow` 等策略，不是让所有 null 自动消失。`orElse` 会先计算备用值；只有备用值昂贵或有副作用时，才需要用 `orElseGet` 延迟计算。

Optional 更适合作为“结果可能缺失”的返回值。把它普遍用于字段、方法参数、集合元素或序列化模型，可能增加框架兼容和嵌套复杂度。集合没有元素时通常返回空集合，因为集合本身已经能表达零个结果。

### 从三种时间事实推导 java.time

“2026-08-25 09:00”至少可能表达三件不同的事：

| 事实 | 合适类型 | 典型场景 |
| --- | --- | --- |
| 日历上的日期或本地时间，不指向全球唯一瞬间 | `LocalDate`、`LocalTime`、`LocalDateTime` | 生日、门店每天开门时间 |
| UTC 时间线上的唯一瞬间 | `Instant` | 审计事件、跨系统排序 |
| 某个地区时区规则下的日期时间 | `ZonedDateTime` | 跨时区预约、夏令时换算 |

Java 8 的 `java.time` 把这些语义拆成不同的不可变类型。`OffsetDateTime` 携带固定偏移，`ZonedDateTime` 携带地区规则；偏移 `+08:00` 不等于时区 `Asia/Taipei`，因为地区规则可能随历史和政策变化。

系统边界应先定义业务时间语义，再选择类型和序列化格式。服务器默认时区是部署配置，不是业务规则；单纯把 `Date` 替换成 `LocalDateTime` 也不能解决跨时区事实丢失。

### 从数据载体的不变量推导 record

有些类的身份完全由一组组件决定，主要责任是承载数据。手写构造器、访问器、`equals`、`hashCode` 和 `toString` 会重复这个声明。record 在 Java 16 正式稳定，用更短的形式声明这种数据聚合：

```java
public record OrderLine(long productId, int quantity, List<String> tags) {
    public OrderLine {
        if (quantity <= 0) throw new IllegalArgumentException("quantity");
        tags = List.copyOf(tags);
    }
}
```

record 组件对应的字段是 private final，生成的访问器不带 `get` 前缀；record 类隐式 final。它保证组件引用不能重新赋值，却不递归冻结被引用对象，所以可变集合仍需防御性复制。record 也不会自动提供领域校验、持久化兼容或业务封装。

### 从局部重复信息推导 var

局部变量初始化式有时已经完整给出类型，重复书写长泛型会增加噪声。Java 10 的 `var` 让编译器从初始化式推断静态类型：

```java
var users = new ArrayList<User>(); // 静态类型仍是 ArrayList<User>
```

它只适用于有初始化式的局部变量、增强 for 变量和部分资源变量，不能替代字段、方法参数或返回类型。`var` 不是关键字形式的 `Object`，也不会让变量在运行期改变类型。

是否使用取决于读者能否从右侧和变量名立即恢复含义。`var user = repository.findRequired(id)` 可能清楚；`var result = service.execute()` 可能隐藏重要类型。省字符不是独立目标。

### 从依赖图与封装推导 JPMS

大型系统需要回答两个问题：一个组件依赖哪些组件，以及哪些包真的是对外 API。传统 classpath 把 JAR 放进一个扁平搜索空间，public 类型通常可被其他代码访问，缺失依赖往往到加载路径才暴露。

Java 9 的 JPMS 用 `module-info.java` 声明可读依赖和导出边界：

```java
module com.example.order {
    requires java.sql;
    exports com.example.order.api;
}
```

模块系统可以在解析阶段检查依赖图，只让 `exports` 的包成为普通外部访问边界，并支持 `jlink` 组合定制运行镜像。但它不选择 Maven/Gradle 依赖版本、不自动拆分循环依赖，也不让反射框架天然可访问未开放包；深度反射需要显式 `opens`。

许多 Spring 应用仍运行在 classpath 上。是否迁移 JPMS 应由强封装、镜像裁剪、依赖治理收益与框架兼容成本共同决定，不能因为 JDK 支持就推导为所有项目必选。

## 固定版本的实现与规范验证

本章以 Java SE 21 的语言和 API 契约为当前基线，以 OpenJDK `jdk-21-ga` 观察一种固定实现：

- [JLS 21 第 15.27 节：Lambda Expressions](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.27)：目标类型、参数和作用域等语言规则。
- [JLS 21 第 14.4 节：局部变量声明](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.4)：`var` 与局部变量的语言边界。
- [Stream API（Java 21）](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html) 与 [Optional API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html)：惰性、无干扰、终止消费和结果契约。
- [`java.time` 包规范](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html)：时间线、本地时间、偏移与时区类型。
- [JEP 395：Records](https://openjdk.org/jeps/395)、[JEP 286：Local-Variable Type Inference](https://openjdk.org/jeps/286)、[JEP 261：Module System](https://openjdk.org/jeps/261)：稳定版本与设计目标。
- [OpenJDK `jdk-21-ga`](https://github.com/openjdk/jdk/tree/jdk-21-ga)：固定实现入口；`java.util.stream`、`java.util.Optional` 和 `java.lang.invoke` 可用于追踪当前实现。

JLS 和 Java API 定义可依赖的保证；JEP 解释特性目标与历史；OpenJDK 源码只证明 JDK 21 这个版本如何实现，不能反向扩大语言契约。

## 最小实验：让结论可以被反驳

### 实验：惰性与短路

给 `peek` 增加计数，分别在没有终止操作、使用 `findFirst()` 和使用 `toList()` 时执行。观察计数差异，证伪“声明中间操作就会立即逐个执行”。

### 实验：结果所有权

分别对 `stream.toList()`、`stream.collect(Collectors.toList())` 和 `toCollection(ArrayList::new)` 的结果调用 `add`。只把 API 明确承诺的性质写进生产代码，不根据当前具体类名推断未来行为。

### 实验：并行不是免费提速

用 JMH 对小列表、百万级列表、轻量映射和 CPU 密集映射分别比较循环、串行 Stream 与 parallel Stream。固定 JDK、核心数和预热条件，同时记录同进程其他公共池任务的延迟。

### 实验：时间并非普通字符串

选择有夏令时切换的 `ZoneId`，把切换附近的 `LocalDateTime` 转成 `ZonedDateTime`，观察不存在或重复的本地时间。再用 `Instant` 往返验证时间线事实不依赖服务器默认时区。

### 实验：record 只是浅层不变

把可变 List 传给不做复制的 record，构造后修改原 List；再加入 `List.copyOf` 比较结果。该实验直接证伪“组件字段 final 就等于整个对象深度不可变”。

## 验证与证伪

| 假设 | 改变条件 | 证伪信号 |
| --- | --- | --- |
| Lambda 就是匿名内部类缩写 | 在两者内部读取 `this` | 指向对象与作用域不同 |
| Stream 中间操作会立刻执行 | 移除终止操作 | 中间流水线没有消费来源 |
| `peek` 能可靠执行每个元素的业务动作 | 换成短路终止操作 | 只处理满足终止条件所需的部分元素 |
| parallel Stream 一定更快 | 减少数据量或加入阻塞 I/O | 调度成本或线程占用使延迟上升 |
| Optional 已经消灭 null | 从外部框架返回 null 或调用 `get()` | 仍然可能发生空指针或 NoSuchElementException |
| `LocalDateTime` 可以唯一表示跨系统事件 | 更换时区或落在夏令时切换点 | 同一文本无法唯一定位时间线瞬间 |
| record 天然深度不可变 | 修改组件引用的可变集合 | record 观察到集合内容变化 |
| JPMS 解决依赖版本冲突 | 引入同一库的冲突版本 | 仍需要构建工具完成版本解析 |

## 工程取舍与失败边界

- Lambda 降低短行为的样板代码，但复杂分支没有名字时会降低可读性和堆栈定位能力。
- Stream 强化声明式数据变换，副作用、逐步补偿和复杂异常流程则可能更适合显式循环。
- parallel Stream 复用公共资源很方便，也弱化线程池隔离、容量和取消控制；生产并行任务要先验证资源边界。
- Optional 让返回值缺失显式化，却不能替代输入校验、领域错误和序列化协议。
- `java.time` 提供准确类型，前提是业务先决定保存时间线事实、本地规则还是地区时区。
- record 减少数据类样板，但浅层不变、继承限制和框架映射要求仍需评估。
- `var` 减少重复类型，也可能隐藏对理解重要的信息；可读性由上下文决定。
- JPMS 提供强封装和可验证依赖图，同时带来模块拆分、反射开放和生态兼容成本。

## 理解自测与面试表达

以下 14 个标题保持原样。每题先说要消除的歧义，再推导机制，最后给出不成立的条件。

### 1. 什么是 Lambda 表达式？

**正文定位：** 行为的目标类型。**反事实追问：** 没有函数式接口上下文时，Lambda 为什么无法独立确定类型？**表达骨架：** 30 秒按“稳定控制结构—可替换行为—目标类型—适合短逻辑”回答。

### 2. 什么是函数式接口？`@FunctionalInterface` 有什么用？

**正文定位：** 单一抽象行为契约。**反事实追问：** 有多个 default 方法为什么仍可能是函数式接口？**表达骨架：** 30 秒讲一个抽象方法、Lambda 适配、注解检查和常见 Predicate/Function。

### 3. 方法引用是什么？何时使用？

**正文定位：** 已有行为的参数转交。**反事实追问：** 方法引用更短时为什么仍可能改回 Lambda？**表达骨架：** 30 秒给等价例子，再以可读性而不是字符数作为选择条件。

### 4. Lambda 能访问外部变量吗？

**正文定位：** 局部变量生命周期。**反事实追问：** 用单元素数组绕过 effectively final 是否因此线程安全？**表达骨架：** 3 分钟讲局部捕获、事实 final、字段共享和匿名内部类 `this` 差异。

### 5. Stream 和 Collection 有什么区别？

**正文定位：** 数据存储与一次计算。**反事实追问：** 为什么 Stream 终止后不能重复使用？**表达骨架：** 30 秒讲来源、流水线、惰性中间操作、终止消费和不保证更快。

### 6. `map()` 和 `flatMap()` 有什么区别？

**正文定位：** 输出基数与嵌套层级。**反事实追问：** `map(Order::items)` 为什么不会自动得到所有 Item？**表达骨架：** 30 秒用一对一与一对多展开对比类型结果。

### 7. `filter`、`peek` 和 `forEach` 应该怎样用？

**正文定位：** 纯变换与副作用边界。**反事实追问：** `findFirst` 前的 peek 为什么不保证处理全部元素？**表达骨架：** 3 分钟讲筛选、观察、终止副作用，以及数据库写入应显式管理失败。

### 8. Stream 的 `toList()`、`collect(toList())` 有什么区别？

**正文定位：** 结果所有权与 API 契约。**反事实追问：** 当前 `Collectors.toList()` 返回 ArrayList，为什么仍不能依赖？**表达骨架：** 30 秒讲不可修改保证、无具体实现保证和明确可变集合写法。

### 9. `parallelStream()` 为什么不能随便用？

**正文定位：** 可分解计算的成本模型。**反事实追问：** 数据库连接只有 20 个时，增加并行线程为什么不会增加下游容量？**表达骨架：** 3 分钟讲拆分、粒度、副作用、公共池、阻塞与基准验证。

### 10. Optional 是用来解决什么问题的？

**正文定位：** 返回值的显式缺失。**反事实追问：** 为什么空集合通常比 `Optional<List<T>>` 更自然？**表达骨架：** 30 秒讲签名表达、调用方策略、适用返回值和不能消灭所有 null。

### 11. 为什么推荐 `java.time`，而不是 Date 和 Calendar？

**正文定位：** 时间事实的类型拆分。**反事实追问：** `LocalDateTime` 为什么不能唯一表示全球事件？**表达骨架：** 3 分钟区分本地时间、Instant、偏移和地区时区，再讲不可变与系统边界。

### 12. `record` 是什么？适合什么场景？

**正文定位：** 以组件定义身份的数据聚合。**反事实追问：** record 包含 ArrayList 时为什么不一定不可变？**表达骨架：** 30 秒讲生成成员、数据载体场景、浅层不变和防御性复制。

### 13. `var` 能在哪些地方使用？

**正文定位：** 局部静态类型推断。**反事实追问：** 为什么不能写没有初始化式的 `var value;`？**表达骨架：** 30 秒讲 Java 10、局部范围、编译期确定和可读性条件。

### 14. 什么是 Java 模块化（JPMS）？

**正文定位：** 可读依赖图与包导出边界。**反事实追问：** 已经使用 Maven 后，JPMS 还解决了什么、又没有解决什么？**表达骨架：** 3 分钟讲 `requires/exports/opens`、解析检查、jlink、版本选择边界和迁移成本。

## 权威参考

- [Java Language Specification 21](https://docs.oracle.com/javase/specs/jls/se21/html/index.html)
- [Java SE 21 API](https://docs.oracle.com/en/java/javase/21/docs/api/)
- [OpenJDK `jdk-21-ga` 固定源码](https://github.com/openjdk/jdk/tree/jdk-21-ga)
- [JEP 395：Records](https://openjdk.org/jeps/395)
- [JEP 286：Local-Variable Type Inference](https://openjdk.org/jeps/286)
- [JEP 261：Module System](https://openjdk.org/jeps/261)

---

[← 上一章：JVM](./jvm) · [下一层：Web 与网络 →](../web/io-network)
