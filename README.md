# 云程阁

一个基于 VitePress 构建的中文技术面试与求职知识库，包含“葵花宝典”“天机秘卷”“青云策”三个栏目；内容强调从零理解、可直接复习，并使用可编辑流程图解释复杂概念。

在线访问：[https://junvoy.github.io/kalaka-press/](https://junvoy.github.io/kalaka-press/)

## 主要内容

- 葵花宝典：Java、数据库、中间件与后端工程面试题。
- 天机秘卷：AI Agent、大模型应用与工程化面试题。
- 青云策：简历编写、简历投递、面试准备与面试复盘。
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
| `pnpm site:check` | 检查构建产物、站内链接与维护文档隔离 |
| `pnpm docs:preview` | 预览生产构建结果 |

## 项目结构

```text
.
├── .image/                  # 站点图片与可编辑 SVG
├── .vitepress/              # VitePress 配置、主题和组件
├── docs/                    # 面向维护者的项目文档
├── scripts/                 # 自动检查脚本
├── src/
│   ├── career/              # 青云策
│   ├── interview/           # 葵花宝典与天机秘卷
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

技术内容的编写与审核遵循 [内容规范](docs/content-guide.md)。维护说明保留在仓库中，不进入读者页面和本地搜索。VitePress 配置通过 `srcExclude` 排除 `docs/`、`AGENTS.md`、`README.md` 和 `SKILL.md`；`docs:build` 还会检查最终产物，只允许 `src/` 中的正文页面及 404 页面发布，并验证站内链接、锚点和图片引用。站点隔离不改变这些开发文件在 Git 仓库中的可见性。

新增维护文档请放入 `docs/`；页面模板、AI 协作指令、编写计划与构建命令不要写进读者正文。AI 技术文章中的 Prompt 示例、工具调用与模型机制属于正常教学内容，应保留。

## License

本项目使用 [MIT License](https://github.com/junvoy/kalaka-press/blob/main/LICENSE)。
