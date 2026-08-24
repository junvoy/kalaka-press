import type { MarkdownRenderer } from 'vitepress';

const CJK_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const LATIN_WORD_PATTERN = /[A-Za-z0-9]+(?:[._+#/-][A-Za-z0-9]+)*/g;

type ReadingMetrics = {
  cjkCharacters: number;
  codeLines: number;
  images: number;
  latinWords: number;
};

const createMetrics = (): ReadingMetrics => ({
  cjkCharacters: 0,
  codeLines: 0,
  images: 0,
  latinWords: 0,
});

const addTextMetrics = (metrics: ReadingMetrics, content: string) => {
  metrics.cjkCharacters += content.match(CJK_CHARACTER_PATTERN)?.length ?? 0;
  metrics.latinWords += content.match(LATIN_WORD_PATTERN)?.length ?? 0;
};

const estimateMinutes = (metrics: ReadingMetrics) =>
  Math.max(
    1,
    Math.ceil(
      metrics.cjkCharacters / 320 +
        metrics.latinWords / 200 +
        metrics.codeLines / 12 +
        metrics.images * 0.5
    )
  );

export const pageReadingTime = (md: MarkdownRenderer) => {
  md.core.ruler.after('inline', 'page-reading-time', (state) => {
    const metrics = createMetrics();
    const { tokens } = state;

    for (const token of tokens) {
      if (token.type === 'fence' || token.type === 'code_block') {
        metrics.codeLines += token.content
          .split('\n')
          .filter((line) => line.trim().length > 0).length;
        continue;
      }

      if (token.type === 'html_block') {
        addTextMetrics(metrics, token.content.replace(/<[^>]+>/g, ' '));
        continue;
      }

      if (token.type !== 'inline') {
        continue;
      }

      if (!token.children) {
        addTextMetrics(metrics, token.content);
        continue;
      }

      for (const child of token.children) {
        if (child.type === 'image') {
          metrics.images += 1;
        } else if (child.type === 'text' || child.type === 'code_inline') {
          addTextMetrics(metrics, child.content);
        } else if (child.type === 'html_inline') {
          addTextMetrics(metrics, child.content.replace(/<[^>]+>/g, ' '));
        }
      }
    }

    const firstHeadingIndex = tokens.findIndex(
      (token) => token.type === 'heading_open' && token.tag === 'h1'
    );

    if (firstHeadingIndex < 0) {
      return;
    }

    const headingCloseIndex = tokens.findIndex(
      (token, index) =>
        index > firstHeadingIndex &&
        token.type === 'heading_close' &&
        token.tag === 'h1'
    );

    if (headingCloseIndex < 0) {
      return;
    }

    const pageMeta = new state.Token('html_block', '', 0);
    pageMeta.content = `<div class="page-reading-time" role="note" aria-label="预计阅读时间"><span class="page-reading-time-icon" aria-hidden="true"></span><span>预计阅读</span><strong>${estimateMinutes(metrics)} 分钟</strong></div>\n`;
    tokens.splice(headingCloseIndex + 1, 0, pageMeta);
  });
};
