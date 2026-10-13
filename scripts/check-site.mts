import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.vitepress/dist');
const base = '/kalaka-press/';
const origin = 'https://junvoy.github.io';
const errors = new Set<string>();

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) =>
      String.fromCodePoint(code.startsWith('x') ? parseInt(code.slice(1), 16) : Number(code)));
}

if (!existsSync(output)) {
  throw new Error('找不到构建产物，请先执行 pnpm docs:build。');
}

// 发布清单只来自读者正文目录；维护文档即使误入构建也会阻止发布。
const expected = new Set(walk(join(root, 'src'))
  .filter((file) => file.endsWith('.md') && !/\/(?:AGENTS|README|SKILL)\.md$/.test(file))
  .map((file) => relative(root, file).replace(/^src\/index\.md$/, 'index.md').replace(/\.md$/, '.html')));
expected.add('404.html');
const files = walk(output);
const pages = new Map(files.filter((file) => file.endsWith('.html'))
  .map((file) => [relative(output, file), readFileSync(file, 'utf8')]));
const anchors = new Map([...pages].map(([path, html]) => [path,
  new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => decodeHtml(match[1]!)))
]));

for (const path of expected) {
  if (!pages.has(path)) errors.add(`缺少页面：${path}`);
}

let links = 0;
for (const [path, html] of pages) {
  if (!expected.has(path)) errors.add(`非读者页面进入发布目录：${path}`);
  for (const match of html.matchAll(/<(?:a|img)\b[^>]*?\b(?:href|src)="([^"]+)"/g)) {
    const target = decodeHtml(match[1]!);
    const url = new URL(target, `${origin}${base}${path}`);
    if (url.origin !== origin) continue;
    links += 1;
    if (!url.pathname.startsWith(base)) {
      errors.add(`${path} 的链接缺少站点 base：${target}`);
      continue;
    }
    const local = decodeURIComponent(url.pathname.slice(base.length));
    const candidates = local.endsWith('/') || !local
      ? [`${local}index.html`]
      : extname(local) ? [local] : [`${local}.html`, `${local}/index.html`, local];
    const destination = candidates.find((candidate) => {
      const file = join(output, candidate);
      return existsSync(file) && statSync(file).isFile();
    });
    if (!destination) {
      errors.add(`${path} 的站内链接或图片不存在：${target}`);
    } else if (url.hash && anchors.has(destination)) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (!anchors.get(destination)!.has(id)) errors.add(`${path} 的锚点不存在：${target}`);
    }
  }
}

// 检查 HTML、客户端页面块和本地搜索索引，不能只把入口用 CSS 藏起来。
for (const file of files.filter((file) => /\.(?:html|js|json)$/.test(file))) {
  const text = readFileSync(file, 'utf8');
  if (/Agent 项目说明|第一性原理内容编写规范|审核准入标准/.test(text)) {
    errors.add(`维护内容进入发布产物：${relative(output, file)}`);
  }
}

if (errors.size) {
  console.error(`站点检查失败：\n${[...errors].map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}
console.log(`站点检查通过：${pages.size} 个页面、${links} 个站内链接和图片引用；维护内容未进入发布产物。`);
