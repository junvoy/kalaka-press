---
outline: [2, 3]
---

# Java 基础：从运行方式到类型边界

本章按面试追问链整理 Java 基础。每题先给可直接表达的结论，再解释“为什么”、最小代码和易错边界；JVM 内存、GC 和类加载细节统一放到 [JVM 章节](./jvm)。

## 运行与面向对象

### 1. JDK、JRE 和 JVM 有什么区别？

**直接回答：** JVM 负责加载和执行字节码；JRE 表示“运行 Java 程序所需的 JVM 与类库”；JDK 在运行能力上增加编译、调试、打包和诊断工具。现代 JDK 的发布形态已经不要求用户单独安装一个传统 JRE，面试时应讲职责边界，不要背安装包关系。

```text
.java 源码 --javac--> .class 字节码 --JVM--> 当前平台机器指令
        \___________ JDK 工具 ___________/
```

只有 JVM 不能完成日常开发，因为还缺少 `javac`、`javadoc`、`jdb`、`jcmd` 等工具；只有字节码也不能保证任意机器都能运行，目标环境还必须有兼容 class 版本和语义规范的 JVM。

### 2. Java 程序是怎样运行起来的？Java 是编译型还是解释型？

**直接回答：** Java 源码先由 `javac` 编译成 class 字节码，JVM 再校验、加载并执行。HotSpot 通常先解释执行，再把热点代码即时编译为本地机器码，所以只用“编译型”或“解释型”概括都不完整。

![Java 源码从编译到运行的流程](/.image/interview/java/basic/java-run-flow.svg)

稳定事实是“class 文件是语言与虚拟机之间的中间契约”；解释器、分层编译和具体 JIT 策略属于 JVM 实现。可以用下面的命令查看字节码，而不是凭反编译后的 Java 猜测：

```bash
javac DispatchDemo.java
javap -c -v DispatchDemo
```

### 3. 面向对象的三大特性是什么？

**直接回答：** 封装把状态和维护状态的操作放在一起；继承复用并细化已有类型；多态让调用方依赖稳定契约，运行时对象决定具体行为。它们是控制变化的手段，不是“用了就一定更好”的目标。

```java
interface PricePolicy {
    long calculate(Order order);
}

long checkout(Order order, PricePolicy policy) {
    return policy.calculate(order);
}
```

这里的价值是结算流程只依赖最小契约。如果业务没有可替换行为，为每个类机械地加接口只会增加跳转成本；继承也会让父类变化影响所有子类。

### 4. 方法重载和方法重写有什么区别？

**直接回答：** 重载发生在同一个类型中，由编译器根据方法名和参数列表选择；重写发生在父子类型之间，由运行时对象决定调用哪个实例方法。只改变返回类型不能重载，因为调用点无法只靠返回值消除歧义。

```java
void print(Object value) {}
void print(String value) {}  // 重载：编译期选择

Animal animal = new Dog();
animal.speak();              // 重写：运行期分派到 Dog
```

静态方法可以被隐藏，但不参与实例方法的动态分派；`private` 方法对子类不可见，也谈不上被子类重写。

### 5. 接口和抽象类怎么选？

**直接回答：** 需要表达可由不同类型实现的能力、支持多实现时优先接口；需要共享状态、受控构造过程或公共实现时可以用抽象类。它们都不能替代清晰的领域边界。

接口可以提供 `default` 和静态方法，但没有实例构造器；抽象类可以有实例字段和构造器，但类只能直接继承一个父类。判断顺序应是“是否真有稳定契约、是否需要共享实现和状态”，而不是“接口永远优于抽象类”。

## 对象、相等性与字符串

### 6. `==`、`equals()` 和 `hashCode()` 有什么关系？

**直接回答：** `==` 比较基本类型的值，比较引用类型时判断是否指向同一对象；`equals()` 由类型定义逻辑相等；`hashCode()` 帮助哈希集合缩小查找范围。`equals()` 相等的对象必须有相同 hash，反过来不成立。

```java
record UserId(long value) {}

var left = new UserId(7);
var right = new UserId(7);

System.out.println(left == right);       // false
System.out.println(left.equals(right));  // true
```

没有重写时，`Object.equals()` 仍按身份比较。对象作为 HashMap Key 或 HashSet 元素期间，参与相等与 hash 计算的字段不应改变，否则对象可能还在旧桶里，却再也无法按新 hash 找到。

### 7. 为什么 String 是不可变的？

