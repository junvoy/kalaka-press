# Agent 项目说明

本仓库是基于 VitePress 的面试知识库。修改代码或内容时，优先保持现有目录结构、页面导航和移动端可读性。

## 开发约定

- 使用 pnpm，版本以 `package.json` 的 `packageManager` 字段为准。
- 修改后至少执行 `pnpm docs:build`；该命令会同时检查流程图、TypeScript 类型和 VitePress 构建。
- 不要覆盖与当前任务无关的工作区改动。
- 未经用户明确要求，不要提交或推送 Git 变更。

## 内容约定

- VitePress 正文放在 `src/`，站点配置和主题放在 `.vitepress/`。
- Java 面试内容按基础、集合、并发、多线程和 JVM 分章节维护。
- 内容需要让初学者也能理解；复杂流程优先使用图示，并为图片提供准确的中文替代文本。

## 流程图约定

- 编辑或新增流程图前，必须先阅读 [`docs/diagrams.md`](docs/diagrams.md)。
- Java 流程图放在 `.image/interview/java/<章节>/`，不能平铺到 Java 图片根目录。
- 仓库只保留内嵌 draw.io 可编辑数据的 SVG，不提交临时 `.mmd` 或 `.drawio` 文件。
- 完成后执行 `pnpm diagrams:check`，并确保引用流程图的 Markdown 页面能够正常构建。
