---
outline: [2, 3]
---

# 现代 Java：从 Java 8 到 Java 21

“Java 8+”不应该只剩 Lambda 和 Stream。本章按 Java 21 可用能力整理行为传递、数据流水线、缺失值、时间、不变数据、模式匹配和模块边界；虚拟线程的调度与过载问题放在[多线程章节](./multithreading)。

## Lambda 与行为传递

### 1. Lambda 表达式和函数式接口是什么？

**直接回答：** Lambda 是函数式接口实例的简洁写法；函数式接口只有一个抽象方法，因此编译器知道这段行为要匹配什么参数和返回类型。`@FunctionalInterface` 用来让编译器检查这个约束，不是 Lambda 生效的必要条件。

```java
Predicate<Order> paid = order -> order.status() == PAID;
List<Order> result = orders.stream().filter(paid).toList();
```

Lambda 本身没有脱离上下文的固定类型，它依赖目标类型推断。接口仍可以有 Object 公共方法、default 和 static 方法；判断“一个抽象方法”时要按 JLS 的函数式接口规则，而不是机械数源码行数。

### 2. 方法引用是什么？什么时候使用？

**直接回答：** 方法引用是在已有方法刚好满足目标函数式接口时，用 `类型或对象::方法` 复用该行为。它没有增加新的运行能力，只是让“参数原样传给已有方法”的 Lambda 更紧凑。

```java
orders.stream()
      .map(Order::id)
      .forEach(logger::info);
```

如果省略参数后反而难以理解接收者、参数顺序或异常边界，就保留显式 Lambda。可读性比“代码字符更少”更重要。

### 3. Lambda 为什么只能捕获 final 或 effectively final 的局部变量？

**直接回答：** 局部变量随栈帧结束，而 Lambda 可能稍后执行；Java 捕获的是局部变量当时的值。要求变量不再重新赋值，可以避免“捕获变量后来到底是什么”的歧义。

```java
String prefix = "order-";
Function<Long, String> formatter = id -> prefix + id;
// prefix = "new-"; // 再赋值后便不满足 effectively final
```

这不代表捕获对象完全不可变：final 引用指向的 List 内容仍可能变化。并行使用时仍要检查共享可变对象的线程安全。

## Stream：数据怎样流过一条管道

### 4. Stream 和 Collection 有什么区别？

**直接回答：** Collection 主要保存和管理数据，Stream 描述对数据源的一次计算管道。中间操作通常惰性，遇到终止操作才真正拉取元素；Stream 一般只能消费一次。

```java
Stream<String> pipeline = names.stream()
    .filter(name -> name.length() > 2)
    .map(String::toUpperCase);

List<String> result = pipeline.toList(); // 到这里才触发计算
```

Stream 不会天然修改原集合，也不保证更快。它换来的是组合、惰性和可读的数据变换表达；有复杂控制流或大量副作用时，普通循环可能更清晰。

### 5. `map()` 和 `flatMap()` 有什么区别？

**直接回答：** map 把一个元素转换成一个结果；flatMap 先把一个元素转换成一个 Stream，再把多层结果摊平成同一条流。

```java
List<String> itemIds = orders.stream()
    .flatMap(order -> order.items().stream())
    .map(Item::id)
    .toList();
```

如果使用 map 得到 `Stream<List<Item>>` 或 `Stream<Optional<T>>`，而业务真正需要内部元素，通常才考虑 flatMap；不要为了“高级”而把本来清楚的嵌套结构强行拍平。

### 6. `filter`、`peek` 和 `forEach` 应该怎样用？

**直接回答：** filter 根据条件保留元素；peek 是中间操作，主要用于观察流水线；forEach 是终止消费。不要依赖 peek 完成必须发生的业务副作用，因为没有终止操作或被短路时，它可能不执行全部元素。

```java
List<Order> paid = orders.stream()
    .filter(Order::isPaid)
    .peek(order -> log.debug("paid={}", order.id()))
    .toList();
```

数据库写入、发消息等副作用最好放在明确的业务步骤，不要藏在 map、filter 或 peek 中。并行流下 `forEach` 也不保证遇到顺序，需要顺序语义时使用 `forEachOrdered` 并评估性能。

### 7. `Stream.toList()` 和 `collect(toList())` 有什么区别？

**直接回答：** Java 16 起 `Stream.toList()` 返回不可修改的 List；`Collectors.toList()` 不承诺具体类型和可修改性，当前实现行为也不应被当成永久契约。明确需要可变 ArrayList 时使用 `toCollection(ArrayList::new)`。

```java
List<Order> immutableResult = orders.stream().toList();

List<Order> mutableResult = orders.stream()
    .collect(Collectors.toCollection(ArrayList::new));
```

还要区分“集合结构不可修改”和“元素对象不可变”：即使 List 不能 add，其中的 Order 仍可能被修改。

### 8. `parallelStream()` 为什么不能随便用？

**直接回答：** 并行流把可拆分计算提交给公共 ForkJoinPool，适合数据量足够大、计算成本较高、操作无共享副作用且容易拆分的 CPU 计算；小任务、阻塞 I/O、有序处理或共享可变状态可能更慢、更难控。

并行流使用公共池，可能与进程中的其他并行任务互相影响；线程数也不能突破数据库连接等下游容量。是否提速要用真实数据和 JMH/性能剖析验证，不能用一次循环计时下结论。

## 缺失值与时间

### 9. Optional 是用来解决什么问题的？

**直接回答：** Optional 让“结果可能不存在”进入返回类型，迫使调用方显式选择默认值、转换、继续组合或抛错。它不是消灭 null 的魔法，也不适合无差别地用于所有字段和参数。