**直接回答：** String 会被共享、缓存 hash，并参与类名、路径、权限判断和 Map Key；不可变值能保证共享后的内容和相等性稳定。变量可以指向新 String，但公开 API 不能修改既有 String 对象的值。

JDK 21 的 OpenJDK 实现主要使用内部 `byte[]` 和编码标记保存内容，这是版本实现；不可变语义才是语言使用者能依赖的边界。不可变也不等于“没有任何可变内部状态”，实现可以安全地缓存派生结果，只要外部可观察值不变。

### 8. String、StringBuilder 和 StringBuffer 怎么选？

**直接回答：** 少量字符串组合直接使用 `+` 即可；循环或多步拼接用 `StringBuilder`；只有多个线程确实共享同一个缓冲区并依赖其同步方法时才考虑 `StringBuffer`。

```java
StringBuilder builder = new StringBuilder();
for (String item : items) {
    builder.append(item).append(',');
}
String result = builder.toString();
```

“多线程应用”不等于“必须用 StringBuffer”。如果每个请求、每个线程各自持有 Builder，它仍是线程封闭的。编译器也可能优化简单的 `+`，不要把所有拼接都手工改成 Builder。

### 9. Java 是值传递还是引用传递？

**直接回答：** Java 只有值传递。基本类型复制数值，对象变量复制其中保存的引用值；两份引用能观察同一个对象，但方法不能让调用方变量改为指向另一个对象。

```java
static void update(User user) {
    user.setName("新名字");      // 修改共享对象，调用方看得到
    user = new User("另一个");  // 只改变当前参数变量
}
```

判断标准不是“方法能否改对象”，而是“调用方的变量槽是否被方法重新绑定”。数组同样是对象，传入的也是数组引用值的副本。

### 10. 自动装箱、拆箱和 Integer 缓存有什么坑？

**直接回答：** 装箱把基本值转换为包装对象，拆箱反向转换；包装对象用 `==` 比较的是身份，结果可能受缓存影响，业务数值应使用 `equals()` 或先安全拆箱。null 自动拆箱会抛 `NullPointerException`。

```java
Integer a = 127;
Integer b = 127;
Integer c = 1000;
Integer d = 1000;

System.out.println(a == b); // 常见为 true，命中缓存
System.out.println(c == d); // false，不能依赖身份
```

JLS 规定了一部分常量表达式的装箱身份要求，但实现可以缓存更多值。稳妥结论仍是：比较包装数值不要依赖对象身份。

## 类型系统与失败处理

### 11. 泛型有什么用？什么是类型擦除？

**直接回答：** 泛型把一部分类型错误提前到编译期，并减少显式强转。Java 为兼容既有字节码主要采用类型擦除，很多类型实参不会完整保留到运行时，所以不能写 `new T()`，也不能判断 `value instanceof List<String>`。

```java
List<String> names = new ArrayList<>();
names.add("云程阁");
// names.add(1); // 编译期失败
```

擦除不等于“泛型完全不存在”：class 文件仍可能保留供反射读取的泛型签名，编译器也会生成桥接方法。但运行时对象通常不能区分 `List<String>` 和 `List<Integer>`。

### 12. `? extends` 和 `? super` 怎么理解？

**直接回答：** `? extends T` 表示某种未知的 T 子类型，适合安全读取为 T；`? super T` 表示某种未知的 T 父类型，适合安全写入 T。PECS 是这个约束的总结：Producer Extends，Consumer Super。

```java
static void copy(List<? extends Number> source,
                 List<? super Number> target) {
    for (Number number : source) {
        target.add(number);
    }
}
```

`List<? extends Number>` 可能实际是 `List<Double>`，所以不能安全加入 Integer；从 `List<? super Number>` 取出的元素，编译器通常只能保证它是 Object。

### 13. Java 的异常体系是怎样的？

**直接回答：** `Throwable` 分为 `Error` 和 `Exception`。Error 通常表示应用难以局部恢复的运行环境问题；Exception 表示程序可以建模的失败，其中受检异常要求调用方捕获或声明，运行时异常不要求强制声明。

捕获异常不等于已经恢复。有效处理至少要做一件事：补充上下文后继续抛出、转换成业务错误、执行补偿，或在确实可恢复时降级。空 `catch` 会让失败失去证据；无差别捕获 `Throwable` 还可能吞掉本不应继续运行的错误。

### 14. `final`、`finally`、`finalize()` 有什么区别？

