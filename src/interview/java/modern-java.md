---
outline: [2, 3]
---

# Java 8+ 与现代 Java 面试题

这一章讲 Java 8 以后最常被问到的语言能力：Lambda、Stream、Optional、时间 API、记录类和模块化。重点不是背 API，而是知道它们什么时候能让代码更清楚、什么时候反而会难维护。

## Lambda 与函数式接口

### 1. 什么是 Lambda 表达式？

**面试一句话：** Lambda 是把一小段行为作为值传递的简写，通常用来实现只有一个抽象方法的函数式接口。

```java
List<String> names = List.of("小王", "小李");
names.forEach(name -> System.out.println(name));
```

上面的 `name -> ...` 就是 Lambda。它适合短小、目的明确的逻辑；超过几行、包含复杂分支时，提取为有名字的方法通常更易读。

### 2. 什么是函数式接口？`@FunctionalInterface` 有什么用？

**面试一句话：** 函数式接口只有一个抽象方法，因此可以被 Lambda 或方法引用实现；`@FunctionalInterface` 不是必须的，但能让编译器帮我们检查这个约束。

常见接口包括：

- `Predicate<T>`：输入 T，返回 true/false，用于判断。
- `Function<T, R>`：把 T 转成 R。
- `Consumer<T>`：消费 T，没有返回值。
- `Supplier<T>`：不接收输入，提供一个 T。

默认方法不算抽象方法，所以接口可以有一个抽象方法和多个 `default` 方法。

### 3. 方法引用是什么？何时使用？

**面试一句话：** 方法引用是当 Lambda 只是“把参数原样交给已有方法”时的更短写法；可读性更好才使用，不要为缩短代码强行套用。

```java
names.forEach(System.out::println);
// 等价于 names.forEach(name -> System.out.println(name));
```

常见形式有静态方法 `Integer::parseInt`、特定对象实例方法 `logger::info`、任意对象实例方法 `String::trim` 和构造器 `User::new`。

### 4. Lambda 能访问外部变量吗？

**面试一句话：** Lambda 可以读取局部变量，但局部变量必须是 final 或事实上的 final（赋值后不再改变）；实例字段和静态字段不受这个限制。

这是因为局部变量本身在方法结束后会离开栈帧，Lambda 需要捕获它的值。不要为了在 Lambda 中修改计数器而使用可变数组等技巧；并发计数应使用正确的同步工具。

## Stream 与集合处理

### 5. Stream 和 Collection 有什么区别？

**面试一句话：** Collection 用于保存数据，Stream 用于描述对数据的一次处理流水线；Stream 通常不存数据、不改变原集合，并且消费后不能再次使用。

```java
List<String> result = names.stream()
    .filter(name -> name.length() >= 2)
    .map(String::toUpperCase)
    .toList();
```

`filter` 和 `map` 是中间操作，`toList()` 是终止操作。没有终止操作时，前面的流水线通常不会真正执行，这种特性叫惰性求值。

### 6. `map()` 和 `flatMap()` 有什么区别？

**面试一句话：** map 是“一进一出”的转换；flatMap 用于把每个元素产生的多个元素展开并合并为一个流。

例如一组订单各自有一组商品：`map(Order::getItems)` 得到“商品列表的流”，而 `flatMap(order -> order.getItems().stream())` 得到“所有商品的流”。

### 7. `filter`、`peek` 和 `forEach` 应该怎样用？

**面试一句话：** filter 用来筛选，forEach 用于终止时执行副作用；peek 主要用于调试观察，不应用来承载修改业务状态等核心逻辑。

把数据库更新、发消息等副作用塞进长 Stream 链会让异常处理、事务边界和调试都变困难。涉及业务流程时，普通 `for` 循环往往更直白。

### 8. Stream 的 `toList()`、`collect(toList())` 有什么区别？

**面试一句话：** `Stream.toList()` 是较新 JDK 提供的便捷写法，返回的列表通常不可修改；`collect(Collectors.toList())` 对返回实现没有不可修改的保证，常见实现可修改。

如果业务明确需要一个可变 `ArrayList`，可以写 `collect(Collectors.toCollection(ArrayList::new))`。不要依赖某个 JDK 实现的具体集合类型。

### 9. `parallelStream()` 为什么不能随便用？

**面试一句话：** parallelStream 使用公共 ForkJoinPool 并行执行，只有计算量足够大、任务独立且没有共享副作用时才可能受益；它不适合阻塞 I/O 和需要隔离线程池的线上业务。

并行化会有拆分、合并和线程调度成本，也可能与应用中其他使用公共线程池的任务互相影响。生产任务需要并发时，应明确线程池、超时和容量控制。

## 空值、时间与不可变数据

### 10. Optional 是用来解决什么问题的？

**面试一句话：** Optional 用于明确表达“结果可能不存在”，引导调用方处理空值；它更适合作为方法返回值，而不适合随意作为实体字段、参数或序列化对象。

```java
String displayName = findUser(id)
    .map(User::getName)
    .orElse("访客");
```

不要写 `optional.isPresent()` 后再 `get()`，这往往只是把 `null` 判断换了个写法。`orElseGet` 适合默认值创建昂贵的场景，因为它只会在结果为空时执行。

### 11. 为什么推荐 `java.time`，而不是 Date 和 Calendar？

**面试一句话：** `java.time` 中大多数类型不可变、线程安全，且把“日期、时间、时区、时间点”分成清晰类型，能减少 Date/Calendar 的可变性和时区误用。

| 类型 | 表示什么 | 例子 |
| --- | --- | --- |
| `LocalDate` | 只有日期 | 生日、账期 |
| `LocalDateTime` | 日期和时间，不带时区 | 门店营业时间 |
| `Instant` | UTC 时间线上的一个瞬间 | 审计事件时间 |
| `ZonedDateTime` | 含时区的日期时间 | 跨时区预约 |

跨系统传输时间时，优先使用 `Instant` 或带时区偏移的 ISO-8601 文本；不要把服务器默认时区当作业务规则。

### 12. `record` 是什么？适合什么场景？

**面试一句话：** record 是用于承载数据的简洁类声明，编译器会生成访问器、构造器、equals、hashCode 和 toString；它适合 DTO、查询结果等“以数据为主”的不可变对象。

```java
public record UserSummary(Long id, String name) {}
```

record 的字段引用不能重新赋值，但如果字段本身是可变集合，集合内容仍可能改变。因此构造时需要进行防御性复制，例如 `List.copyOf(items)`。

### 13. `var` 能在哪些地方使用？

**面试一句话：** `var` 只可用于有初始化值的局部变量，编译器仍在编译期确定真实类型；它不是动态类型，也不能用于字段、方法参数或返回类型。

当右侧类型非常明显时，`var` 可以减少重复；`var result = service.execute();` 若看不出 result 是什么类型，反而会降低可读性。

### 14. 什么是 Java 模块化（JPMS）？

**面试一句话：** JPMS 通过 `module-info.java` 声明模块依赖和对外暴露的包，使依赖关系更明确，并可以在运行时构建更小的运行镜像。

传统 classpath 下一个 JAR 中的 public 类通常都可被访问；模块化后只有 `exports` 的包才对其他模块开放。许多 Spring 项目仍以 classpath 为主，因此面试中先讲清价值即可，不必把它说成所有项目的必选项。

---

[← 上一章：JVM](./jvm) · [下一层：Web 与网络 →](../web/io-network)
