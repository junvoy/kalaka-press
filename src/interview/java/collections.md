---
outline: [2, 3]
---

# Java 集合：List、Set 和 Map 怎么选？

写业务代码时，我们通常不是在“选择一个集合类”，而是在回答三个问题：数据要不要保持顺序？能不能重复？主要按下标访问，还是按 Key 查找？

本章先给出能直接用于编码的选择方法，再用数组、链表、哈希表和树解释原因。第一次阅读可以只看每题开头的“直接回答”和代码示例；需要准备面试或排查性能问题时，再继续阅读机制与边界。

## 先用起来：按需求选择

- **保持先后顺序，允许重复：** `ArrayList`，例如商品列表、查询结果。
- **不允许重复：** `HashSet`，例如已处理订单号。
- **根据 Key 快速查找 Value：** `HashMap`，例如“订单号 → 订单”。
- **保持插入顺序或访问顺序：** `LinkedHashMap`，例如固定顺序展示、LRU 缓存。
- **按 Key 排序、做范围查询：** `TreeMap`，例如时间区间、排行榜。
- **从队头取、从队尾放：** `ArrayDeque`，例如 BFS、普通任务队列。
- **多线程并发读写 Map：** `ConcurrentHashMap`，例如本地并发缓存。
- **读很多、写很少的并发 List：** `CopyOnWriteArrayList`，例如监听器列表。

这张表是起点，不是结论。数据规模、读写比例、顺序要求和并发边界变化后，选择也可能变化。

## 集合的三个基本角色

### 1. List、Set 和 Map 有什么区别？

**直接回答：** `List` 保存一串有位置的数据，允许重复；`Set` 保存不重复的元素；`Map` 保存 Key 到 Value 的映射，并要求 Key 唯一。

```java
List<String> steps = new ArrayList<>();
steps.add("支付");
steps.add("支付");                 // 允许重复，位置分别是 0 和 1

Set<String> paidOrders = new HashSet<>();
paidOrders.add("order-1001");
paidOrders.add("order-1001");     // 第二次不会增加新元素

Map<String, Integer> stock = new HashMap<>();
stock.put("book", 10);
stock.put("book", 8);             // 同一个 Key 更新为 8
```

三者保护的是不同规则：

- `List` 关心“第几个”，所以要保留元素的顺序和位置。
- `Set` 关心“是否已经存在”，所以必须有判断相等的规则。
- `Map` 关心“这个 Key 对应什么”，所以需要从 Key 定位到 Value。

如果既要去重又要保持插入顺序，可以使用 `LinkedHashSet`；如果既要映射又要按 Key 排序，可以使用 `TreeMap`。不存在一个集合能以最低成本满足所有需求。

## List：为什么通常先选 ArrayList？

### 2. ArrayList 和 LinkedList 有什么区别？

**直接回答：** 不确定选哪个时，通常先选 `ArrayList`。它按下标访问快、内存更紧凑；`LinkedList` 只有在已经定位到节点并频繁在附近插入删除时，才可能省去数组搬移，但它查找第 n 个元素仍需遍历。

两者最核心的区别不是 API，而是数据怎样放进内存：

```text
ArrayList:  [A][B][C][D]        连续的引用数组
LinkedList: [A] <-> [B] <-> [C] 每个节点还保存前后指针
```

- **按下标读取：** `ArrayList` 是 O(1)，`LinkedList` 是 O(n)。数组可按下标定位，链表要逐个走节点。
- **尾部追加：** 两者通常都是 O(1)，但 ArrayList 偶尔需要扩容，LinkedList 每次需要创建节点。
- **中间插入、删除：** ArrayList 定位快但要搬移后续元素；LinkedList 改链接只需 O(1)，但通常先要花 O(n) 找到位置。
- **内存与缓存局部性：** ArrayList 通常更好；LinkedList 的每个节点还要保存前后引用，节点也可能分散在内存中。

“链表增删是 O(1)”省略了一个关键条件：代码已经持有目标节点。`LinkedList.remove(index)` 先找节点，整体仍是 O(n)。如果只是需要队头、队尾操作，通常直接使用 `ArrayDeque`，语义也更清楚。

