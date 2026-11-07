#!/usr/bin/env node
/**
 * 生成「成长管线 / Growth Pipeline」的原创视觉素材。
 *
 * 所有图形均由本脚本用几何图形、渐变、噪点（feTurbulence）现画，
 * 不包含任何第三方图片/图标，无版权风险。
 *
 * 输出（public/media/）：
 *   work-01.svg ... work-05.svg  1200x750  作品封面占位（抽象 Shader / 渲染质感）
 *   hero-texture.svg             1920x1080 首页 hero 背景纹理（低调，不抢文字）
 *   avatar-default.svg           512x512   默认头像（圆形渐变 + TA 字母）
 *   og-cover.png                 1200x630  社交分享图（sharp 把 SVG 渲染成 PNG）
 *
 * 用法：
 *   node scripts/generate-visuals.mjs
 *
 * 依赖：sharp（已是 devDependency，无需新增依赖）。
 * 产物可随时重新生成；随机数使用固定种子，输出稳定、便于 diff。
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "media");

/** 站点设计系统色板（与 src/styles.css 的 CSS 变量一致）。 */
const C = {
  forest: "#123f3a",
  forestDeep: "#0a2b27",
  forest2: "#1d5850",
  moss: "#2f6f5f",
  mint: "#58c4a6",
  mintSoft: "#96e3cd",
  amber: "#c98f4f",
  amberSoft: "#ecc387",
  sand: "#cbb98f",
  cream: "#f6f2e9"
};

const WORK_W = 1200;
const WORK_H = 750;

const SANS =
  "'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', Arial, sans-serif";
const MONO = "ui-monospace, 'Cascadia Code', Consolas, 'Courier New', monospace";

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

/** 确定性伪随机数（mulberry32），保证每次生成结果一致。 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toFixed(value, digits = 1) {
  return Number(value).toFixed(digits);
}

/** 正弦波折线路径（用于水面、帧时间曲线等）。 */
function wavePath({ width, y, amp, wavelength, phase = 0, samples = 120 }) {
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = (width / samples) * i;
    const wave = Math.sin((x / wavelength) * Math.PI * 2 + phase);
    points.push(`${toFixed(x)} ${toFixed(y + wave * amp)}`);
  }
  return `M ${points.join(" L ")}`;
}

/** 把点集按 Catmull-Rom 平滑成闭合路径（用于有机「材质斑块」）。 */
function smoothClosedPath(points) {
  const n = points.length;
  let d = `M ${toFixed(points[0].x)} ${toFixed(points[0].y)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${toFixed(c1x)} ${toFixed(c1y)} ${toFixed(c2x)} ${toFixed(c2y)} ${toFixed(p2.x)} ${toFixed(p2.y)}`;
  }
  return `${d} Z`;
}

function blobPoints(random, cx, cy, r, count) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    const radius = r * (0.72 + random() * 0.4);
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.82
    });
  }
  return points;
}

/** 缩略数字：1 -> "01" */
function pad2(value) {
  return String(value).padStart(2, "0");
}

/* ------------------------------------------------------------------ */
/* 作品封面：共用外壳                                                  */
/* ------------------------------------------------------------------ */

