# 葵花宝典

一个基于 VitePress 构建的中文技术面试与求职知识库，内容强调从零理解、可直接复习，并使用可编辑流程图解释复杂概念。

在线访问：[https://junvoy.github.io/kalaka-press/](https://junvoy.github.io/kalaka-press/)

## 主要内容

- Java 面试：Java 基础、集合、并发、多线程和 JVM。
- 数据库面试：MySQL、Redis 等常见问题。
- 求职指南：简历编写、简历投递、面试准备与面试复盘。
- 在线简历：适合网页展示的公开版本。

## 本地开发

建议使用 Node.js 24 LTS。pnpm 版本以 `package.json` 的 `packageManager` 字段为准。

```bash
pnpm install --frozen-lockfile
pnpm docs:dev
```

开发服务启动后，根据终端输出访问本地地址。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm docs:dev` | 启动本地开发服务 |
| `pnpm diagrams:check` | 检查 SVG 引用、命名和 draw.io 可编辑数据 |
| `pnpm typecheck` | 执行 TypeScript 类型检查 |
| `pnpm docs:build` | 执行全部检查并构建生产站点 |
| `pnpm docs:preview` | 预览生产构建结果 |

## 项目结构

```text
.
├── .image/                  # 站点图片与可编辑 SVG
├── .vitepress/              # VitePress 配置、主题和组件
├── docs/                    # 面向维护者的项目文档
├── scripts/                 # 自动检查脚本
├── src/
│   ├── career/              # 求职指南
│   ├── interview/           # 面试知识库
│   └── resume/              # 在线简历
├── AGENTS.md                # Agent 项目级工作说明
└── package.json
```

## 流程图

Java 面试流程图按章节存放在 `.image/interview/java/`。仓库保留的 SVG 内嵌 draw.io 数据，可以直接重新打开和编辑。

新增或修改流程图前，请阅读 [流程图规范](docs/diagrams.md)。完成后执行：

```bash
pnpm diagrams:check
pnpm docs:build
```

## 部署

`main` 是受保护分支，不允许直接推送。所有修改需要从功能分支发起 Pull Request，并通过 [PR 检查](.github/workflows/check.yml)；合并到 `main` 后，[部署工作流](.github/workflows/deploy.yml) 会使用 Node.js 24 LTS 构建站点并部署到 GitHub Pages。

## Agent 协作

自动化编码工具开始工作前应先阅读 [AGENTS.md](AGENTS.md)，其中记录了本仓库的目录、验证和流程图约定。

## License

本项目使用 [MIT License](https://github.com/junvoy/kalaka-press/blob/main/LICENSE)。