### 3. ArrayList 是怎样扩容的？

**直接回答：** `ArrayList` 的底层数组放不下新元素时，会申请一个更大的数组，把旧元素复制过去，再加入新元素。JDK 21 中，常见扩容结果约为旧容量的 1.5 倍；这是实现细节，不是 `List` 接口的保证。

![ArrayList 添加元素和扩容流程](/.image/interview/java/collections/arraylist-grow.svg)

数组长度创建后不能改变，因此“扩容”并不是把原数组拉长，而是搬家：

```text
旧数组 [A][B][C]        容量不足
          ↓ 申请并复制
新数组 [A][B][C][ ][ ]  再写入 D
```

在固定的 [OpenJDK 21 `ArrayList`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/ArrayList.java) 实现中，默认构造的空列表第一次添加元素时会获得默认容量 10，后续增长通常以旧容量的一半作为优先增长量。由此得到几个实用结论：

- 尾部追加的平均成本低，但触发扩容的那一次需要分配数组和复制元素。
- 已知大致数量时，`new ArrayList<>(expectedSize)` 可以减少扩容；估得过大则会浪费空间。
- `size` 是已经保存的元素数量，`capacity` 是底层数组当前能容纳的数量，两者不是一回事。

最小实验：把初始容量设为 2，再加入 3 个元素，在 `ArrayList.grow` 处打断点，就能观察第三次添加触发新数组分配。

## HashMap 与 HashSet：Key 为什么能快速定位？

### 4. HashMap 的底层原理是什么？

**直接回答：** `HashMap` 先根据 Key 的 `hashCode()` 计算桶位置，再在桶内用 `equals()` 找到真正相等的 Key。JDK 21 的桶底层是数组；发生哈希冲突时，同一桶中的节点会组织成链表，满足条件后可转换为红黑树。

先看一次 `put(key, value)` 做了什么：

1. 把 Key 的 hash 映射为数组下标，先缩小搜索范围。
2. 桶为空就直接放入；桶不为空则逐个比较 hash 和 Key。
3. 找到相同 Key 就更新 Value，否则追加新节点。
4. 元素太多时扩容；单桶过长且数组容量足够时，把链表树化。

![HashMap 数组、链表和红黑树结构](/.image/interview/java/collections/hashmap-structure.svg)

![HashMap 写入数据的简化流程](/.image/interview/java/collections/hashmap-put-flow.svg)

这里有两个容易混淆的判断：

```java
// 示意代码，不是 JDK 原样源码
int bucketIndex = spread(key.hashCode()) & (table.length - 1);

if (storedHash == hash && Objects.equals(storedKey, key)) {
    // 才能认定是同一个 Key
}
```

hash 相同不代表对象相等，因为有限的整数范围要对应大量可能对象，冲突一定可能发生。`hashCode()` 负责快速缩小范围，`equals()` 负责最终确认。

在 [OpenJDK 21 `HashMap.putVal`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/HashMap.java) 中，树化阈值为 8，但数组容量小于 64 时优先扩容。具体数字属于 JDK 21 的实现策略；稳定原理是通过扩容改善分布，并限制单桶退化后的查找成本。

### 5. HashMap 为什么把容量设计成 2 的幂？

**直接回答：** 在 JDK 21 的 `HashMap` 实现中，容量保持为 2 的幂，可以用 `(capacity - 1) & hash` 计算桶下标；扩容为两倍时，节点只需根据新增的一个二进制位决定留在原位置，还是移动到“原下标 + 旧容量”。

以容量 16 为例，`capacity - 1` 是二进制 `1111`，按位与会保留 hash 的低 4 位，结果自然落在 0～15：

```text
hash:          ... 10110110
capacity - 1:      00001111
结果:              00000110  -> 桶下标 6
```

容量从 16 扩到 32 时，多参与计算的只有下一位。旧节点因此只有两种去向，不必重新做通用取模运算。

“容量必须是 2 的幂”不是所有哈希表的第一原则，而是 Java `HashMap` 为下标计算和扩容迁移做出的实现选择。真正不变的要求是：桶下标必须合法，且 Key 要尽可能均匀分布。