function coverDefs({ seed, glowX, glowY, glowColor }) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a544b"/>
      <stop offset="0.46" stop-color="${C.forest}"/>
      <stop offset="1" stop-color="#092521"/>
    </linearGradient>
    <radialGradient id="bg-glow" cx="${glowX}" cy="${glowY}" r="0.9">
      <stop offset="0" stop-color="${glowColor}" stop-opacity="0.3"/>
      <stop offset="0.45" stop-color="${glowColor}" stop-opacity="0.09"/>
      <stop offset="1" stop-color="${glowColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#061b18" stop-opacity="0"/>
      <stop offset="0.62" stop-color="#061b18" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#061b18" stop-opacity="0.66"/>
    </linearGradient>
    <linearGradient id="ribbon-mint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.mint}" stop-opacity="0"/>
      <stop offset="0.3" stop-color="${C.mint}" stop-opacity="0.34"/>
      <stop offset="0.7" stop-color="${C.mintSoft}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${C.mint}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ribbon-amber" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.amber}" stop-opacity="0"/>
      <stop offset="0.34" stop-color="${C.amber}" stop-opacity="0.3"/>
      <stop offset="0.72" stop-color="${C.amberSoft}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${C.amberSoft}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="line-mint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.mint}" stop-opacity="0"/>
      <stop offset="0.35" stop-color="${C.mintSoft}" stop-opacity="0.9"/>
      <stop offset="0.72" stop-color="${C.mint}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${C.amberSoft}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid-fine" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="${C.cream}" stroke-opacity="0.05"/>
    </pattern>
    <pattern id="grid-major" width="160" height="160" patternUnits="userSpaceOnUse">
      <path d="M160 0H0V160" fill="none" stroke="${C.cream}" stroke-opacity="0.055"/>
    </pattern>
    <filter id="soft-hero" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
    <filter id="soft-16" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray">
        <feFuncA type="linear" slope="0.46"/>
      </feComponentTransfer>
    </filter>
  </defs>`;
}

function coverChrome(index, label) {
  const n = pad2(index + 1);
  return `<g font-family="${SANS}">
    <g transform="translate(72 64)">
      <rect x="-10" y="-18" width="24" height="24" rx="7" fill="none" stroke="${C.mint}" stroke-opacity="0.5"/>
      <path d="M-3 -10 L3 -10 M-3 -4 L6 -4" fill="none" stroke="${C.mint}" stroke-opacity="0.8" stroke-width="1.6" stroke-linecap="round"/>
      <text x="30" y="2" font-size="12" letter-spacing="4.5" fill="${C.cream}" fill-opacity="0.55">WORK ${n}</text>
    </g>
    <text x="${WORK_W - 72}" y="64" text-anchor="end" font-size="11" letter-spacing="3.2" fill="${C.cream}" fill-opacity="0.3">GROWTH PIPELINE</text>
    <text x="72" y="${WORK_H - 38}" font-size="58" font-weight="700" letter-spacing="4" fill="${C.cream}" fill-opacity="0.13">${n}</text>
    <text x="${WORK_W - 72}" y="${WORK_H - 44}" text-anchor="end" font-family="${MONO}" font-size="12" letter-spacing="2.4" fill="${C.mint}" fill-opacity="0.62">${label}</text>
  </g>`;
}

function coverSvg({ index, seed, title, label, glow, motif }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WORK_W}" height="${WORK_H}" viewBox="0 0 ${WORK_W} ${WORK_H}" role="img" aria-label="${title}">
  <title>${title}</title>
  ${coverDefs({ seed, ...glow })}
  ${motif.defs}
  <rect width="${WORK_W}" height="${WORK_H}" fill="url(#bg)"/>
  <rect width="${WORK_W}" height="${WORK_H}" fill="url(#bg-glow)"/>
  <rect width="${WORK_W}" height="${WORK_H}" fill="url(#grid-fine)"/>
  <rect width="${WORK_W}" height="${WORK_H}" fill="url(#grid-major)"/>
  ${motif.body}
  <rect width="${WORK_W}" height="${WORK_H}" fill="url(#scrim)"/>
  <rect width="${WORK_W}" height="${WORK_H}" filter="url(#grain)" opacity="0.17"/>
  <rect x="26" y="26" width="${WORK_W - 52}" height="${WORK_H - 52}" rx="22" fill="none" stroke="${C.cream}" stroke-opacity="0.07"/>
  ${coverChrome(index, label)}
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* 作品封面：五种主题动机                                               */
/* ------------------------------------------------------------------ */

/** 01 Shader 效果合集：分层光斑 + 色带。 */
function motifShader(seed) {
  const random = mulberry32(seed);
  const orbs = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 160 + random() * 900;
    const y = 150 + random() * 480;
    const r = 1.6 + random() * 3.4;
    const op = 0.18 + random() * 0.5;
    const color = i % 3 === 0 ? C.amberSoft : C.mintSoft;
    orbs.push(
      `<circle cx="${toFixed(x)}" cy="${toFixed(y)}" r="${toFixed(r)}" fill="${color}" fill-opacity="${toFixed(op, 2)}"/>`
    );
  }

  return {
    defs: `<defs>
      <radialGradient id="orb-glow">
        <stop offset="0" stop-color="${C.mintSoft}" stop-opacity="0.9"/>
        <stop offset="1" stop-color="${C.mintSoft}" stop-opacity="0"/>
      </radialGradient>
    </defs>`,
    body: `<g filter="url(#soft-hero)" opacity="0.95">
      <ellipse cx="880" cy="205" rx="330" ry="240" fill="${C.mint}" fill-opacity="0.2"/>
      <ellipse cx="300" cy="600" rx="320" ry="190" fill="${C.amber}" fill-opacity="0.14"/>
      <ellipse cx="600" cy="370" rx="230" ry="180" fill="${C.mintSoft}" fill-opacity="0.08"/>
    </g>
    <g>
      <path d="M-80 622 C 180 470 380 700 680 520 C 920 378 1100 430 1280 360 L 1280 520 C 1080 560 900 572 700 612 C 430 666 180 742 -80 682 Z" fill="url(#ribbon-mint)"/>
      <path d="M-80 470 C 120 400 300 470 520 400 C 780 318 980 360 1280 250 L 1280 342 C 1000 430 820 422 600 472 C 380 522 160 562 -80 542 Z" fill="url(#ribbon-amber)"/>
      <path d="M-80 330 C 220 260 420 330 640 270 C 860 212 1080 250 1280 190 L 1280 242 C 1040 302 860 292 660 332 C 420 380 200 402 -80 382 Z" fill="url(#ribbon-mint)" opacity="0.8"/>
    </g>
    <g fill="none" stroke="url(#line-mint)" stroke-linecap="round">
      <path d="M-60 604 C 200 470 380 700 680 526 C 920 384 1100 436 1280 366" stroke-width="2" opacity="0.95"/>
      <path d="M-60 636 C 200 502 380 732 680 558 C 920 416 1100 468 1280 398" stroke-width="1.1" opacity="0.4"/>
      <path d="M-60 458 C 120 388 300 458 520 388 C 780 306 980 348 1280 238" stroke-width="1.5" opacity="0.7"/>
      <path d="M-60 490 C 120 420 300 490 520 420 C 780 338 980 380 1280 270" stroke-width="0.9" opacity="0.3"/>
    </g>
    <g fill="none" stroke="${C.cream}" stroke-opacity="0.16">
      <path d="M-60 570 C 200 438 380 668 680 494 C 920 352 1100 404 1280 334" stroke-width="1"/>
      <path d="M-60 424 C 120 354 300 424 520 354 C 780 272 980 314 1280 204" stroke-width="0.8"/>
    </g>
    <g filter="url(#soft-16)">
      <circle cx="1010" cy="300" r="46" fill="url(#orb-glow)" fill-opacity="0.55"/>
      <circle cx="220" cy="470" r="34" fill="url(#orb-glow)" fill-opacity="0.45"/>
    </g>
    <g>${orbs.join("\n      ")}
    </g>`
  };
}

/** 02 动态水面：波纹 + 噪点线条 + 高光。 */
function motifWater(seed) {
  const random = mulberry32(seed);
  const lines = [];
  for (let i = 0; i < 19; i += 1) {
    const t = i / 18;
    const y = 258 + t * 422;
    const amp = 4 + t * 20 + random() * 6;
    const wavelength = 240 + random() * 220;
    const phase = random() * Math.PI * 2;
    const stroke = i % 6 === 4 ? C.amberSoft : C.mintSoft;
    const opacity = 0.09 + t * 0.44;
    const width = i % 5 === 0 ? 1.8 : 1;
    lines.push(
      `<path d="${wavePath({ width: WORK_W, y, amp, wavelength, phase })}" fill="none" stroke="${stroke}" stroke-opacity="${toFixed(opacity, 2)}" stroke-width="${width}" stroke-linecap="round"/>`
    );
  }

  const sparkles = [];
  for (let i = 0; i < 26; i += 1) {
    const x = 80 + random() * 1040;
    const y = 330 + random() * 350;
    const r = 0.8 + random() * 2.2;
    sparkles.push(
      `<circle cx="${toFixed(x)}" cy="${toFixed(y)}" r="${toFixed(r)}" fill="${C.cream}" fill-opacity="${toFixed(0.1 + random() * 0.4, 2)}"/>`
    );
  }

  const reflections = [];
  for (let i = 0; i < 5; i += 1) {
    const x = 760 + i * 42;
    const w = 16 + random() * 26;
    reflections.push(
      `<rect x="${x}" y="300" width="${toFixed(w)}" height="360" fill="url(#shaft)" opacity="${toFixed(0.1 + random() * 0.14, 2)}"/>`
    );
  }

  return {
    defs: `<defs>
      <radialGradient id="moon">
        <stop offset="0" stop-color="${C.cream}" stop-opacity="0.85"/>
        <stop offset="0.55" stop-color="${C.mintSoft}" stop-opacity="0.4"/>
        <stop offset="1" stop-color="${C.mintSoft}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.mintSoft}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${C.mintSoft}" stop-opacity="0"/>
      </linearGradient>
    </defs>`,
    body: `<g filter="url(#soft-hero)">
      <circle cx="920" cy="150" r="190" fill="${C.mintSoft}" fill-opacity="0.2"/>
    </g>
    <circle cx="920" cy="150" r="70" fill="url(#moon)" opacity="0.5"/>
    <path d="M0 452 C 220 438 420 470 640 460 C 880 448 1040 470 1200 456 L 1200 750 L 0 750 Z" fill="#082520" fill-opacity="0.55"/>
    <g filter="url(#soft-16)">${reflections.join("\n      ")}
    </g>
    <g>${lines.join("\n      ")}
    </g>
    <g>${sparkles.join("\n      ")}
    </g>`
  };
}

/** 03 动态环境材质系统：斑块混合 + 积雪/湿润颗粒。 */
function motifMaterial(seed) {
  const random = mulberry32(seed);
  const blobs = [
    { cx: 300, cy: 320, r: 235, n: 9, fill: "url(#blob-mint)", stroke: C.mint, opacity: 0.52 },
    { cx: 800, cy: 250, r: 265, n: 8, fill: "url(#blob-amber)", stroke: C.amberSoft, opacity: 0.42 },
    { cx: 960, cy: 560, r: 220, n: 10, fill: "url(#blob-moss)", stroke: C.mintSoft, opacity: 0.48 },
    { cx: 520, cy: 590, r: 205, n: 7, fill: "url(#blob-mint)", stroke: C.mint, opacity: 0.36 },
    { cx: 545, cy: 360, r: 150, n: 6, fill: "url(#blob-sand)", stroke: C.amberSoft, opacity: 0.3 }
  ];

  const fills = [];
  const outlines = [];
  const contours = [];
  for (const blob of blobs) {
    const points = blobPoints(random, blob.cx, blob.cy, blob.r, blob.n);
    const d = smoothClosedPath(points);
    fills.push(`<path d="${d}" fill="${blob.fill}" fill-opacity="${blob.opacity}" filter="url(#soft-16)"/>`);
    outlines.push(
      `<path d="${d}" fill="none" stroke="${blob.stroke}" stroke-opacity="0.3" stroke-width="1.2"/>`
    );
    // 同心的收缩轮廓，模拟材质分层/湿润边缘
    const inner = points.map((p) => ({
      x: blob.cx + (p.x - blob.cx) * 0.84,
      y: blob.cy + (p.y - blob.cy) * 0.84
    }));
    contours.push(
      `<path d="${smoothClosedPath(inner)}" fill="none" stroke="${blob.stroke}" stroke-opacity="0.16" stroke-width="1"/>`
    );
  }

  const speckles = [];
  for (let i = 0; i < 90; i += 1) {
    const x = 90 + random() * 1020;
    const y = 120 + random() * 540;
    const r = 0.8 + random() * 2.8;
    const color = random() > 0.72 ? C.amberSoft : C.cream;
    speckles.push(
      `<circle cx="${toFixed(x)}" cy="${toFixed(y)}" r="${toFixed(r)}" fill="${color}" fill-opacity="${toFixed(0.08 + random() * 0.34, 2)}"/>`
    );
  }

  const wet = [];
  for (let i = 0; i < 8; i += 1) {
    const x = 220 + random() * 760;
    const y = 300 + random() * 340;
    const rx = 30 + random() * 90;
    const ry = 8 + random() * 24;
    wet.push(
      `<ellipse cx="${toFixed(x)}" cy="${toFixed(y)}" rx="${toFixed(rx)}" ry="${toFixed(ry)}" fill="${C.cream}" fill-opacity="${toFixed(0.08 + random() * 0.14, 2)}" filter="url(#soft-16)"/>`
    );
  }

  return {
    defs: `<defs>
      <linearGradient id="blob-mint" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.mint}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${C.mint}" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="blob-amber" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.amberSoft}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${C.amber}" stop-opacity="0.04"/>
      </linearGradient>
      <linearGradient id="blob-moss" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.moss}" stop-opacity="0.75"/>
        <stop offset="1" stop-color="${C.moss}" stop-opacity="0.06"/>
      </linearGradient>
      <linearGradient id="blob-sand" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.sand}" stop-opacity="0.45"/>
        <stop offset="1" stop-color="${C.sand}" stop-opacity="0.03"/>
      </linearGradient>
    </defs>`,
    body: `<g>${fills.join("\n      ")}
    </g>
    <g>${outlines.join("\n      ")}
    </g>
    <g>${contours.join("\n      ")}
    </g>
    <g>${wet.join("\n      ")}
    </g>
    <g>${speckles.join("\n      ")}
    </g>`
  };
}

/** 04 Unity Editor 工具：窗口线框 + 节点图 + 面板。 */
function motifEditor(seed) {
  const random = mulberry32(seed);
  const nodes = [
    { x: 306, y: 196, w: 154, h: 56, label: "SCAN", active: false },
    { x: 548, y: 150, w: 178, h: 60, label: "BASE MAP", active: true },
    { x: 576, y: 320, w: 168, h: 60, label: "MASK", active: false },
    { x: 790, y: 250, w: 126, h: 56, label: "LERP", active: false },
    { x: 470, y: 486, w: 172, h: 58, label: "OUTPUT", active: false }
  ];

  const ports = [];
  const nodeMarks = [];
  for (const node of nodes) {
    const stroke = node.active ? C.mint : C.cream;
    const strokeOpacity = node.active ? 0.75 : 0.16;
    nodeMarks.push(`<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="9" fill="#0d332e" fill-opacity="${node.active ? 0.95 : 0.82}" stroke="${stroke}" stroke-opacity="${strokeOpacity}"/>
      <circle cx="${node.x + node.w * 0.5}" cy="${node.y}" r="4.6" fill="#0a2b27" stroke="${C.mint}" stroke-opacity="0.6"/>
      <circle cx="${node.x + node.w * 0.5}" cy="${node.y + node.h}" r="4.6" fill="#0a2b27" stroke="${C.mint}" stroke-opacity="0.6"/>
      <text x="${node.x + 14}" y="${node.y + 23}" font-family="${MONO}" font-size="11" letter-spacing="1.6" fill="${node.active ? C.mint : C.cream}" fill-opacity="${node.active ? 0.9 : 0.55}">${node.label}</text>
      <rect x="${node.x + 14}" y="${node.y + 33}" width="${node.w - 46}" height="3" rx="1.5" fill="${C.cream}" fill-opacity="0.12"/>
      <rect x="${node.x + 14}" y="${node.y + 41}" width="${(node.w - 46) * 0.6}" height="3" rx="1.5" fill="${C.cream}" fill-opacity="0.08"/>`);
    ports.push(node);
  }

  const links = [
    ["M 460 224 C 520 224 500 180 548 180", true],
    ["M 638 210 C 700 210 720 300 724 278", false],
    ["M 638 210 C 700 210 700 350 744 350", false],
    ["M 660 320 C 700 320 700 350 744 350", false],
    ["M 640 378 C 700 470 560 470 556 486", false]
  ];
  const linkMarks = links.map(
    ([d, hot]) =>
      `<path d="${d}" fill="none" stroke="${hot ? C.mint : C.mintSoft}" stroke-opacity="${hot ? 0.7 : 0.28}" stroke-width="${hot ? 1.8 : 1.2}"/>`
  );

  const sidebarRows = [];
  for (let i = 0; i < 7; i += 1) {
    const y = 168 + i * 58;
    sidebarRows.push(`<rect x="100" y="${y}" width="116" height="38" rx="8" fill="${C.cream}" fill-opacity="${i === 1 ? 0.09 : 0.035}" stroke="${C.cream}" stroke-opacity="${i === 1 ? 0.14 : 0.06}"/>
      <rect x="112" y="${y + 12}" width="10" height="10" rx="3" fill="${i === 1 ? C.mint : C.cream}" fill-opacity="${i === 1 ? 0.75 : 0.22}"/>
      <rect x="132" y="${y + 13}" width="${52 + ((i * 17) % 34)}" height="4" rx="2" fill="${C.cream}" fill-opacity="${i === 1 ? 0.42 : 0.16}"/>
      <rect x="132" y="${y + 22}" width="${70 + ((i * 11) % 24)}" height="3" rx="1.5" fill="${C.cream}" fill-opacity="0.1"/>`);
  }

  const inspectorRows = [];
  for (let i = 0; i < 5; i += 1) {
    const y = 180 + i * 62;
    inspectorRows.push(`<rect x="962" y="${y}" width="88" height="3" rx="1.5" fill="${C.cream}" fill-opacity="0.16"/>
      <rect x="962" y="${y + 9}" width="130" height="1" fill="${C.cream}" fill-opacity="0.08"/>`);
  }

  return {
    defs: "",
    body: `<g>
      <rect x="64" y="62" width="1072" height="626" rx="18" fill="#0b2e29" fill-opacity="0.72" stroke="${C.cream}" stroke-opacity="0.13"/>
      <path d="M64 116 H1136" stroke="${C.cream}" stroke-opacity="0.1"/>
      <circle cx="96" cy="89" r="5" fill="${C.amber}" fill-opacity="0.55"/>
      <circle cx="118" cy="89" r="5" fill="${C.sand}" fill-opacity="0.4"/>
      <circle cx="140" cy="89" r="5" fill="${C.mint}" fill-opacity="0.5"/>
      <text x="176" y="94" font-family="${MONO}" font-size="11" letter-spacing="2.2" fill="${C.cream}" fill-opacity="0.4">TA TOOLKIT / ASSET SCANNER</text>
      <rect x="78" y="132" width="158" height="540" rx="12" fill="#0a2a26" fill-opacity="0.55" stroke="${C.cream}" stroke-opacity="0.07"/>
      <g>${sidebarRows.join("\n        ")}
      </g>
      <rect x="252" y="132" width="686" height="540" rx="12" fill="#0a2a26" fill-opacity="0.4" stroke="${C.cream}" stroke-opacity="0.07"/>
      <rect x="252" y="132" width="686" height="540" rx="12" fill="url(#grid-fine)" opacity="0.8"/>
      <rect x="954" y="132" width="158" height="540" rx="12" fill="#0a2a26" fill-opacity="0.55" stroke="${C.cream}" stroke-opacity="0.07"/>
      <g>${inspectorRows.join("\n        ")}
      </g>
      <text x="962" y="160" font-family="${MONO}" font-size="10" letter-spacing="1.8" fill="${C.mint}" fill-opacity="0.7">INSPECTOR</text>
      <path d="M962 500 H1088" stroke="${C.cream}" stroke-opacity="0.16"/>
      <circle cx="1014" cy="500" r="6" fill="${C.mint}" fill-opacity="0.85"/>
      <rect x="962" y="528" width="126" height="34" rx="9" fill="${C.mint}" fill-opacity="0.16" stroke="${C.mint}" stroke-opacity="0.5"/>
      <text x="1004" y="549" font-family="${MONO}" font-size="10" letter-spacing="1.6" fill="${C.mint}" fill-opacity="0.85">APPLY</text>
      <path d="M252 132 H938" stroke="${C.cream}" stroke-opacity="0.06"/>
      <g>${linkMarks.join("\n        ")}
      </g>
      <g>${nodeMarks.join("\n        ")}
      </g>
      <circle cx="1014" cy="500" r="12" fill="${C.mint}" fill-opacity="0.1"/>
    </g>`
  };
}

/** 05 渲染性能优化案例：柱状 + 帧时间曲线。 */
function motifPerf(seed) {
  const random = mulberry32(seed);
  const left = 108;
  const right = 1092;
  const baseY = 604;
  const count = 12;
  const step = (right - left) / count;
  const barWidth = 52;

  const heights = [];
  for (let i = 0; i < count; i += 1) {
    if (i < 8) {
      heights.push(120 + random() * 300);
    } else {
      heights.push(90 + random() * 90); // 优化后
    }
  }
  heights[4] = 400;
  heights[9] = 130;

  const bars = [];
  const frame = [];
  const ticks = [];
  for (let i = 0; i < count; i += 1) {
    const h = heights[i];
    const x = left + i * step + (step - barWidth) / 2;
    const hot = i === 4;
    const cool = i >= 8;
    bars.push(
      `<rect x="${toFixed(x)}" y="${toFixed(baseY - h)}" width="${barWidth}" height="${toFixed(h)}" rx="6" fill="url(#${hot ? "bar-amber" : "bar-mint"})" fill-opacity="${cool ? 0.55 : 0.9}"/>`
    );
    if (i % 2 === 0) {
      ticks.push(
        `<path d="M${toFixed(x + barWidth / 2)} ${baseY + 6} V${baseY + 12}" stroke="${C.cream}" stroke-opacity="0.2"/>`
      );
    }
    frame.push(i);
  }

  const framePoints = heights.map((h, i) => {
    const x = left + i * step + step / 2;
    const jitter = i === 5 ? -46 : random() * 26 - 6;
    return { x, y: baseY - h * 0.52 + jitter };
  });
  const frameLine = `M ${framePoints.map((p) => `${toFixed(p.x)} ${toFixed(p.y)}`).join(" L ")}`;
  const frameDots = framePoints.map(
    (p, i) =>
      `<circle cx="${toFixed(p.x)}" cy="${toFixed(p.y)}" r="${i === 5 ? 4 : 2.6}" fill="${C.forest}" stroke="${i === 5 ? C.amberSoft : C.amber}" stroke-opacity="0.85" stroke-width="1.4"/>`
  );

  const gridLines = [];
  for (let i = 0; i < 4; i += 1) {
    const y = 436 + i * 56;
    gridLines.push(
      `<path d="M${left} ${y} H${right}" stroke="${C.cream}" stroke-opacity="0.05" stroke-dasharray="3 7"/>`
    );
  }

  return {
    defs: `<defs>
      <linearGradient id="bar-mint" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.mint}" stop-opacity="0.62"/>
        <stop offset="1" stop-color="${C.mint}" stop-opacity="0.06"/>
      </linearGradient>
      <linearGradient id="bar-amber" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${C.amberSoft}" stop-opacity="0.8"/>
        <stop offset="1" stop-color="${C.amber}" stop-opacity="0.1"/>
      </linearGradient>
    </defs>`,
    body: `<g>
      <text x="${left}" y="212" font-family="${MONO}" font-size="11" letter-spacing="2.4" fill="${C.cream}" fill-opacity="0.42">FRAME TIME / DRAW CALLS</text>
      <g font-family="${MONO}" font-size="10" fill="${C.cream}" fill-opacity="0.3">
        <text x="${left - 18}" y="426" text-anchor="end">16</text>
        <text x="${left - 18}" y="482" text-anchor="end">33</text>
        <text x="${left - 18}" y="598" text-anchor="end">50</text>
        <text x="92" y="452" text-anchor="end" font-size="9" letter-spacing="1.8">MS</text>
      </g>
      <g>${gridLines.join("\n        ")}
      </g>
      <path d="M${left} 420 H${right}" stroke="${C.mint}" stroke-opacity="0.4" stroke-width="1.2" stroke-dasharray="6 8"/>
      <text x="${right}" y="408" text-anchor="end" font-family="${MONO}" font-size="10" letter-spacing="1.8" fill="${C.mint}" fill-opacity="0.6">16 MS TARGET</text>
      <g>${bars.join("\n        ")}
      </g>
      <path d="M${left} ${baseY} H${right}" stroke="${C.cream}" stroke-opacity="0.18"/>
      <g>${ticks.join("\n        ")}
      </g>
      <path d="${frameLine}" fill="none" stroke="${C.amberSoft}" stroke-opacity="0.85" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <g>${frameDots.join("\n        ")}
      </g>
      <g font-family="${MONO}" font-size="10" letter-spacing="1.6">
        <rect x="${right - 168}" y="196" width="10" height="10" rx="2" fill="${C.mint}" fill-opacity="0.7"/>
        <text x="${right - 148}" y="205" fill="${C.cream}" fill-opacity="0.42">GPU / BATCH</text>
        <rect x="${right - 168}" y="218" width="10" height="10" rx="2" fill="${C.amberSoft}" fill-opacity="0.8"/>
        <text x="${right - 148}" y="227" fill="${C.cream}" fill-opacity="0.42">FRAME TIME</text>
      </g>
      <text x="${right}" y="660" text-anchor="end" font-family="${MONO}" font-size="10" letter-spacing="1.8" fill="${C.mintSoft}" fill-opacity="0.35">OPTIMIZED</text>
    </g>`
  };
}

/* ------------------------------------------------------------------ */
/* hero 纹理                                                           */
/* ------------------------------------------------------------------ */

function heroTextureSvg() {
  const W = 1920;
  const H = 1080;
  const seed = 20261108;
  const random = mulberry32(seed);

  const pipelineDots = [];
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const x = 150 + t * 1620;
    const y = 920 - t * 700 + Math.sin(t * Math.PI * 1.4) * 60;
    pipelineDots.push(
      `<circle cx="${toFixed(x)}" cy="${toFixed(y)}" r="${i === 3 ? 5 : 3.2}" fill="${C.mintSoft}" fill-opacity="${i === 3 ? 0.34 : 0.18}"/>
       <circle cx="${toFixed(x)}" cy="${toFixed(y)}" r="${i === 3 ? 16 : 10}" fill="none" stroke="${C.mintSoft}" stroke-opacity="0.1"/>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth pipeline hero texture">
  <title>Growth pipeline hero texture</title>
  <defs>
    <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.forestDeep}"/>
      <stop offset="0.42" stop-color="${C.forest}"/>
      <stop offset="0.78" stop-color="#0e332e"/>
      <stop offset="1" stop-color="${C.forestDeep}"/>
    </linearGradient>
    <radialGradient id="hero-glow-mint" cx="0.78" cy="0.16" r="0.62">
      <stop offset="0" stop-color="${C.mint}" stop-opacity="0.3"/>
      <stop offset="0.55" stop-color="${C.mint}" stop-opacity="0.07"/>
      <stop offset="1" stop-color="${C.mint}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hero-glow-amber" cx="0.16" cy="0.88" r="0.5">
      <stop offset="0" stop-color="${C.amber}" stop-opacity="0.18"/>
      <stop offset="0.6" stop-color="${C.amber}" stop-opacity="0.04"/>
      <stop offset="1" stop-color="${C.amber}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hero-vignette" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0.5" stop-color="#04120f" stop-opacity="0"/>
      <stop offset="1" stop-color="#04120f" stop-opacity="0.38"/>
    </radialGradient>
    <linearGradient id="hero-streak" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.mintSoft}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${C.mintSoft}" stop-opacity="0.1"/>
      <stop offset="1" stop-color="${C.mintSoft}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="hero-grid-fine" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="${C.cream}" stroke-opacity="0.055"/>
    </pattern>
    <pattern id="hero-grid-major" width="220" height="220" patternUnits="userSpaceOnUse">
      <path d="M220 0H0V220" fill="none" stroke="${C.cream}" stroke-opacity="0.07"/>
    </pattern>
    <linearGradient id="hero-pipeline" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.mint}" stop-opacity="0"/>
      <stop offset="0.3" stop-color="${C.mint}" stop-opacity="0.24"/>
      <stop offset="0.7" stop-color="${C.mintSoft}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${C.amberSoft}" stop-opacity="0"/>
    </linearGradient>
    <filter id="hero-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed}" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray">
        <feFuncA type="linear" slope="0.4"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#hero-bg)"/>
  <rect width="${W}" height="${H}" fill="url(#hero-glow-mint)"/>
  <rect width="${W}" height="${H}" fill="url(#hero-glow-amber)"/>
  <rect width="${W}" height="${H}" fill="url(#hero-grid-fine)"/>
  <rect width="${W}" height="${H}" fill="url(#hero-grid-major)"/>
  <path d="M -100 980 C 320 760 700 980 1080 700 C 1380 476 1660 560 2020 300 L 2020 380 C 1700 640 1440 566 1160 756 C 780 1020 380 830 -100 1050 Z" fill="url(#hero-streak)" opacity="0.55"/>
  <path d="M 120 916 C 420 780 720 860 980 700 C 1240 540 1500 560 1800 260" fill="none" stroke="url(#hero-pipeline)" stroke-width="1.4" stroke-dasharray="2 16" stroke-linecap="round"/>
  <g>${pipelineDots.join("\n    ")}
  </g>
  <rect width="${W}" height="${H}" fill="url(#hero-vignette)"/>
  <rect width="${W}" height="${H}" filter="url(#hero-grain)" opacity="0.14"/>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* 默认头像                                                            */
