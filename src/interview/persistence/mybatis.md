---
outline: [2, 3]
---

# MyBatis 面试题

MyBatis 将 SQL 与 Java 对象映射起来。它的价值是 SQL 可控、映射清晰；真正用好它，还要理解参数绑定、缓存、分页和动态 SQL 的边界。

## 基础原理

### 1. MyBatis 的核心组件有哪些？

**面试一句话：** MyBatis 读取全局配置和 Mapper 映射，创建 SqlSessionFactory；一次请求从 SqlSession 获取 Mapper 代理，解析 SQL、绑定参数、执行 JDBC，并把结果映射为 Java 对象。

可以把 Mapper 接口理解为“类型安全的 SQL 门面”：调用接口方法时，MyBatis 代理会找到对应 SQL 并执行。Mapper 本身通常不是业务逻辑层。

### 2. `#{}` 和 `${}` 有什么区别？

**面试一句话：** `#{}` 使用预编译参数绑定，能正确处理值并防止常见 SQL 注入；`${}` 是直接字符串拼接，只能在列名、排序方向等无法参数化的位置谨慎使用，并必须严格白名单校验。

```xml
SELECT * FROM user WHERE id = #{id}
```

用户输入绝不能直接放进 `${}`。即使使用了 `#{}`，权限控制和业务校验仍然不能省略。

### 3. MyBatis 的一级缓存和二级缓存是什么？

**面试一句话：** 一级缓存默认在 SqlSession 范围内，同一会话中相同查询可能复用结果；二级缓存跨 SqlSession、以 Mapper 命名空间为粒度，需要显式配置并谨慎处理一致性。

更新、提交、回滚等操作会影响一级缓存。分布式应用中多实例缓存失效复杂，通常优先使用更明确的业务缓存方案，而不是盲目打开 MyBatis 二级缓存。

### 4. Mapper 接口为什么不需要实现类？

**面试一句话：** MyBatis 在运行时为 Mapper 创建动态代理，代理根据“接口全限定名 + 方法名”等信息定位映射 SQL，再调用执行器完成数据库操作。

因此接口方法参数、返回类型和 XML 或注解中的 statement 必须匹配。启动时报绑定异常时，应检查 Mapper 扫描路径、namespace 和方法名。

#### 源码解析：代理把接口方法翻译成 `MappedStatement`

以 MyBatis 3 的 [`MapperProxy.invoke`](https://github.com/mybatis/mybatis-3/blob/mybatis-3.5.16/src/main/java/org/apache/ibatis/binding/MapperProxy.java) 为入口，代理会先处理 `Object` 的基础方法；其余接口方法会从缓存取得 `MapperMethod`，再调用 `execute(sqlSession, args)`。`MapperMethod.SqlCommand` 用 namespace 加方法名定位 `MappedStatement`，随后交给 `SqlSession`、`Executor`、`StatementHandler` 和 JDBC 执行。

![MyBatis Mapper 代理从接口方法到 JDBC 结果映射的调用流程](/.image/interview/persistence/mybatis/mapper-execution.svg)

这也说明两类常见错误的根因：找不到 statement 往往是 namespace / 方法签名 / 扫描范围不匹配；参数绑定异常则要回到 `#{}` 对应的参数名、`@Param` 和实际对象属性检查。代理只负责路由，不会替业务层补齐事务、权限或慢 SQL 优化。

## 映射、动态 SQL 与性能

### 5. `resultType` 和 `resultMap` 怎么选？

**面试一句话：** 字段名与 Java 属性名能直接对应时使用 resultType 更简单；列名、嵌套对象或复杂映射不一致时使用 resultMap 明确描述映射关系。

不要依赖模糊的自动映射掩盖字段差异。复杂查询应给列取清晰别名，并避免一个巨大 resultMap 同时承担多个业务视图。

### 6. 动态 SQL 有哪些常用标签？

**面试一句话：** `if` 用于可选条件，`where` 自动处理开头 AND/OR，`set` 处理更新字段逗号，`foreach` 生成 IN 列表或批量语句，`choose` 表达互斥分支。

动态条件必须有边界：空条件更新或删除极危险，应在业务层校验并可设置拦截保护。超长 `IN` 列表也会让 SQL 变大，应考虑分批或临时表等方案。

### 7. `#{}` 为什么能防 SQL 注入？它会影响索引吗？

**面试一句话：** `#{}` 会把 SQL 结构和参数值分开，通过 PreparedStatement 绑定参数，参数不会被当作 SQL 语法解析；在类型匹配的前提下，它不会天然让索引失效。

真正常见的索引问题是列上做函数、隐式类型转换、条件选择性低，或联合索引顺序不匹配。分析时要看实际执行计划。

### 8. MyBatis 怎样做分页？有什么坑？

**面试一句话：** 常见做法是在 SQL 中使用 `LIMIT` 或通过分页插件改写 SQL；深分页会因跳过大量行变慢，应优先用基于稳定排序键的游标分页。

分页查询必须有确定的 `ORDER BY`，否则同一条数据可能在不同页重复或遗漏。查询列表与统计总数也要评估成本，不能默认每次都执行昂贵的 `COUNT(*)`。

### 9. 什么是 N+1 查询问题？如何避免？

**面试一句话：** 先查一批父对象，再为每个父对象各执行一次子查询，会形成 1 + N 次数据库访问；N 变大时网络往返和数据库压力明显增加。

可按数据量和结果集大小选择 JOIN、一次 IN 批量查询后在内存组装，或经验证的延迟加载。不要因为怕 N+1 就把所有关联都 JOIN 成一个重复行爆炸的大结果集。

### 10. 批量插入和更新应注意什么？

**面试一句话：** 批处理能减少网络往返，但每批大小要结合 SQL 长度、事务日志、锁持有时间和数据库参数控制；大批量操作必须分批、可重试且可观测。

批量更新要使用合适索引缩小影响范围。不要在一个超长事务中更新百万行并期待它“只是慢一点”，它很容易导致锁等待、复制延迟和回滚风险。

---

[← Spring 与 Spring Boot](../spring/question) · [下一层：消息队列 →](../middleware/mq)
