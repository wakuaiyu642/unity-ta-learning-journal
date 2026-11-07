/**
 * 作品封面视觉组件。
 *
 * 封面来自 public/media/work-01.svg ~ work-05.svg（由 scripts/generate-visuals.mjs 生成），
 * 通过 `import.meta.env.BASE_URL` 拼接路径，兼容 GitHub Pages 的子路径部署。
 */

const WORK_VISUAL_COUNT = 5;

const WORK_VISUAL_FILES = [
  "work-01.svg",
  "work-02.svg",
  "work-03.svg",
  "work-04.svg",
  "work-05.svg"
] as const;

export interface WorkVisualProps {
  /** 作品编号，如「作品 01」；为空时回退到 index。 */
  code?: string;
  /** 作品在列表中的下标（0 起），用于没有编号时的回退。 */
  index?: number;
  /** 图片替代文本（一般用作品标题）。 */
  title: string;
  /** 自定义 className；默认 "work-visual"。 */
  className?: string;
  /** 纯装饰用途：alt 置空并 aria-hidden，避免与卡片标题重复朗读。 */
  decorative?: boolean;
}

function mediaUrl(file: string): string {
  return `${import.meta.env.BASE_URL}media/${file}`;
}

/** 从「作品 01」「作品01」「WORK 1」「01」等编号中解析出 1..5 的序号。 */
function parseWorkIndex(code: string | undefined): number | null {
  if (!code) return null;
  const match = /(?:作品|work)?\s*0*([1-9])/i.exec(code.trim());
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 1 && value <= WORK_VISUAL_COUNT
    ? value
    : null;
}

/**
 * 返回作品封面的 URL。
 *
 * 解析顺序：`code` 中的作品编号 → `index`（0-4）→ work-01.svg 兜底。
 */
export function workVisualPath(code: string, index: number): string {
  const parsed = parseWorkIndex(code);
  if (parsed !== null) {
    return mediaUrl(WORK_VISUAL_FILES[parsed - 1]);
  }
  if (Number.isInteger(index) && index >= 0 && index < WORK_VISUAL_COUNT) {
    return mediaUrl(WORK_VISUAL_FILES[index]);
  }
  return mediaUrl(WORK_VISUAL_FILES[0]);
}

/**
 * 作品封面图：`<img className="work-visual" src=... alt=title loading="lazy" />`。
 *
 * 建议在卡片封面容器里用 CSS 控制尺寸与 `object-fit: cover`（例如 `.work-visual`）。
 */
export function WorkVisual({
  code,
  index = 0,
  title,
  className,
  decorative = false
}: WorkVisualProps) {
  return (
    <img
      className={className ?? "work-visual"}
      src={workVisualPath(code ?? "", index)}
      alt={decorative ? "" : title}
      aria-hidden={decorative || undefined}
      loading="lazy"
    />
  );
}