**直接回答：** `final` 是语言约束，可修饰变量、方法和类；`finally` 是异常控制流中的清理块；`finalize()` 是已弃用且不可依赖的回收回调。三者只是名字相似，没有共同机制。

`final` 引用不能重新赋值，但对象内容仍可能可变；`finally` 在常规控制流下会执行，却不应该被描述成“任何情况 100% 执行”；外部资源应使用确定性关闭，而不是等待 GC 或 `finalize()`。

### 15. try-with-resources 为什么更可靠？

**直接回答：** 它依据 `AutoCloseable` 契约，在成功和异常路径中都按声明逆序关闭资源；业务代码和关闭操作同时失败时，主异常保留，关闭异常放进 suppressed exceptions。

```java
try (InputStream in = Files.newInputStream(path);
     BufferedInputStream buffer = new BufferedInputStream(in)) {
    return buffer.readAllBytes();
}
```

GC 只管理 Java 对象可达性，不保证文件描述符、连接和锁及时释放。手写 `finally` 可以做到正确，但多资源、多个异常时更容易覆盖原始故障。

## 运行时扩展与对象复制

### 16. 反射和注解是什么？为什么框架经常一起用？

**直接回答：** 注解是结构化元数据，本身不会自动执行逻辑；反射允许程序在运行时检查类型、字段、方法和构造器。框架读取注解，再通过反射或生成代码完成对象创建、依赖注入和方法调用。

一个自定义注解要生效，至少需要正确的 `@Target`、`@Retention`，以及真正读取它的编译器、注解处理器或运行时组件。反射换来动态性，也削弱静态检查、封装和重构安全；业务代码能用接口或显式注册解决时，不应默认使用反射。

### 17. JDK 动态代理和普通反射调用有什么关系？

**直接回答：** 反射解决“运行时怎样调用未知成员”，JDK 动态代理解决“怎样为接口调用统一插入一层处理逻辑”。代理对象收到调用后进入 `InvocationHandler`，可以在调用目标方法前后做日志、事务、权限等横切处理。

```java
InvocationHandler handler = (proxy, method, args) -> {
    long start = System.nanoTime();
    try {
        return method.invoke(target, args);
    } finally {
        recordCost(method, start);
    }
};
```

JDK 动态代理的稳定边界是基于接口。针对类的代理通常需要字节码生成工具；但 `final`、自调用、可见性和模块边界仍可能限制代理行为，具体机制放在 [Spring 章节](../spring/question)。

### 18. 浅拷贝和深拷贝有什么区别？

**直接回答：** 浅拷贝复制对象本身的字段值，其中的引用字段仍指向同一子对象；深拷贝还会重建需要隔离的可变对象图。是否需要深拷贝取决于所有权，而不是对象层数。

如果子对象本身不可变，共享它通常安全；如果两个聚合必须独立修改，就要复制相关可变部分。用 Java 原生序列化做通用深拷贝成本高、边界模糊且有安全风险，更适合显式复制构造器、工厂方法或领域映射。

## 面试表达与验证

### 30 秒回答骨架

> Java 先把源码编译成 class 字节码，再由 JVM 在当前平台解释或 JIT 执行。语言层通过类型、封装、异常和泛型约束程序，运行时又能用反射扩展。回答基础题时我会区分语言保证、JVM 实现和业务约定，例如 Java 只有值传递，而 String 的内部 byte 数组只是 JDK 21 的实现。

### 最小验证清单

- 用 `javap -c -v` 区分源码、字节码与运行时分派。
- 改变变量声明类型，观察重载选择；替换真实对象，观察重写分派。
- 创建 `close()` 也抛异常的资源，检查 `getSuppressed()`。
- 把可变对象作为 HashMap Key，修改哈希字段后验证查找为何失败。

## 权威参考

- [Java Language Specification 21](https://docs.oracle.com/javase/specs/jls/se21/html/index.html)
- [Java Virtual Machine Specification 21](https://docs.oracle.com/javase/specs/jvms/se21/html/index.html)
- [JLS 5.1.7：Boxing Conversion](https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.7)
- [JLS 14.20.3：try-with-resources](https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.20.3)
- [OpenJDK 21 `String`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/lang/String.java)
- [OpenJDK 21 `Proxy`](https://github.com/openjdk/jdk/blob/jdk-21-ga/src/java.base/share/classes/java/lang/reflect/Proxy.java)

---

[← Java 学习路线](./question) · [下一章：Java 集合 →](./collections)
