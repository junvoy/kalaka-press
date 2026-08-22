export interface ResumeEntry {
  name: string
  role: string
  period: string
  summary?: string
  bullets?: string[]
}

export interface ProjectEntry extends ResumeEntry {
  modules?: string[]
  technologies: string[]
  responsibilities: string[]
  achievements: string[]
}

export const resume = {
  profile: {
    name: '李瑶',
    personalInfo: '个人信息已隐藏',
    phone: '177****5843',
    email: 'skr12332@163.com',
    experience: '6 年工作经验',
    intention: 'Java / AI Agent 应用',
    city: '深圳',
    title: 'Java / AI Agent 应用开发工程师'
  },

  highlights: [
    {
      title: 'AI Agent 全链路实战',
      content:
        '基于 Python、LangChain、MCP 从 0 到 1 落地 AI 应用，自研 MCP / Tool Calling 工具服务（入账、钉钉表格、邮件、群消息），设计 tick 状态机、双层幂等与人工复核安全边界，应用已投产，运营效率提升 5%。'
    },
    {
      title: 'Java 后端扎实',
      content:
        '6 年开发经验，5+ 个 Spring Cloud 项目从零搭建，主导日均百万级流量系统设计；精通高并发、分布式事务、缓存与消息队列优化，支撑 10W+ 设备并发在线场景。'
    },
    {
      title: '数据治理与全栈交付',
      content:
        '主导企业级主数据 / 配置中台全栈建设，打通 12 个运营系统数据孤岛，数据正确率 ≥90%、一致性时延 ≤3s，SDK 能力赋能 2+ 核心业务系统。'
    },
    {
      title: '工程效能与协作',
      content:
        '5 年敏捷开发、3 个跨部门项目落地经验；深度使用 Codex / Claude Code 等 AI 工具提效，交付周期缩短 25%，单元测试覆盖率 85%+，需求交付准时率 99%。'
    }
  ],

  skills: [
    {
      title: 'Java 后端（核心）',
      items: [
        'Java',
        '并发编程',
        '内存模型',
        'JVM 调优',
        'Spring',
        'Spring MVC',
        'Spring Boot',
        'Spring Cloud',
        'MyBatis',
        'Nacos',
        'Sentinel',
        'RocketMQ',
        '分布式事务',
        '设计模式'
      ]
    },
    {
      title: 'AI 应用（前沿）',
      items: [
        'Python',
        'LangChain',
        'OpenAI SDK',
        'MCP',
        'Tool Calling',
        'RAG',
        'Prompt Engineering',
        'Skills',
        'Agent 状态机',
        '幂等机制',
        '安全边界'
      ]
    },
    {
      title: '数据与中间件',
      items: [
        'MySQL',
        'SQL 优化',
        'Redis',
        '多级缓存',
        '分布式锁',
        'Elasticsearch',
        'RabbitMQ',
        'Kafka',
        'RocketMQ'
      ]
    },
    {
      title: '工程化与全栈',
      items: [
        'Git',
        'Linux',
        'Docker',
        'Jenkins',
        'Kubernetes',
        'CI/CD',
        'Prometheus',
        'Grafana',
        'Vue3',
        'Element-Plus',
        'Nginx',
        'OSS',
        'SLS'
      ]
    }
  ],

  experience: [
    {
      name: '深圳市中智信融资担保有限公司',
      role: '全栈 / AI 应用开发工程师',
      period: '2025.06 - 2026.07',
      summary:
        '负责融资担保业务清结算自动化与主数据平台建设，推动运营系统配置的集中治理与数据打通。',
      bullets: [
        '主导清结算自动化建设：设计并开发数据对账、邮件合并、OA 发起等 5+ 高复用流程组件，搭建“解析邮件 → OA → 对账”等 4+ 自动化流程，支撑 188 条付款流程与 14 条开票流程自动化，单流程节省约 0.32 人天，流程执行成功率稳定在 90% 以上，并增加异常重试与钉钉实时告警机制。',
        '主导企业级主数据平台建设：以项目为维度建设统一配置与数据治理中台，确立 7 大业务模块数据模型，通过 SDK 打通智能清结算、支付（商户）等核心业务系统，完成 378 条项目配置接入。',
        '主导 AI 应用落地：基于 Python、LangChain、MCP 从 0 到 1 交付线下还款 Agent，并推动 AI Coding 融入研发流程，项目交付周期平均缩短 25%。',
        '运用模板 / 工厂 / 策略 / 观察者等设计模式沉淀通用组件，新增业务模块开发时间从 5 天缩短至 3.5 天（缩短 30%），同时制定数据治理规范并推动团队文档沉淀。'
      ]
    },
    {
      name: '深圳市泰比特物联技术有限公司',
      role: 'Java',
      period: '2020.06 - 2025.05',
      summary:
        '负责百万级日活共享电单车平台（优驱出行）与车联网 IoT 系统研发，覆盖用户端、订单支付、车辆调度与终端通信全链路。',
      bullets: [
        '主导共享电单车平台核心模块开发，覆盖用户服务、订单支付、优惠营销、智能调度、终端通信网关等全链路，支撑百万级日活用户与日均 10W+ 订单量。',
        '攻克分布式事务一致性、高并发性能优化等关键技术瓶颈，提供技术解决方案，支撑日均百万级交易处理；通过 SQL 优化与缓存重构使数据库查询效率提升 3 倍，并推动建立技术债务偿还机制。',
        '主导高可用与可观测性建设：搭建 Prometheus + Grafana 监控体系，核心接口 SLA 99.99%，通过 Sentinel 熔断与故障自动降级保障系统高可用。',
        '推动工程效能建设：实施 CI/CD 流水线与敏捷开发落地，版本迭代周期缩短 20%，推动单元测试覆盖率从 60% 提升至 85%。'
      ]
    }
  ] satisfies ResumeEntry[],

  projects: [
    {
      name: '线下还款 Agent',
      role: '全栈工程师（AI Agent）',
      period: '2026.05 - 2026.07',
      summary:
        '面向融担运营平台的 AI 自动化应用。监听线下还款邮件，自动完成哈啰批量导入、携程手工还款等流程的入账处理，实现“邮件 → 入账”全链路自动化，降低人工操作与出错风险。',
      technologies: ['Python', 'LangChain', 'MCP', 'OSS', 'SLS', '钉钉'],
      responsibilities: [
        '从 0 到 1 完成 AI 应用的需求分析、系统设计与开发交付，独立完成技术方案。',
        '编写多个 MCP Service，封装入账系统、钉钉表格读写、邮件收发、钉钉群消息等通用 Tool Calling / Function Calling 工具。',
        '设计 tick 驱动确定性状态机：每轮触发完成“探测 → 幂等推进 → 邮件推进”，支持反复触发与故障自愈，保证 LLM 行为可控。',
        '设计“胖工具”接口，一次调用完成探测、幂等校验、提交与状态汇总，简化 Agent 调用链、降低模型幻觉影响。',
        '设计双层幂等机制（邮件级 UNSEEN / 已读 + 业务级平台记录现查闸门），杜绝重复入账，保障资金业务数据一致性。',
        '明确人工复核安全边界（申请人 ≠ 审批人），异常场景自动告警并记录审计日志，满足金融合规要求。'
      ],
      achievements: ['提升运营人员 5% 工作效率', 'AI 应用实际投产落地']
    },
    {
      name: '主数据',
      role: '全栈工程师',
      period: '2025.09 - 2026.07',
      summary:
        '面向融资担保业务的企业级主数据 / 配置中台，以项目为维度统一管理业务配置与开发配置，解决 12 个运营系统数据孤岛、标准不一、维护困难等问题，实现配置“集中维护、标准分发、动态生效”。',
      modules: [
        '项目配置',
        '机构配置',
        '对账配置',
        '资金路由',
        '基础数据',
        '支付配置',
        '发票配置',
        '开发配置',
        'SDK 模块'
      ],
      technologies: [
        'Spring Cloud',
        'Spring Boot',
        'Nacos',
        'MySQL',
        'OSS',
        'SLS',
        'Redis',
        'RocketMQ',
        'Nginx',
        'Aliyun DevOps',
        'Vue3',
        'Element-Plus'
      ],
      responsibilities: [
        '参与需求分析（运营方）与架构规划（技术选型、项目模块规划），开发核心模块（项目搭建、数据模型、数据分发、SDK 客户端）。',
        '基于 Spring MVC 实现数据实时分发，基于 Spring Cloud 实现开发配置动态变更，应用无需重启即可加载新配置。',
        '设计数据模型与配置流转状态机（录入 → 审批 → 发布 → 验证 → 回滚），支持审批流合并、变更可追溯与版本回滚。',
        '运用模板模式 + 工厂模式 + 策略模式 + 观察者模式，支持动态配置分发规则与数据模型扩展，降低新数据模型接入成本。',
        '制定并落实数据治理准则（数据分发规范、数据模型规范），保障数据一致性与标准化，沉淀主数据管理体系文档。'
      ],
      achievements: [
        '完成 378 条项目配置接入，30+ 项目在线稳定运行，线上错误率 ≤5%。',
        '打通智能清结算、支付（商户）等 2+ 核心业务系统数据互通，数据正确率 ≥90%，一致性时延 ≤3s。',
        '统一 7 大业务域数据模型口径，降低新项目接入成本，沉淀主数据治理规范。'
      ]
    },
    {
      name: '优驱出行（共享电单车平台 + 车联网 IoT 系统）',
      role: 'Java 开发工程师',
      period: '2020.07 - 2025.05',
      summary:
        '高并发场景标杆项目。支撑百万级日活的共享电单车互联网平台，解决出行“最后 3～10km”问题；同时面向百万级智能电单车的物联网终端系统，负责车辆实时数据采集、通信协议设计、设备状态监控。',
      modules: [
        '用户服务',
        '订单支付',
        '优惠营销',
        '智能调度',
        '智能围栏',
        '终端通信网关',
        'GPS 定位引擎',
        '电池安全监控',
        '电子围栏校验',
        '固件 OTA 升级'
      ],
      technologies: [
        'Spring Cloud',
        'Spring Boot',
        'Nacos',
        'MySQL',
        'OSS',
        'SLS',
        'Redis',
        'RabbitMQ',
        'Nginx',
        'Netty',
        'MQTT',
        'Prometheus',
        'Grafana',
        'Sentinel',
        'Vue3',
        'Element-Plus'
      ],
      responsibilities: [
        '基于 Spring Security 与 RBAC 模型构建鉴权体系，实现动态权限控制，系统安全性提升 40%。',
        'Redis + XXL-JOB 实现百万级车辆调度 / 换电任务，资源利用率提升 25%，重复调度率 ≤0.1%。',
        '基于 Netty 自研 ECU 设备通信协议栈，支撑 10W+ 台设备并发在线、10W+ QPS 车联网实时数据交互，端到端延迟 ≤50ms。',
        '通过 RabbitMQ 构建异步通信架构，实现 2000+/s 峰值消息处理，服务解耦度提升 60%，系统抗流量洪峰能力达 5 倍日常流量。',
        '线程池技术实现延迟指令队列 + 离线设备检测 + 批量数据落盘三合一处理，任务执行效率提升 3 倍，系统故障率下降 40%。',
        '设计 Redis 多级缓存 + Guava 本地缓存二级存储方案，系统响应时间从 800ms 降至 150ms，设备信息查询耗时从 120ms 优化至 15ms 内，缓存命中率超 99.5%。',
        'EasyExcel + MyBatis 批处理实现 10 万级数据秒级导入，异步任务机制使处理效率提升 5 倍。',
        '模板模式 + 工厂模式重构短信平台，支持多服务商动态切换，到达率 99.9%，稳定性提升 30%。',
        '基于 Prometheus + Grafana 搭建监控体系，核心接口（租借、支付）SLA 99.99%。',
        '通过 Sentinel 实现服务熔断与故障自动降级，保障核心链路稳定性。'
      ],
      achievements: [
        '服务用户 8000W+',
        '合作客户 700+',
        '行业市场占有率 60%+',
        '日均订单量 10W+'
      ]
    }
  ] satisfies ProjectEntry[],

  education: {
    school: '湖南工业大学',
    degree: '本科',
    major: '计算机科学与技术',
    period: '2016 - 2020'
  }
}
