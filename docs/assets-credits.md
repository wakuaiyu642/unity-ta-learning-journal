# 素材来源与许可（Assets Credits）

本文件登记「成长管线 / Growth Pipeline」站点使用的视觉素材来源、许可与生成方式。

## 结论（TL;DR）

- **本次实际交付的全部素材都是脚本原创绘制**：用 SVG 几何图形、渐变和 `feTurbulence` 噪点现画，由
  [`scripts/generate-visuals.mjs`](../scripts/generate-visuals.mjs) 一次生成；不包含任何第三方图片、图标、
  纹理或字体文件，**无版权/授权风险**（CC0 式自持，随本仓库一起分发）。
- **没有下载或嵌入任何外部图库素材**。下面列出的 Unsplash / Pexels / SVG Repo 只是「以后想换真实照片时
  的合规备选」调研记录，本次**未使用**。
- 素材中的文字（如 `WORK 01`、`GROWTH PIPELINE`、`TA`）只是 SVG 里的 `font-family` 声明，使用访问者
  的系统字体渲染，不打包字体文件；`og-cover.png` 的中文「成长管线」由 sharp 借系统字体渲染（已验证可正常
  显示，非图片/字体再分发）。

## 交付清单

| 文件 | 尺寸 | 用途 | 来源 |
| --- | --- | --- | --- |
| `public/media/work-01.svg` | 1200 × 750 | 作品 01 Shader 效果合集封面 | 原创（本脚本生成） |
| `public/media/work-02.svg` | 1200 × 750 | 作品 02 动态水面封面 | 原创（本脚本生成） |
| `public/media/work-03.svg` | 1200 × 750 | 作品 03 动态环境材质系统封面 | 原创（本脚本生成） |
| `public/media/work-04.svg` | 1200 × 750 | 作品 04 Unity Editor 工具封面 | 原创（本脚本生成） |
| `public/media/work-05.svg` | 1200 × 750 | 作品 05 渲染性能优化案例封面 | 原创（本脚本生成） |
| `public/media/hero-texture.svg` | 1920 × 1080 | 首页 hero 背景纹理（低调网格 + 径向光斑） | 原创（本脚本生成） |
| `public/media/avatar-default.svg` | 512 × 512 | 默认头像（圆形渐变 + TA 字母） | 原创（本脚本生成） |
| `public/media/og-cover.png` | 1200 × 630 | 社交分享图（`og:image`） | 原创（本脚本用 sharp 渲染 PNG） |

统一色板：深绿 `#123f3a` / `#1d5850`、薄荷 `#58c4a6`、琥珀 `#c98f4f`、奶油 `#f6f2e9`，与
`src/styles.css` 中 `--forest` / `--mint` / `--amber` / `--bg` 等设计变量保持一致。

## 生成与复现

```bash
node scripts/generate-visuals.mjs
```

- 随机数使用固定种子（mulberry32），重复运行输出一致，便于 diff 与版本管理。
- SVG 单文件均 < 200 KB；`og-cover.png` < 500 KB（超过阈值时会自动降为 256 色调色板 PNG）。
- 需要调整风格时改脚本里的色板常量 `C` 或对应主题函数（`motifShader` / `motifWater` /
  `motifMaterial` / `motifEditor` / `motifPerf`），重新运行即可。

## 外部素材来源调研（备选，本次未使用）

以下平台许可条款均于 2026-11-08 通过官方帮助页核实；**本次交付未下载、未使用其中任何素材**。如果以后
要把占位封面换成真实照片/插画，应优先从这些来源取图，并在本文件补充「文件名 / 作者 / 原链接 / 许可」。

### 1. Unsplash — Unsplash License

- 许可说明：<https://unsplash.com/license>；帮助页（已核实）：
  <https://help.unsplash.com/en/articles/2612315-can-i-use-unsplash-images-for-personal-or-commercial-projects>
- 要点：图片可免费用于大多数商业/个人项目；**无需署名**（署名是加分项，不是义务）。
- 限制：不得直接转售未修改的图片、不得把图片汇编成与 Unsplash 竞争的服务等（详见 Terms）。
- 适用场景：首页氛围图、作品集真实截图之外的补充配图。

### 2. Pexels — Pexels License

- 许可说明：<https://www.pexels.com/photo-license/>；帮助页（已核实）：
  <https://help.pexels.com/hc/en-us/articles/360042295174-What-is-the-license-of-the-photos-and-videos-on-Pexels>
- 要点：照片/视频可免费用于个人与商业用途，**无需署名**。
- 限制：不得转售未修改素材、不得暗示人物/品牌为你的产品代言等（详见 Terms of Service）。
- 适用场景：与 Unsplash 类似的氛围图备选。

### 3. SVG Repo — SVG Repo License / Public Domain

- 许可说明（已核实）：<https://www.svgrepo.com/page/licensing/>
- 要点：站点默认 SVG Repo License——可用于商业项目，**无需署名**（欢迎标注
  "Icons by svgrepo.com"）；标注为 Public Domain 的素材等同 CC0；标注 MIT / GPL / CC BY / CC BY-SA
  的素材需按对应条款处理，**使用前必须逐个查看图标详情页**。
- 限制：不得把素材原样重新分发/转售成图库类服务。
- 适用场景：若以后需要功能性小图标（工具、面板图标等）。本项目的图标目前来自 `lucide-react`
  （ISC 许可，已在依赖中），无需额外引入。

### 字体

- 素材内仅声明系统字体栈（`Segoe UI` / `Microsoft YaHei` / `Consolas` 等），不打包、不分发字体文件；
  网页 UI 也是系统字体。若未来引入 Web 字体（如思源黑体），需另建条目并确认字体许可（OFL 等）。

## 维护约定

1. 新增任何位图（jpg/png/webp）或第三方 SVG 时，必须在本文件追加一行：文件名、来源链接、作者、许可、
   获取日期。
2. 优先使用原创素材；确需外部图片时，避开「仅限个人使用」「需购买授权」的图库。
3. 不把带水印、含版权角色的图片放进 `public/`。