### 6. HashMap、Hashtable 和 ConcurrentHashMap 怎么选？

**直接回答：** 单线程或线程隔离场景用 `HashMap`；多线程共享并读写时优先用 `ConcurrentHashMap`；新代码通常不再选择历史类 `Hashtable`。

- **`HashMap`：** 不支持无保护的并发读写；允许一个 null Key 和多个 null Value；适合局部变量或外部已经同步的场景。
- **`Hashtable`：** 单个方法使用 `synchronized`；Key 和 Value 都不允许 null；主要用于维护历史代码。
- **`ConcurrentHashMap`：** 支持并发访问；Key 和 Value 都不允许 null；适合多线程共享 Map。

线程安全集合只保证其 API 定义的操作，不会自动让任意业务步骤变成一个原子操作。下面的代码即使用 `ConcurrentHashMap` 仍然存在“先查再写”的竞态：

```java
if (!cache.containsKey(key)) {
    cache.put(key, load(key));
}
```

应该优先使用集合提供的复合操作：

```java
Value value = cache.computeIfAbsent(key, this::load);
```

但 `computeIfAbsent` 的计算函数也要短小、避免递归更新同一 Map，并考虑加载失败和下游重复调用的边界。集合方法原子，不等于整个业务事务原子。

### 7. HashSet 为什么能去重？

**直接回答：** `HashSet` 内部使用 `HashMap` 保存元素：Set 的元素作为 Map 的 Key，Value 使用统一的占位对象。Map 的 Key 不能重复，所以 Set 能去重。

去重是否符合业务预期，取决于元素的 `equals()` 和 `hashCode()`：

```java
record UserId(long value) {}

Set<UserId> users = new HashSet<>();
users.add(new UserId(1001));
users.add(new UserId(1001));

System.out.println(users.size()); // 1
```

必须遵守的契约是：两个对象如果 `equals()` 为 true，它们的 `hashCode()` 必须相同。反过来不成立，hash 相同仍可由 `equals()` 判断为不同对象。

还有一个常见故障：元素放入 `HashSet` 后，又修改了参与 `equals()` 或 `hashCode()` 的字段。新 hash 可能指向另一个桶，而对象仍在旧桶中，`contains` 和 `remove` 就可能找不到它。因此，长期作为 HashMap Key 或 HashSet 元素的业务标识，优先使用不可变对象。

## 遍历与排序：看得见的顺序从哪里来？

### 8. 什么是 fail-fast？

**直接回答：** fail-fast 是普通集合迭代器的一种错误检测机制：迭代期间发现集合发生了预期之外的结构修改，就尽快抛出 `ConcurrentModificationException`。它不是锁，也不是线程安全保证。

下面的写法可能触发异常，因为集合自己删除元素后，迭代器记录的修改次数过期了：

```java
for (String name : names) {
    if (name.isBlank()) {
        names.remove(name); // 不要这样做
    }
}
```

需要在遍历中删除当前元素时，使用迭代器自己的 `remove()`：

```java
Iterator<String> iterator = names.iterator();
while (iterator.hasNext()) {
    if (iterator.next().isBlank()) {
        iterator.remove();
    }
}
```

JDK 文档把 fail-fast 定义为尽力而为，不能依赖它检测所有并发修改。它的作用是尽早暴露错误，而不是让有竞态的程序变正确。并发集合可能采用弱一致性遍历，`CopyOnWriteArrayList` 则采用快照遍历，语义并不相同。

### 9. Iterator 和增强 for 循环是什么关系？

**直接回答：** 增强 for 遍历实现了 `Iterable` 的集合时，编译器会把它转换为基于 `Iterator` 的循环；遍历数组时则直接使用下标，不会创建 Iterator。

```java
for (String name : names) {
    System.out.println(name);
}
```

遍历集合时，可以近似理解为：

```java
for (Iterator<String> it = names.iterator(); it.hasNext(); ) {
    String name = it.next();
    System.out.println(name);
}
```