```java
return repository.findById(id)
    .filter(User::active)
    .map(User::profile)
    .orElseThrow(() -> new UserNotFoundException(id));
```

`orElse(value)` 会先计算 value，即使 Optional 有值；默认值创建昂贵时使用 `orElseGet(supplier)`。Optional 主要适合方法返回边界，实体序列化、框架绑定和高频字段要结合工具支持判断。

### 10. 为什么推荐 `java.time`，而不是 Date 和 Calendar？

**直接回答：** `java.time` 用不可变且语义明确的类型区分时间线时刻、本地日期时间、固定偏移和地区时区，减少旧 API 的可变性、月份规则和线程安全问题。

```java
Instant createdAt = Instant.now();
ZonedDateTime local = createdAt.atZone(ZoneId.of("Asia/Taipei"));
```

`Instant` 表示时间线上的点；`LocalDateTime` 没有时区或偏移，不能独自代表全球唯一时刻；`OffsetDateTime` 带固定偏移；`ZonedDateTime` 带地区规则。`+08:00` 不等于 `Asia/Taipei`，后者的规则可能包含历史与政策变化。

## 数据建模与模式匹配

### 11. record 是什么？适合什么场景？

**直接回答：** record 用紧凑语法声明以数据为主要职责的类，编译器提供 final 字段、访问器、构造器以及基于组件的 equals、hashCode 和 toString。适合 DTO、值对象和事件载体，不适合依赖可变继承层次的实体。

```java
record Money(long cents, String currency) {
    Money {
        if (cents < 0) throw new IllegalArgumentException("negative");
        Objects.requireNonNull(currency);
    }
}
```

record 只是浅层不变：组件若是可变 List，外部仍可能修改其内容。需要真正值语义时，应在构造器中防御性复制，并避免泄漏可变内部对象。

### 12. sealed class 解决什么问题？

**直接回答：** sealed class/interface 显式限制允许直接继承或实现它的类型，让领域中的类型集合保持受控。允许的子类型必须声明为 final、sealed 或 non-sealed。

```java
sealed interface PaymentResult permits Paid, Rejected, Pending {}
record Paid(String tradeNo) implements PaymentResult {}
record Rejected(String reason) implements PaymentResult {}
record Pending() implements PaymentResult {}
```

它适合结果状态、命令、表达式树等“变体集合相对封闭”的模型。插件扩展点需要第三方不断新增实现时，sealed 反而会限制演进。

### 13. Java 21 的模式匹配能带来什么？

**直接回答：** `instanceof` 模式、switch 模式和 record pattern 让“先判断类型、再取出数据”的代码更直接，并能结合 sealed 类型做更完整的分支检查。它减少模板代码，但不会替代领域多态。

```java
static String describe(PaymentResult result) {
    return switch (result) {
        case Paid(var tradeNo) -> "成功：" + tradeNo;
        case Rejected(var reason) -> "失败：" + reason;
        case Pending() -> "处理中";
    };
}
```

分支顺序、null 处理和穷尽性受 JLS 规则约束。只是按类型读取数据时模式匹配很合适；行为本来就属于各子类型时，把大量业务逻辑集中到 switch 可能重新制造耦合。

### 14. `var` 有什么用？能在哪里使用？

**直接回答：** `var` 让编译器从初始化表达式推断局部变量的静态类型，减少重复类型名；它只能用于满足条件的局部变量声明，不能用于字段、方法参数或返回类型，也不是动态类型。

```java
var ordersById = new HashMap<String, Order>();
```

右侧类型清楚时 var 能减少噪声；初始化表达式复杂、变量名含糊或类型信息对阅读很重要时，显式类型更清楚。变量类型在编译期已经确定，后续不能指向任意无关类型。

## 模块边界

### 15. JPMS 是什么？

**直接回答：** Java Platform Module System 用 `module-info.java` 声明模块读取哪些依赖、对外导出哪些包以及使用/提供哪些服务，从编译期和运行期加强依赖图与封装边界。

```java
module com.example.order {
    requires java.sql;
    exports com.example.order.api;
}
```

JPMS 解决的是模块级可读性与封装，不等于 Maven/Gradle 的依赖下载，也不自动形成微服务。已有大型 classpath 项目迁移时，要评估自动模块、反射访问和第三方库兼容，不能只加一个描述文件。

## 面试表达与验证

### 30 秒回答骨架

> 现代 Java 的主线不是语法变多，而是让行为、缺失值、时间和数据边界更明确。Lambda 配合函数式接口传递行为，Stream 组合惰性计算，Optional 表达可能缺失，record 和 sealed 类型约束数据模型，Java 21 的模式匹配减少类型判断模板代码。所有便利 API 都要补充副作用、可变性和并行边界。

### 最小验证清单

- 在没有终止操作时加入 peek，验证惰性执行。
- 对 `Stream.toList()` 的结果调用 add，确认不可修改契约。
- 比较 `orElse(expensive())` 与 `orElseGet(...)` 的求值时机。
- 给 record 传入可变 List，再修改原 List，验证为什么只是浅层不变。
- 对 sealed 层次新增子类型，观察 switch 穷尽性检查。

## 权威参考

- [JLS 21 第 15.27 节：Lambda Expressions](https://docs.oracle.com/javase/specs/jls/se21/html/jls-15.html#jls-15.27)
- [Java SE 21 Stream API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/stream/Stream.html)
- [Java SE 21 Optional API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Optional.html)
- [Java SE 21 `java.time`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html)
- [JEP 409：Sealed Classes](https://openjdk.org/jeps/409)
- [JEP 440：Record Patterns](https://openjdk.org/jeps/440)
- [JEP 441：Pattern Matching for switch](https://openjdk.org/jeps/441)

---

[← 上一章：JVM](./jvm) · [返回 Java 学习路线](./question)