/* ------------------------------------------------------------------ */

function avatarSvg() {
  const S = 512;
  const seed = 20261109;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="Default avatar TA">
  <title>Default avatar TA</title>
  <defs>
    <radialGradient id="avatar-bg" cx="0.34" cy="0.26" r="0.86">
      <stop offset="0" stop-color="${C.forest2}"/>
      <stop offset="0.55" stop-color="${C.forest}"/>
      <stop offset="1" stop-color="${C.forestDeep}"/>
    </radialGradient>
    <linearGradient id="avatar-ink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.cream}"/>
      <stop offset="0.62" stop-color="${C.mintSoft}"/>
      <stop offset="1" stop-color="${C.amberSoft}"/>
    </linearGradient>
    <clipPath id="avatar-clip">
      <circle cx="256" cy="256" r="256"/>
    </clipPath>
    <pattern id="avatar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="${C.cream}" stroke-opacity="0.06"/>
    </pattern>
    <filter id="avatar-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${seed}" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray">
        <feFuncA type="linear" slope="0.4"/>
      </feComponentTransfer>
    </filter>
    <filter id="avatar-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="36"/>
    </filter>
  </defs>
  <g clip-path="url(#avatar-clip)">
    <circle cx="256" cy="256" r="256" fill="url(#avatar-bg)"/>
    <rect width="${S}" height="${S}" fill="url(#avatar-grid)"/>
    <g filter="url(#avatar-glow)">
      <circle cx="150" cy="120" r="140" fill="${C.mint}" fill-opacity="0.3"/>
      <circle cx="392" cy="400" r="130" fill="${C.amber}" fill-opacity="0.16"/>
    </g>
    <path d="M -20 372 C 120 300 240 380 360 320 C 440 280 500 300 540 270" fill="none" stroke="${C.mintSoft}" stroke-opacity="0.18" stroke-width="1.4"/>
    <path d="M -20 404 C 120 332 240 412 360 352 C 440 312 500 332 540 302" fill="none" stroke="${C.mintSoft}" stroke-opacity="0.1" stroke-width="1"/>
    <rect width="${S}" height="${S}" filter="url(#avatar-grain)" opacity="0.14"/>
  </g>
  <circle cx="256" cy="256" r="252" fill="none" stroke="${C.cream}" stroke-opacity="0.16"/>
  <circle cx="256" cy="256" r="224" fill="none" stroke="${C.cream}" stroke-opacity="0.12" stroke-width="1.4"/>
  <circle cx="256" cy="256" r="196" fill="none" stroke="${C.mint}" stroke-opacity="0.32" stroke-dasharray="2 12" stroke-linecap="round"/>
  <text x="256" y="330" text-anchor="middle" font-family="${SANS}" font-size="176" font-weight="700" letter-spacing="4" fill="url(#avatar-ink)">TA</text>
  <circle cx="398" cy="116" r="9" fill="${C.amberSoft}" fill-opacity="0.9"/>
  <circle cx="398" cy="116" r="18" fill="none" stroke="${C.amberSoft}" stroke-opacity="0.3"/>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* OG 分享图                                                           */
/* ------------------------------------------------------------------ */

function ogCoverSvg() {
  const W = 1200;
  const H = 630;
  const seed = 20261110;

  const pipeline = [
    { y: 158, label: "RENDER", active: true },
    { y: 276, label: "BUILD", active: false },
    { y: 394, label: "EXPLAIN", active: false }
  ];
  const nodeX = 838;
  const nodeW = 220;
  const nodeH = 62;

  const nodeMarks = pipeline.map((node) => {
    const stroke = node.active ? C.mint : C.cream;
    const strokeOpacity = node.active ? 0.7 : 0.18;
    return `<g>
      <rect x="${nodeX}" y="${node.y}" width="${nodeW}" height="${nodeH}" rx="14" fill="#0b302b" fill-opacity="0.85" stroke="${stroke}" stroke-opacity="${strokeOpacity}"/>
      <circle cx="${nodeX + 26}" cy="${node.y + nodeH / 2}" r="5" fill="${node.active ? C.mint : C.cream}" fill-opacity="${node.active ? 0.95 : 0.4}"/>
      <text x="${nodeX + 46}" y="${node.y + nodeH / 2 + 5}" font-family="${MONO}" font-size="13" letter-spacing="2.6" fill="${C.cream}" fill-opacity="${node.active ? 0.9 : 0.55}">${node.label}</text>
    </g>`;
  });

  const connectors = [
    `M ${nodeX + nodeW / 2} ${pipeline[0].y + nodeH} C ${nodeX + nodeW / 2} ${pipeline[0].y + nodeH + 26} ${nodeX + nodeW / 2} ${pipeline[1].y - 26} ${nodeX + nodeW / 2} ${pipeline[1].y}`,
    `M ${nodeX + nodeW / 2} ${pipeline[1].y + nodeH} C ${nodeX + nodeW / 2} ${pipeline[1].y + nodeH + 26} ${nodeX + nodeW / 2} ${pipeline[2].y - 26} ${nodeX + nodeW / 2} ${pipeline[2].y}`
  ].map(
    (d) =>
      `<path d="${d}" fill="none" stroke="${C.mint}" stroke-opacity="0.7" stroke-width="1.8" stroke-dasharray="2 6" stroke-linecap="round"/>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>成长管线 · Growth Pipeline</title>
  <defs>
    <linearGradient id="og-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#17493f"/>
      <stop offset="0.45" stop-color="${C.forest}"/>
      <stop offset="1" stop-color="#08211e"/>
    </linearGradient>
    <radialGradient id="og-glow-mint" cx="0.8" cy="0.18" r="0.62">
      <stop offset="0" stop-color="${C.mint}" stop-opacity="0.26"/>
      <stop offset="0.6" stop-color="${C.mint}" stop-opacity="0.05"/>
      <stop offset="1" stop-color="${C.mint}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="og-glow-amber" cx="0.08" cy="0.94" r="0.5">
      <stop offset="0" stop-color="${C.amber}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${C.amber}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="og-vignette" cx="0.5" cy="0.46" r="0.8">
      <stop offset="0.55" stop-color="#04120f" stop-opacity="0"/>
      <stop offset="1" stop-color="#04120f" stop-opacity="0.4"/>
    </radialGradient>
    <pattern id="og-grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0V36" fill="none" stroke="${C.cream}" stroke-opacity="0.045"/>
    </pattern>
    <pattern id="og-grid-major" width="180" height="180" patternUnits="userSpaceOnUse">
      <path d="M180 0H0V180" fill="none" stroke="${C.cream}" stroke-opacity="0.05"/>
    </pattern>
    <filter id="og-grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="${seed}" stitchTiles="stitch" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="gray"/>
      <feComponentTransfer in="gray">
        <feFuncA type="linear" slope="0.4"/>
      </feComponentTransfer>
    </filter>
    <filter id="og-soft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="38"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#og-bg)"/>
  <rect width="${W}" height="${H}" fill="url(#og-glow-mint)"/>
  <rect width="${W}" height="${H}" fill="url(#og-glow-amber)"/>
  <rect width="${W}" height="${H}" fill="url(#og-grid)"/>
  <rect width="${W}" height="${H}" fill="url(#og-grid-major)"/>

  <g filter="url(#og-soft)">
    <circle cx="948" cy="315" r="210" fill="${C.mint}" fill-opacity="0.14"/>
    <ellipse cx="240" cy="560" rx="300" ry="150" fill="${C.amber}" fill-opacity="0.08"/>
  </g>
  <circle cx="948" cy="315" r="196" fill="none" stroke="${C.cream}" stroke-opacity="0.09"/>
  <circle cx="948" cy="315" r="196" fill="none" stroke="${C.mint}" stroke-opacity="0.22" stroke-dasharray="2 14"/>
  <path d="M 1096 84 H 1132 V 120" fill="none" stroke="${C.cream}" stroke-opacity="0.14"/>
  <circle cx="${nodeX + nodeW / 2}" cy="248" r="3" fill="${C.mint}" fill-opacity="0.85"/>
  <circle cx="${nodeX + nodeW / 2}" cy="366" r="3" fill="${C.mint}" fill-opacity="0.55"/>
  <g>${connectors.join("\n    ")}
  </g>
  <g>${nodeMarks.join("\n    ")}
  </g>

  <g font-family="${SANS}">
    <text x="84" y="172" font-family="${MONO}" font-size="13" letter-spacing="6" fill="${C.mint}" fill-opacity="0.78">PERSONAL SITE / UNITY TA</text>
    <text x="82" y="296" font-size="94" font-weight="700" letter-spacing="6" fill="${C.cream}">成长管线</text>
    <text x="86" y="356" font-family="${MONO}" font-size="30" letter-spacing="9" fill="${C.mint}" fill-opacity="0.82">GROWTH PIPELINE</text>
    <path d="M 86 400 H 186" stroke="${C.mint}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="86" y="448" font-size="21" letter-spacing="1.6" fill="${C.cream}" fill-opacity="0.7">Unity 技术美术成长规划 · 实时渲染 / Shader</text>
    <text x="86" y="492" font-family="${MONO}" font-size="15" letter-spacing="2.4" fill="${C.amberSoft}" fill-opacity="0.78">RENDER · BUILD · EXPLAIN</text>
  </g>
  <rect x="84" y="536" width="196" height="38" rx="19" fill="${C.mint}" fill-opacity="0.1" stroke="${C.mint}" stroke-opacity="0.32"/>
  <text x="182" y="560" text-anchor="middle" font-family="${MONO}" font-size="12" letter-spacing="3" fill="${C.mint}" fill-opacity="0.85">2026 ARCHIVE</text>
  <text x="1132" y="560" text-anchor="end" font-family="${MONO}" font-size="11" letter-spacing="2.4" fill="${C.cream}" fill-opacity="0.3">REAL-TIME RENDERING</text>

  <rect width="${W}" height="${H}" fill="url(#og-vignette)"/>
  <rect width="${W}" height="${H}" filter="url(#og-grain)" opacity="0.15"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="18" fill="none" stroke="${C.cream}" stroke-opacity="0.08"/>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* 输出                                                                */
/* ------------------------------------------------------------------ */

async function writeSvg(name, content) {
  const file = path.join(OUT_DIR, name);
  await writeFile(file, content, "utf8");
  const info = await stat(file);
  return { name, bytes: info.size };
}

async function writeOgPng() {
  const maxBytes = 500 * 1024;
  const svg = ogCoverSvg();
  const source = sharp(Buffer.from(svg), { density: 144 });
  let buffer = await source
    .resize(1200, 630)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  let quantized = false;
  if (buffer.byteLength > maxBytes) {
    // 噪点让 PNG 变大时，降到 256 色调色板 + 有序抖动，保证 < 500KB。
    buffer = await sharp(Buffer.from(svg), { density: 144 })
      .resize(1200, 630)
      .png({ compressionLevel: 9, palette: true, colours: 256, dither: 1 })
      .toBuffer();
    quantized = true;
  }

  const file = path.join(OUT_DIR, "og-cover.png");
  await writeFile(file, buffer);
  const info = await stat(file);
  return { name: "og-cover.png", bytes: info.size, quantized };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const results = [];
  const covers = [
    {
      index: 0,
      seed: 1001,
      title: "Work 01 - Shader Effects Collection",
      label: "SHADER FX / LAYERED BANDS",
      glow: { glowX: 0.72, glowY: 0.28, glowColor: C.mint },
      motif: motifShader(1001)
    },
    {
      index: 1,
      seed: 1002,
      title: "Work 02 - Dynamic Water Surface",
      label: "WATER / RIPPLE LINES",
      glow: { glowX: 0.78, glowY: 0.2, glowColor: C.mintSoft },
      motif: motifWater(1002)
    },
    {
      index: 2,
      seed: 1003,
      title: "Work 03 - Environment Material System",
      label: "MATERIALS / BLEND PATCHES",
      glow: { glowX: 0.66, glowY: 0.34, glowColor: C.sand },
      motif: motifMaterial(1003)
    },
    {
      index: 3,
      seed: 1004,
      title: "Work 04 - Unity Editor Tool",
      label: "EDITOR / NODE WIREFRAME",
      glow: { glowX: 0.7, glowY: 0.3, glowColor: C.mint },
      motif: motifEditor(1004)
    },
    {
      index: 4,
      seed: 1005,
      title: "Work 05 - Rendering Performance Case",
      label: "PERFORMANCE / FRAME TIME",
      glow: { glowX: 0.76, glowY: 0.34, glowColor: C.amber },
      motif: motifPerf(1005)
    }
  ];

  for (const cover of covers) {
    results.push(await writeSvg(`work-${pad2(cover.index + 1)}.svg`, coverSvg(cover)));
  }

  results.push(await writeSvg("hero-texture.svg", heroTextureSvg()));
  results.push(await writeSvg("avatar-default.svg", avatarSvg()));
  results.push(await writeOgPng());

  const limitSvg = 200 * 1024;
  console.log(`\n输出目录：${path.relative(ROOT, OUT_DIR)}`);
  for (const item of results) {
    const kb = (item.bytes / 1024).toFixed(1);
    const limit = item.name.endsWith(".png") ? 500 * 1024 : limitSvg;
    const flag = item.bytes <= limit ? "ok" : "TOO LARGE";
    const note = item.quantized ? " (palette)" : "";
    console.log(`  ${item.name.padEnd(20)} ${kb.padStart(8)} KB  ${flag}${note}`);
  }
  console.log("\n完成：全部素材为脚本原创绘制，无第三方版权内容。\n");
}

main().catch((error) => {
  console.error("生成视觉素材失败：", error);
  process.exitCode = 1;
});
