---
outline: [2, 3]
---

# Spring 与 Spring Boot 面试题

Spring 的重点是把对象创建、依赖组装、横切能力和 Web 请求处理交给框架管理。先理解 Bean 和容器，再理解自动配置、事务与常见排错方式。

## IoC、Bean 与 AOP

### 1. 什么是 IoC 和 DI？

**面试一句话：** IoC（控制反转）是把对象创建和组装的控制权交给容器；DI（依赖注入）是容器把一个对象需要的依赖注入进去的具体方式。

以前 `OrderService` 自己 `new UserRepository()`；使用 Spring 后，容器创建 `UserRepository` 并注入 `OrderService`。这样实现可以替换、测试时也容易传入模拟对象。

### 2. Bean 是什么？常见作用域有哪些？

**面试一句话：** Bean 是由 Spring 容器创建、装配和管理的对象；默认 singleton 是每个容器一个实例，prototype 是每次获取创建一个实例，Web 环境还有 request、session 等作用域。

singleton Bean 会被多个请求线程共享，因此不要在普通单例 Service 中保存“当前用户”“本次请求”这类可变字段。无状态服务最容易保证线程安全。

### 3. 为什么推荐构造器注入？

**面试一句话：** 构造器注入能在对象创建时保证必需依赖齐全，字段可声明为 final，也更容易单元测试；字段注入虽然短，但隐藏依赖且不便于在容器外创建对象。

```java
@Service
class OrderService {
    private final OrderRepository repository;

    OrderService(OrderRepository repository) {
        this.repository = repository;
    }
}
```

只有一个构造器时，现代 Spring 通常无需再写 `@Autowired`。

### 4. Bean 的生命周期大致是什么？

**面试一句话：** 容器先实例化 Bean、注入依赖，再执行各种初始化回调，最后把可用 Bean 放入容器；容器关闭时执行销毁回调。

![Spring Bean 从定义到销毁的简化生命周期](/.image/interview/spring/bean/bean-lifecycle.svg)

常见扩展点有 `BeanPostProcessor`、`@PostConstruct`、`InitializingBean` 和 `@PreDestroy`。不要把耗时远程调用塞进初始化阶段，否则会拖慢甚至阻塞应用启动。

#### 源码解析：创建 Bean 时，初始化回调在依赖注入之后

