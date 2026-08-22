---
outline: [2, 3]
---

# Java 集合面试题

集合用于保存和管理一批对象。本章重点是会选型，并能讲清 ArrayList、HashMap 和 HashSet 的基本原理。

## 集合选型

### 1. List、Set 和 Map 有什么区别？

**面试一句话：** List 保存有顺序、可重复的元素；Set 主要用于去重；Map 使用不重复的 Key 映射 Value，适合按 Key 快速查找数据。

| 接口 | 存放方式 | 是否重复 | 常用实现 |
| --- | --- | --- | --- |
| `List` | 按顺序存一组元素 | 可以重复 | ArrayList、LinkedList |
| `Set` | 存一组不重复元素 | 不允许重复 | HashSet、TreeSet |
| `Map` | 按键值对存储 | Key 不重复，Value 可重复 | HashMap、TreeMap |

选型时先问自己：要不要按下标访问？要不要去重？是不是要通过一个 Key 快速找到 Value？

### 2. ArrayList 和 LinkedList 有什么区别？

**面试一句话：** ArrayList 底层是连续数组，随机访问快、内存局部性好；LinkedList 是双向链表，按下标查找慢，只有已经拿到节点位置时插入删除才有优势。业务中通常优先 ArrayList。

“LinkedList 增删一定快”并不准确。按下标删除第 10000 个元素前，它仍要先遍历找到节点，这一步是 O(n)。ArrayList 在中间插入会移动后续元素，但 CPU 对连续内存的访问通常更友好。

### 3. ArrayList 是怎样扩容的？

**面试一句话：** ArrayList 容量不足时会创建更大的新数组，再把旧数组内容复制过去；扩容有成本，所以已知数据规模时可以提前指定初始容量。

![ArrayList 添加元素和扩容流程](/.image/interview/java/collections/arraylist-grow.svg)

以常见 JDK 实现为例，ArrayList 通常扩为原容量的约 1.5 倍。具体细节可能随 JDK 版本变化，更重要的是理解“新建更大数组 + 复制元素”。

把它想成一排固定数量的座位：有空位就直接坐；没有空位时，不是在原地凭空加座，而是换到更大的区域，再把原来的人全部搬过去。因此扩容那一次会比普通添加更慢。

## HashMap 与 HashSet

### 4. HashMap 的底层原理是什么？

**面试一句话：** HashMap 先根据 Key 的 hash 值定位数组桶；发生哈希冲突时，同一个桶中的元素使用链表保存，满足条件后可转为红黑树，以改善冲突严重时的查询性能。

![HashMap 数组、链表和红黑树结构](/.image/interview/java/collections/hashmap-structure.svg)

![HashMap 写入数据的简化流程](/.image/interview/java/collections/hashmap-put-flow.svg)

查找时不是只比较 hash 值。HashMap 会先定位桶，再结合 hash 和 `equals()` 找到真正的 Key。

在常见 JDK 8 实现中，链表长度达到 8 且数组容量至少为 64 时才会树化；容量较小时通常优先扩容。这里属于版本相关的源码细节。

#### 源码解析：`HashMap.putVal` 如何决定写入位置