增强 for 更简洁，但拿不到迭代器本身。需要安全删除当前元素、同时遍历两个迭代器，或精确控制推进过程时，应显式使用 `Iterator`。需要按下标或逆序访问 `List` 时，普通 for 循环可能更合适。

### 10. Comparable 和 Comparator 有什么区别？

**直接回答：** `Comparable` 把一种“自然顺序”写进类型本身；`Comparator` 在类型外部提供排序规则，适合一个类型有多种排序方式的情况。

```java
record Product(String name, int price) {}

Comparator<Product> byPrice = Comparator.comparingInt(Product::price);
Comparator<Product> byNameThenPrice = Comparator
        .comparing(Product::name)
        .thenComparingInt(Product::price);

products.sort(byPrice);
```

例如，版本号类型可以实现 `Comparable<Version>` 定义默认版本顺序；商品既可能按价格排，也可能按名称排，交给不同 `Comparator` 更清楚。

比较规则要稳定并满足传递性：如果 A 小于 B、B 小于 C，那么 A 应小于 C。不要用 `a - b` 比较整数，因为可能溢出，使用 `Integer.compare(a, b)`。在 `TreeMap` 和 `TreeSet` 中，比较结果为 0 会被视为同一个位置；如果比较器与 `equals()` 的业务语义不一致，元素可能被意外覆盖或去重。

### 11. HashMap、LinkedHashMap 和 TreeMap 怎么选？

**直接回答：** 只需要根据 Key 查询时用 `HashMap`；需要稳定的插入或访问顺序时用 `LinkedHashMap`；需要按 Key 排序、查最近值或范围时用 `TreeMap`。

- **`HashMap`：** 不保证遍历顺序，查询常见平均成本为 O(1)，适合普通索引。
- **`LinkedHashMap`：** 保持插入顺序，或配置为访问顺序；查询常见平均成本为 O(1)，适合稳定展示和 LRU 思路。
- **`TreeMap`：** 按 Key 的自然顺序或 Comparator 排序，查询成本为 O(log n)，适合 `floorKey`、`ceilingKey` 和 `subMap`。

```java
NavigableMap<Integer, String> rules = new TreeMap<>();
rules.put(0, "普通用户");
rules.put(1000, "银卡用户");
rules.put(5000, "金卡用户");

String level = rules.floorEntry(3200).getValue(); // 银卡用户
```

不要依赖 `HashMap` 当前看起来稳定的输出顺序，它的 API 没有做这个承诺。`LinkedHashMap` 通过额外链表保存顺序，会付出额外内存；`TreeMap` 通过红黑树维护顺序，单次查询成本高于哈希表的常见平均情况。选择取决于你是否真的需要顺序能力。

## 队列与并发集合：特殊场景怎么选？

### 12. Queue 和 Deque 有什么区别？

**直接回答：** `Queue` 主要表达先进先出，只操作队头和队尾；`Deque` 是双端队列，两端都能添加和删除，因此既可以当队列，也可以当栈。单线程普通场景通常使用 `ArrayDeque`。

```java
Deque<String> tasks = new ArrayDeque<>();
tasks.offerLast("task-1"); // 队尾放入
tasks.offerLast("task-2");

String first = tasks.pollFirst(); // 队头取出 task-1
```

队列 API 通常成对出现：添加可选 `add`（失败时抛异常）或 `offer`（返回特殊值）；取出并删除可选 `remove` 或 `poll`；只查看队头可选 `element` 或 `peek`。

`ArrayDeque` 不允许 null，因为 `poll` 返回 null 常用来表示队列为空。需要多线程生产者、消费者等待，或者必须限制队列容量时，应选 `BlockingQueue` 的具体实现；普通 `ArrayDeque` 不提供阻塞和背压。

### 13. CopyOnWriteArrayList 适合什么场景？

**直接回答：** 它适合元素不多、读和遍历非常频繁、写入很少，并且读者需要稳定快照的场景，例如监听器列表。写频繁或列表很大时不要用。

`CopyOnWriteArrayList` 的思路很直白：每次修改都复制一份底层数组，在副本上完成修改后再发布新数组；已经创建的迭代器继续读取旧数组。

