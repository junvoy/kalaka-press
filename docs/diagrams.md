# Java 面试流程图规范

本文档供内容维护者和 Agent 共同使用。Agent 的项目级入口位于根目录 `AGENTS.md`。

Java 面试题流程图统一存放在项目根目录的 `.image/interview/java/`，网页通过 Markdown 的标准图片语法引用。

按内容章节分包存储：

- `basic/`：Java 基础
- `collections/`：Java 集合
- `concurrency/`：并发
- `multithreading/`：多线程
- `jvm/`：JVM

## 文件约定

- 文件名使用小写英文和连字符，例如 `thread-pool-submit.svg`。
- SVG 必须放在对应的章节目录中，不在 Java 图片根目录平铺。
- 仓库只保留最终的 `.svg`，不提交临时 `.mmd` 和 `.drawio`。
- SVG 必须使用 draw.io 的 `Embed Diagram` 方式导出，保证浏览器能显示，也能重新在 draw.io 中编辑。
- 一张图只解释一个核心问题，节点文字尽量控制在两行以内。
- 每张图必须有准确的中文替代文本，不能使用空的 `![](...)`。

## 视觉约定

| 含义 | 填充色 | 边框色 |
| --- | --- | --- |
| 普通步骤 | `#eef2ff` | `#6366f1` |
| 判断或提醒 | `#fff7ed` | `#ea580c` |
| 并发、共享或内存区域 | `#ecfeff` | `#0891b2` |
| 完成或结果 | `#f0fdf4` | `#16a34a` |
| 失败或拒绝 | `#fef2f2` | `#dc2626` |

正文中的 SVG 已统一支持点击放大。设计时仍应保证不放大也能看懂主要结构，优先使用 1 到 2 层分支，避免超长文字和交叉连线。

## 生成流程

1. 用 Mermaid 编写临时的 `name.mmd`。
2. 转为原生 draw.io 文件：

   ```bash
   /Applications/draw.io.app/Contents/MacOS/draw.io -x -f xml -o name.drawio name.mmd
   ```

3. 导出带可编辑数据的 SVG：

   ```bash
   /Applications/draw.io.app/Contents/MacOS/draw.io -x -f svg -e -b 10 -o name.svg name.drawio
   ```

4. 删除临时 `.mmd` 和 `.drawio`，只提交 `name.svg`。
5. 将 SVG 放入 `.image/interview/java/<章节>/`，并在 Markdown 中使用相对路径引用。
6. 执行 `pnpm diagrams:check` 和 `pnpm docs:build`。

也可以直接用 draw.io 打开现有 SVG，编辑后覆盖保存。保存时必须继续启用 `Embed Diagram`，否则自动检查会失败。

流程图检查脚本使用 TypeScript 编写，文件为 `scripts/check-diagrams.mts`，通过 `node --import tsx` 兼容本地环境和 GitHub Actions 使用的 Node 24 LTS。