以 [OpenJDK 21 `HashMap.putVal`](https://github.com/openjdk/jdk21u/blob/master/src/java.base/share/classes/java/util/HashMap.java) 为例，`put()` 先计算扰动后的 hash，再把真正的写入交给 `putVal`。下面是保留关键分支的等价读法：

```text
if (table == null || table.length == 0) resize();
int index = (table.length - 1) & hash;
if (table[index] == null) {
    table[index] = newNode(hash, key, value, null);
} else if (hash 和 key 都相同) {
    // 找到旧节点：覆盖 value
} else if (桶已经是 TreeNode) {
    putTreeVal(...);
} else {
    // 遍历链表；没有同 key 节点就追加，过长时 treeifyBin(...)
}
if (++size > threshold) resize();
```

这段代码对应四个面试要点：数组还没创建时先扩容初始化；`(n - 1) & hash` 只在容量为 2 的幂时才能等价于高效取模；冲突时先比较 `hash` 再比较 `equals`；`size` 超过阈值才扩容。树化不是“冲突一次就变红黑树”，而是降低长链表的最坏查找成本。

### 5. HashMap 为什么把容量设计成 2 的幂？

**面试一句话：** 容量是 2 的幂时，可以用 `(容量 - 1) & hash` 计算桶下标，效率较高，也有利于扩容时判断元素留在原位置还是移动到“原位置 + 旧容量”。

这不代表所有哈希表容量都必须是 2 的幂，它是 Java HashMap 的实现选择。

### 6. HashMap、Hashtable 和 ConcurrentHashMap 怎么选？

| 类型 | 线程安全 | 是否允许 null | 建议 |
| --- | --- | --- | --- |
| HashMap | 否 | 允许一个 null Key、多个 null Value | 单线程或外部已同步 |
| Hashtable | 是，方法同步 | 不允许 | 老旧实现，一般不新用 |
| ConcurrentHashMap | 是 | 不允许 | 多线程并发读写 |

**面试一句话：** 普通场景用 HashMap，并发读写用 ConcurrentHashMap；不要因为单个方法线程安全，就误以为一组复合操作天然是原子的。

例如“先判断不存在，再放入”是两步操作，并发下应使用 `putIfAbsent()` 或 `computeIfAbsent()` 等原子方法。

### 7. HashSet 为什么能去重？

**面试一句话：** HashSet 底层使用 HashMap，把集合元素作为 Map 的 Key；添加时根据 `hashCode()` 和 `equals()` 判断相同元素是否已经存在。

自定义对象放入 HashSet 时，必须正确实现 `equals()` 和 `hashCode()`。对象加入集合后如果又修改参与哈希计算的字段，后续查找或删除可能失败，所以 Key 最好保持不可变。

## 遍历与修改

### 8. 什么是 fail-fast？

**面试一句话：** 使用迭代器遍历普通集合时，如果集合结构被其他操作意外修改，迭代器通常会尽早抛出 `ConcurrentModificationException`，这叫 fail-fast。

```java
Iterator<String> iterator = names.iterator();
while (iterator.hasNext()) {
    if (iterator.next().isBlank()) {
        iterator.remove(); // 使用迭代器自己的删除方法
    }
}
```

并发场景应选择合适的并发集合。fail-fast 主要用于尽快暴露错误，不是严格的线程安全保证。

### 9. Iterator 和增强 for 循环是什么关系？

**面试一句话：** 增强 for 是遍历语法，遍历 Iterable 集合时编译器通常会转换为 Iterator；需要在遍历中安全删除当前元素时，应显式使用 Iterator 的 `remove()`。

增强 for 也能遍历数组，但数组场景不会使用 Iterator。无论哪种写法，都不要在普通集合遍历期间直接调用集合自身的结构修改方法。

## 排序与常用容器

### 10. Comparable 和 Comparator 有什么区别？

**面试一句话：** Comparable 由类型自己定义一种默认自然顺序；Comparator 是外部传入的比较规则，同一个类型可以拥有多种排序方式，业务代码通常更灵活。

```java
Comparator<User> byAgeThenName = Comparator
    .comparingInt(User::getAge)
    .thenComparing(User::getName);
```

比较器要满足自反性、对称性和传递性。不要直接用 `a - b` 比较整数，因为可能溢出，应使用 `Integer.compare(a, b)`。

### 11. HashMap、LinkedHashMap 和 TreeMap 怎么选？

| 类型 | 顺序特点 | 常见复杂度 | 典型场景 |
| --- | --- | --- | --- |
| `HashMap` | 不保证遍历顺序 | 查找通常 O(1) | 普通 Key-Value 查询 |
| `LinkedHashMap` | 保持插入顺序，或配置为访问顺序 | 查找通常 O(1) | 稳定遍历、实现 LRU 思路 |
| `TreeMap` | 按 Key 的自然顺序或比较器排序 | 查找 O(log n) | 排序、范围查询 |

**面试一句话：** 只要快速查询通常选 HashMap；需要稳定的插入或访问顺序选 LinkedHashMap；需要按 Key 排序以及查找相邻、区间数据时选 TreeMap。

TreeMap 判断 Key 是否相同主要依赖比较结果。比较器若与 `equals()` 含义不一致，可能出现看起来不同的 Key 被当作同一个 Key 的情况。

### 12. Queue 和 Deque 有什么区别？

**面试一句话：** Queue 通常表示先进先出的单端队列；Deque 支持在两端添加和删除，既能当队列，也能当栈使用，现代代码中通常优先用 ArrayDeque 替代 Stack。

- 队列：`offerLast()` + `pollFirst()`。
- 栈：`push()` + `pop()`，底层仍可用 ArrayDeque。
- 需要线程阻塞等待任务时，应选择 `BlockingQueue` 的实现，而不是普通 ArrayDeque。

ArrayDeque 不允许 null，因为 `poll()` 返回 null 常用来表示队列为空。

### 13. CopyOnWriteArrayList 适合什么场景？

**面试一句话：** CopyOnWriteArrayList 在写入时复制底层数组，读操作通常无需加互斥锁，适合读多写少且数据量不大的快照场景；写频繁或元素很多时复制成本很高。

它的迭代器读取创建时的快照，不会看到之后的修改，也不支持通过迭代器修改集合。监听器列表、配置快照可能适合使用它；高频追加的消息列表通常不适合。

### 14. 不可变集合和只读视图有什么区别？

**面试一句话：** 真正的不可变集合创建后内容不能改变；只读视图只是不允许通过当前视图修改，原集合改变后，视图中的内容仍可能跟着变化。

例如 `Collections.unmodifiableList(source)` 包装的是 `source` 的视图，调用方若仍持有 `source`，依然可以修改底层数据。需要稳定快照时，可根据 JDK 版本和 null 约束使用 `List.copyOf(source)` 等复制方法。

---

[← 上一章：Java 基础](./basic) · [下一章：并发 →](./concurrency)