以 Spring Framework 6 的 [`AbstractAutowireCapableBeanFactory.doCreateBean`](https://github.com/spring-projects/spring-framework/blob/v6.1.14/spring-beans/src/main/java/org/springframework/beans/factory/support/AbstractAutowireCapableBeanFactory.java) 为入口，核心顺序可以读成：实例化对象 → `populateBean` 注入依赖 → `initializeBean` 执行 Aware、前置处理器、初始化回调和后置处理器 → 暴露可用 Bean。这个顺序解释了为什么 `@PostConstruct` 中已经能使用注入的依赖，也解释了为什么 `BeanPostProcessor` 能参与代理创建。

源码中的三级缓存、早期引用等是为循环依赖等特定问题准备的实现细节；正常设计仍应优先用构造器注入消除循环依赖，而不是依赖这套兜底机制。

### 5. `@Component`、`@Service`、`@Repository` 和 `@Controller` 有什么区别？

**面试一句话：** 它们都能让组件扫描注册 Bean；`@Service`、`@Repository`、`@Controller` 更能表达层次语义，其中 `@Repository` 还可参与持久层异常转换。

选择正确注解首先是为了让代码更好读。接口层写 `@RestController`，它相当于 `@Controller + @ResponseBody`，适合直接返回 JSON 的 REST 接口。

### 6. AOP 是什么？适合解决什么问题？

**面试一句话：** AOP 将日志、鉴权、事务、监控等散落在许多业务方法中的横切逻辑集中处理；Spring 常通过代理在方法调用前后织入增强。

切面适合通用规则，不适合隐藏核心业务流程。切点范围过大可能带来意外性能与行为问题，应清晰限定包、注解或方法。

### 7. Spring AOP 的 JDK 动态代理和 CGLIB 有什么区别？

**面试一句话：** 目标类实现接口时可使用 JDK 动态代理，代理对象实现同一接口；CGLIB 通过生成目标类子类实现代理，因此不能代理 final 类或 final 方法。

具体选择可受配置和 Spring 版本影响。业务代码不应依赖代理类的具体类型；注入时优先面向接口。

### 8. 为什么同类内部调用会让 `@Transactional`、`@Async` 等注解失效？

**面试一句话：** 这类能力通常由 Spring 代理在“经过代理对象的方法调用”时触发；同一个对象内部直接 `this.method()` 没有经过代理，因此不会触发增强。

常见修复是把被增强方法拆到另一个 Bean，或从设计上重组职责。不要一遇到问题就从上下文手工拿自身代理，这会增加耦合。

## Spring Boot、Web 与事务

### 9. Spring Boot 自动配置是怎样工作的？

**面试一句话：** Spring Boot 根据 classpath 中的依赖、配置属性和条件注解决定是否创建默认 Bean；用户自己声明的 Bean 或配置通常可以覆盖默认行为。

例如有 Web 依赖时会配置 MVC 相关组件；有数据源配置和 JDBC 依赖时会尝试配置 DataSource。启动失败应先看条件评估报告和最底层异常，而不是盲目新增注解。

### 10. `@SpringBootApplication` 包含了什么？

**面试一句话：** 它组合了 `@SpringBootConfiguration`、`@EnableAutoConfiguration` 和 `@ComponentScan`，分别表示配置入口、启用自动配置和组件扫描。

启动类建议位于业务包的较上层，避免组件扫描不到下层 Bean；多模块项目中也可以显式指定扫描范围。

### 11. `@Configuration` 和 `@Component` 有什么区别？

**面试一句话：** 两者都能注册 Bean；`@Configuration` 专门表示配置类，并能确保其中 `@Bean` 方法互相调用时仍返回容器中的同一个单例，而普通 `@Component` 不应依赖这种完整配置语义。

配置类的 `@Bean` 方法应有清晰名称和明确依赖，不要把大量业务判断写入配置阶段。

### 12. Spring MVC 一次请求的大致流程是什么？

**面试一句话：** 请求先到 DispatcherServlet，再由 HandlerMapping 找到处理器，经过拦截器和参数解析后调用 Controller，最后通过消息转换器把返回对象写成 HTTP 响应。

全局异常处理通常使用 `@RestControllerAdvice`；输入校验使用 `@Valid` 与 Bean Validation 注解。错误响应要统一结构，但不要把完整堆栈或敏感内部信息返回给客户端。

### 13. 过滤器、拦截器和 AOP 怎样区分？

| 工具 | 主要位置 | 适合做什么 |
| --- | --- | --- |
| Filter | Servlet 容器层 | 编码、CORS、请求包装、最外层审计 |
| Interceptor | Spring MVC Handler 前后 | 登录态、接口权限、请求上下文 |
| AOP | Spring Bean 方法调用 | 事务、方法级日志、指标、通用业务切面 |

它们不是互相替代关系。选离目标最近、又能覆盖所需范围的工具即可。

### 14. `@Transactional` 的核心原理是什么？

**面试一句话：** Spring 通过 AOP 代理在方法调用前开启或加入事务，正常返回时提交，遇到符合回滚规则的异常时回滚；实际提交和回滚由底层事务管理器与数据库完成。

默认情况下，运行时异常会触发回滚，受检异常默认不一定回滚；需要时可显式配置 `rollbackFor`。事务边界应放在服务层业务操作周围，不要把长时间远程调用、用户等待等放进事务。

#### 源码解析：事务拦截器只在调用经过代理时生效

Spring 的 [`TransactionInterceptor.invoke`](https://github.com/spring-projects/spring-framework/blob/v6.1.14/spring-tx/src/main/java/org/springframework/transaction/interceptor/TransactionInterceptor.java) 委托 `TransactionAspectSupport.invokeWithinTransaction`：它先从 `@Transactional` 解析事务属性，再由事务管理器创建或加入事务，执行目标方法，最后按异常规则提交或回滚。简化后的骨架是：

```java
TransactionInfo tx = createTransactionIfNecessary(...);
try {
    Object result = invocation.proceed();
    commitTransactionAfterReturning(tx);
    return result;
} catch (Throwable ex) {
    completeTransactionAfterThrowing(tx, ex);
    throw ex;
}
```

![Spring 事务代理从方法调用到提交或回滚的关键步骤](/.image/interview/spring/transaction/transaction-interceptor.svg)

所以同类 `this.xxx()` 不会进入拦截器；另外，最终是否回滚还取决于传播行为、异常规则和底层资源是否真的加入同一事务。

### 15. 事务传播行为是什么？最常用的是什么？

**面试一句话：** 传播行为决定一个事务方法被另一个事务方法调用时如何处理已有事务；最常用的 `REQUIRED` 表示有事务就加入、没有就新建。

`REQUIRES_NEW` 会挂起外层事务并新开事务，适合少量必须独立提交的场景，但它不等于“更安全”：外层随后失败时两者可能不一致，连接池压力也会变大。

### 16. Spring Boot 线上排错先看什么？

**面试一句话：** 先确认请求、错误率、延迟、资源和依赖状态等现象，再从关联 ID 定位日志和调用链，最后根据根因修复并用测试或灰度验证；不要先改一堆配置碰运气。

常见排查点包括：配置是否生效、Bean 是否被扫描、线程池和连接池是否耗尽、下游超时、异常是否被错误吞掉。Actuator 很有帮助，但暴露端点必须经过鉴权并避免泄露环境信息。

---

[← Web 与网络](../web/io-network) · [下一层：MyBatis →](../persistence/mybatis)
