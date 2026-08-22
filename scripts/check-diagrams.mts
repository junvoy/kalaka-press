import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = join(projectRoot, 'src');
const diagramRoot = join(projectRoot, '.image/interview/java');
const maxSvgBytes = 512 * 1024;
const ignoredDirectories = new Set(['.git', '.vitepress', 'node_modules']);
const chapterDirectories = new Set(['basic', 'collections', 'concurrency', 'multithreading', 'jvm']);
const errors: string[] = [];
const referencedSvgFiles = new Set<string>();

function walk(directory: string, extension: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : walk(absolutePath, extension);
    }

    return extname(entry.name) === extension ? [absolutePath] : [];
  });
}

function isWithin(directory: string, filePath: string): boolean {
  const relativePath = relative(directory, filePath);
  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${sep}`)
    && !isAbsolute(relativePath);
}

for (const markdownPath of walk(contentRoot, '.md')) {
  const markdown = readFileSync(markdownPath, 'utf8');
  const imagePattern = /!\[([^\]]*)\]\(([^)]+\.svg(?:[?#][^)]*)?)\)/g;

  for (const match of markdown.matchAll(imagePattern)) {
    const altText = match[1] ?? '';
    const rawTarget = match[2] ?? '';
    const target = rawTarget.trim().replace(/^<|>$/g, '').split(/[?#]/, 1)[0] ?? '';

    if (/^(?:https?:|data:|\/)/.test(target)) {
      continue;
    }

    const svgPath = resolve(dirname(markdownPath), decodeURIComponent(target));
    referencedSvgFiles.add(svgPath);

    if (!altText.trim()) {
      errors.push(`${relative(projectRoot, markdownPath)} 存在没有替代文本的 SVG 引用：${target}`);
    }

    if (!existsSync(svgPath)) {
      errors.push(`${relative(projectRoot, markdownPath)} 引用了不存在的 SVG：${target}`);
    }
  }
}

const diagramFiles = walk(diagramRoot, '.svg');

for (const svgPath of diagramFiles) {
  const relativePath = relative(diagramRoot, svgPath);
  const pathParts = relativePath.split(sep);
  const chapter = pathParts[0] ?? '';
  const filename = basename(svgPath);
  const svg = readFileSync(svgPath, 'utf8');
  const size = statSync(svgPath).size;

  if (pathParts.length !== 2 || !chapterDirectories.has(chapter)) {
    errors.push(`${relativePath} 必须放在 Java 章节分包目录中`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(filename)) {
    errors.push(`${relativePath} 不符合小写连字符命名规范`);
  }

  if (!svg.startsWith('<?xml') || !/<svg\b/.test(svg) || !/<\/svg>\s*$/.test(svg)) {
    errors.push(`${relativePath} 不是结构完整的 SVG/XML 文件`);
  }

  if (!/\bviewBox="[^"]+"/.test(svg) || !/\bwidth="[^"]+"/.test(svg) || !/\bheight="[^"]+"/.test(svg)) {
    errors.push(`${relativePath} 缺少 width、height 或 viewBox`);
  }

  if (!/content="&lt;mxfile\b/.test(svg)) {
    errors.push(`${relativePath} 没有内嵌 draw.io 可编辑数据`);
  }

  if (size > maxSvgBytes) {
    errors.push(`${relativePath} 大小为 ${Math.ceil(size / 1024)} KiB，超过 512 KiB 上限`);
  }

  if (!referencedSvgFiles.has(svgPath)) {
    errors.push(`${relativePath} 没有被任何 Markdown 页面引用`);
  }
}

for (const svgPath of referencedSvgFiles) {
  if (isWithin(diagramRoot, svgPath) && !diagramFiles.includes(svgPath)) {
    errors.push(`${relative(projectRoot, svgPath)} 不在图表文件清单中`);
  }
}

if (errors.length > 0) {
  console.error('流程图检查失败：');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`流程图检查通过：${diagramFiles.length} 个可编辑 SVG，${referencedSvgFiles.size} 个本地 SVG 引用。`);
