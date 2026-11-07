# My TA Journey

Unity 技术美术学习 PWA：**20 个月计划为主线，每日打卡 + 每周复盘只记录过程**。
内容以 `src/data/unity-ta-monthly.json` 为唯一月度内容源，云端由 Supabase 保存月度状态、每日打卡、周复盘和附件。

在线地址：<https://wakuaiyu642.github.io/unity-ta-learning-journal/>

## 当前内容

- 20 个阶段月、5 个阶段，每月包含学习内容、实践任务、验收标准、常见错误、参考资料、周重点建议和简历能力映射
- 每月只有一个**人工**状态：未开始 / 进行中 / 已完成 / 顺延；点击“完成本月验收”才记录完成时间
- 每日打卡（同一天只保留一条）、学习时长和备注
- 每周复盘（按周一所属月份归档，每个自然周一条，可补写过去周次）
- 月度附件：图片、PDF、Markdown 和文本，单文件不超过 10MB，每月最多 20 个
- 作品集验收看板、演示/源码链接和首页发布开关
- 公开只读、邮箱密码所有者、受邀编辑者
- PWA 安装、离线外壳和 GitHub Pages 子路由回退
- 本地演示模式，无需 Supabase 即可体验

## 本地运行

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。未配置 Supabase 时自动进入本地演示模式，右上角可切换“公开浏览 / 演示编辑”。本地编辑内容保存在浏览器 `localStorage`，附件保存在 IndexedDB。

## 内容与数据结构

- `src/data/unity-ta-monthly.json`：20 个月月度内容（学习 / 实践 / 验收 / 常见错误 / 参考资料 / 周重点 / 简历映射），是页面渲染的唯一内容源。
- `src/data/unity-ta.json`：旧工作簿导入数据，仅作历史参考，不再参与页面渲染。
- `scripts/build-monthly-plan.mjs`（`npm run build:monthly`）：从旧数据一次性生成月度 JSON 的工具；**会覆盖 `unity-ta-monthly.json`**，日常修改请直接编辑 JSON 或登录网页在线编辑。
- Supabase 表：`plan_months`（月度状态与日期）、`plan_month_sections`（月度正文分类）、`weekly_reviews`（周复盘）、`daily_logs`（新增可空 `month_id`）、`attachments`（新增可空 `month_id`）。
- 旧 `plan_weeks` / `plan_week_tasks` 表保留用于回滚，新页面不再读取；旧 `/plans/unity-ta/weeks/W01` 链接会按日期跳转到对应月份。

## 接入 Supabase

1. 新建 Supabase 项目。
2. 在 SQL Editor 中按顺序执行：
   - `supabase/migrations/202611070001_learning_journal.sql`
   - `supabase/migrations/202611080001_monthly_learning_plan.sql`（增量迁移：月度状态、月度正文表、周复盘表、打卡/附件的月度关联与回填）
3. 在 Authentication → Users 中创建所有者邮箱账号并设置登录密码。
4. 把前端配置写入 `.env.local`：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
```

`SUPABASE_SERVICE_ROLE_KEY` 只用于本地种子脚本和 Edge Function，绝不能加 `VITE_` 前缀，也不能提交到 Git。

5. 导入月度内容并把该账号设为所有者：

```powershell
npm run seed:supabase -- --owner-email=you@example.com
```

种子脚本可以安全重跑：它会刷新 20 个月内容和月度正文，回填每日记录的月份，并保留已有每日记录、周复盘、附件和已编辑的作品集。

6. 登录网站后，在“协作者 → 修改登录密码”中设置自己的密码。

7. 需要多人编辑时，部署协作者管理函数：

```powershell
npx supabase functions deploy manage-collaborators
```

## GitHub Pages 部署

1. 仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**。
2. 在仓库 Secrets 中添加 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
3. 推送到 `main`。`.github/workflows/deploy.yml` 会运行类型检查、单元测试、端到端测试、构建和部署。
4. 发布地址为 `https://<用户名>.github.io/<仓库名>/`。
5. 发布后如手机仍显示旧版，关闭标签页后重新打开，或刷新两次让 PWA 更新。

构建会生成 `dist/404.html`，因此直接打开月度、路线或作品集子路径不会因 GitHub Pages 静态路由而丢失页面。

## 托管后如何编辑

- **月度正文、月度状态、每日打卡、周复盘、附件和作品集**：配置 Supabase 后用所有者邮箱登录网页直接编辑，保存后立即生效，不需要重新提交 GitHub。
- **页面样式、功能或月度内容模板**：在本地修改代码，提交并推送到 `main`，GitHub Actions 会自动测试、构建并重新发布。
- **未配置 Supabase 时**：仍可使用本地演示编辑，但内容只保存在浏览器中，其他设备或公开访问者看不到这些修改。

## 数据与权限

- 匿名访问：读取公开计划的月度内容与状态、每日记录、周复盘、附件和作品集。
- 所有者：全部编辑权限，并可在“协作者”页邀请编辑者。
- 编辑者：修改月度正文与状态、打卡、复盘、附件和作品集。
- 邮箱：只在服务端函数内读取，不进入公开 API 结果。
- 每日记录按“计划 + 用户 + 日期”唯一；周复盘按“计划 + 用户 + 周一日期”唯一；月度状态只由人工设置，打卡时长和复盘不会自动改变它。
- 单附件上限 10MB，每月最多 20 个；支持 PNG、JPG、WebP、HEIC、PDF、Markdown 和文本。

## 测试

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Windows 本地端到端测试默认使用已安装的 Microsoft Edge；CI 使用 Playwright Chromium。

> 本地 `.env.local` 存在 `VITE_SUPABASE_*` 时，`npm run test:e2e` 会以云端模式启动，端到端用例假设本地演示模式；本地跑 e2e 前可临时移走 `.env.local`（CI 不注入这两个变量，因此不受影响）。

## 旧工作簿导入（历史）

```powershell
npm run import:plan -- "D:\path\to\plan.xlsx"
```

导入脚本会校验月份、周次和作品集数量，并把标准化数据写入 `src/data/unity-ta.json`；月度化之后该数据仅作历史参考。