```java
CopyOnWriteArrayList<String> listeners = new CopyOnWriteArrayList<>();
listeners.add("email");

Iterator<String> snapshot = listeners.iterator();
listeners.add("sms");

snapshot.forEachRemaining(System.out::println); // 只看到 email
```

它把成本从读转移到写：读不需要为遍历持有锁，但每次写都要复制数组，占用 CPU、内存带宽并产生垃圾。快照迭代器也不支持 `remove()`。因此“线程安全”只是必要条件，读写比例和快照语义才是选择它的真正依据。实现可参考固定版本的 [OpenJDK 21 `CopyOnWriteArrayList`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/CopyOnWriteArrayList.java)。

### 14. 不可变集合和只读视图有什么区别？

**直接回答：** 只读视图只禁止通过这层包装修改，原集合变化时视图也会变化；不可变集合本身不允许增删元素。需要与调用方隔离时，通常创建不可变副本，而不是只包一层视图。

```java
List<String> source = new ArrayList<>(List.of("A"));

List<String> view = Collections.unmodifiableList(source);
List<String> snapshot = List.copyOf(source);

source.add("B");

System.out.println(view);     // [A, B]，仍能看到原集合变化
System.out.println(snapshot); // [A]，结构是独立快照
```

需要注意三个边界：

- `List.of(...)` 和 `List.copyOf(...)` 不允许 null 元素。
- “集合不可变”只表示不能增删替换集合中的引用，不代表元素对象本身不可变。
- `List.copyOf` 是浅拷贝：集合结构独立，但其中的可变对象仍可能被其他代码修改。

因此，对外返回配置、规则等不希望被修改的数据时，要同时考虑集合结构和元素对象是否都需要不可变。

## 把选择过程变成习惯

遇到集合选型，可以按这个顺序判断：

1. **先看语义：** 是一串元素、唯一元素，还是 Key-Value？
2. **再看主要操作：** 按下标、按 Key、按顺序，还是做范围查询？
3. **再看规模与比例：** 数据有多少，读多还是写多，是否频繁扩容？
4. **最后看共享方式：** 是否跨线程修改，单方法原子是否足够，读者需要实时数据还是快照？

例如“保存订单并按订单号查询”自然导向 `HashMap<String, Order>`；“按创建时间查询一段订单”只用 HashMap 就不够，可能需要 `TreeMap`，也可能数据最终应交给数据库索引。集合解决的是进程内数据组织问题，不应该替代持久化与分布式一致性设计。

## 面试时怎么表达

### 30 秒回答骨架

先说选择，再说原因，最后补边界：

> 我会先看数据语义和主要操作。要位置和重复元素用 List，去重用 Set，按 Key 查值用 Map。具体实现上，普通 List 通常先选 ArrayList；普通 Key 查询用 HashMap；需要顺序选 LinkedHashMap 或 TreeMap；并发读写再考虑并发集合。最后还要结合数据规模、读写比例和复合操作的原子边界，不能只背复杂度。

### 3 分钟回答骨架

1. 用一个业务例子说明需要保留的规则，例如订单列表要有顺序、订单索引要按 ID 定位。
2. 说明底层结构：ArrayList 是动态数组，HashMap 是桶数组加冲突结构，TreeMap 是有序树。
3. 解释结构怎样带来复杂度和内存代价，而不是只报 O(1)、O(n)。
4. 补充正确性边界：`equals/hashCode`、可变 Key、比较器一致性和复合操作原子性。
5. 如果问题涉及源码，再限定 OpenJDK 21，说明扩容、树化等数字是版本实现，不把实现细节说成永恒原理。

## 继续验证

- [Java Collections Framework 概览（Java 21）](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)
- [OpenJDK 21：ArrayList 源码](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/ArrayList.java)
- [OpenJDK 21：HashMap 源码](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/HashMap.java)
- [OpenJDK 21：ConcurrentHashMap 源码](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/ConcurrentHashMap.java)
- [OpenJDK 21：CopyOnWriteArrayList 源码](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/util/concurrent/CopyOnWriteArrayList.java)

---

[← 上一章：Java 基础](./basic) · [下一章：并发 →](./concurrency)
