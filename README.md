# 成长管线 / Growth Pipeline

Unity 技术美术（TA）成长站点：**个人主页 + 20 个月成长档案 + 作品集**，用一条可验证的成长管线记录"学什么、做什么、达到什么水平"。
内容以 `src/data/unity-ta-monthly.json` 为唯一月度内容源；配置 Supabase 后，个人资料、月度状态、每日打卡（含照片）、周复盘、附件与作品集都保存在云端。

在线地址：<https://wakuaiyu642.github.io/unity-ta-learning-journal/>

## 站点结构

- **个人主页**（`/`）：头像、标题、个人简介、背景与求职方向、**今日打卡、打卡日历与每日记录**（首月开营前也可以先记录当天，打卡可附照片）、能力自评（按"能否独立复现"标注）、成长路线入口。首页不再展示精选作品，作品集统一在 `/portfolio`；公开浏览时打卡区只读，不出现编辑入口。
- **成长档案**（`/journal` 与 `/months/...`）：20 个月、5 个阶段；每月回答"学什么 / 做什么 / 达到什么水平"，并附交付物、独立完成门槛与预计小时；每日打卡、每周复盘、月度附件只记录过程，不自动完成月份。
- **作品集**（`/portfolio`）：5 个可演示作品 + 5 个能力模块；每项标注完成度（学习中 / 能跟做 / 能独立 / 可复用）、是否 AI 辅助、性能记录，并可单独标记为已公开。
- **成长路线**（`/roadmap`）：20 个月卡片按 5 个阶段分组，可搜索。
- **编辑资料**（`/profile/edit`）：所有者、受邀编辑者或本地演示编辑可修改个人资料。

### 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 重定向到 `/plans/unity-ta` |
| `/plans/unity-ta` | 个人主页 |
| `/plans/unity-ta/journal` | 学习记录（月度进度、打卡与复盘入口） |
| `/plans/unity-ta/profile/edit` | 编辑个人资料 |
| `/plans/unity-ta/months/:monthKey` | 月度计划与记录（如 `2026-11`） |
| `/plans/unity-ta/roadmap` | 成长路线 |
| `/plans/unity-ta/portfolio` | 作品集与能力验收 |
| `/plans/unity-ta/collaborators` | 协作者管理（仅所有者） |
| `/plans/unity-ta/weeks/:weekNo` | 旧周次链接，按日期跳转到对应月份 |

## 内容与数据结构

- `src/data/unity-ta-monthly.json`：内容唯一源（schemaVersion 3），包含 `plan`、`profile`、`phases`、`months`、`portfolio`。
  - 每月：`deliverable`（本月唯一交付物）、`evidenceGate`（独立完成门槛）、`estimatedHours`（单月预算）、学习 / 实践 / 周重点 / 验收 / 常见错误 / 参考资料 / 简历映射。
  - `plan.weeklyTargets` 为 4 项周预算；`portfolio` 为 10 项（作品 01—05 + 5 个能力模块，含 `evidenceLevel`、`aiAssisted`、`perfNotes`）。
  - 直接编辑该 JSON 即可改内容（旧的月度生成脚本已移除，不再有 `npm run build:monthly`）。
- `src/data/unity-ta.json`：旧工作簿导入数据，仅作历史参考，不参与页面渲染。
- `src/lib/seed.ts`：把 JSON 转成前端 `PlanBundle`（`src/types.ts`）。

### Supabase 表

| 表 | 说明 |
| --- | --- |
| `plans` | 计划主体：标题、周期、阶段（`phases`）、执行原则、`weekly_targets` |
| `plan_profiles` | **新增**：每个计划一份公开个人资料（显示名称、标题、学校/专业、求职方向、自我定位、能力标注说明、技能、亮点、联系方式） |
| `plan_months` | 月度状态与日期；**新增** `deliverable`、`evidence_gate`、`estimated_hours` |
| `plan_month_sections` | 月度正文分类：学习 / 实践 / 周重点 / 验收 / 常见错误 / 参考资料 / 简历映射 |
| `portfolio_items` | 作品集；**新增** `evidence_level`（learning / guided / independent / reusable，含 check 约束）、`ai_assisted`、`perf_notes` |
| `daily_logs` / `weekly_reviews` / `attachments` | 每日打卡、周复盘、月度附件（附件/打卡带可空 `month_id`；`attachments.daily_log_id` 把照片关联到具体某天打卡） |
| `plan_members` | 所有者与编辑者角色 |

旧 `plan_weeks` / `plan_week_tasks` 表保留用于回滚，新页面不再读取；旧 `/weeks/W01` 链接按日期跳转到月份。

## 本地运行

```powershell
npm install
npm run dev
```

打开 `http://127.0.0.1:5173`。未配置 Supabase 时自动进入本地演示模式：右上角可切换"公开浏览 / 演示编辑"。本地编辑的 bundle 保存在 `localStorage`（`ta-journey-local-monthly-v1`），附件与每日打卡照片保存在 IndexedDB，演示编辑开关保存在 `ta-journey-demo-editor`。

## 接入 Supabase

1. 新建 Supabase 项目。
2. 在 SQL Editor 中**按日期顺序**执行四份迁移：
   - `supabase/migrations/202611070001_learning_journal.sql`（基础表、RLS、存储桶与跨表权限函数）
   - `supabase/migrations/202611080001_monthly_learning_plan.sql`（`plans.phases`、月度字段、月度正文表、周复盘表、打卡/附件的月度关联与回填）
   - `supabase/migrations/202611080002_profile_and_evidence.sql`（`plan_profiles` 新表、作品集完成度/AI 辅助/性能记录字段、月度交付物字段与实时订阅）
   - `supabase/migrations/202611080003_daily_checkin_photos.sql`（`attachments.daily_log_id`：把上传的照片关联到具体某天打卡，并收紧插入策略；**打卡照片需要这一迁移**）
3. 在 Authentication → Users 中创建所有者邮箱账号并设置登录密码。
4. 把前端配置写入 `.env.local`（**保存为无 BOM 的 UTF-8**，否则首行变量可能不生效）：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
```

`SUPABASE_SERVICE_ROLE_KEY` 只用于本地种子脚本和 Edge Function，绝不能加 `VITE_` 前缀，也不能提交到 Git。

5. 导入内容并把该账号设为所有者：

```powershell
npm run seed:supabase -- --owner-email=you@example.com
```

种子脚本可安全重跑，行为是：

- 按 `slug` upsert 计划、按 `plan_id + month_label` upsert 20 个月，刷新月度正文（先删后插）并回填每日记录的月份；
- 作品集：若为空则插入全部 10 项；若已有数据则**只补充按 `code` 尚不存在的条目**（例如新增的"作品 05"），**不覆盖**已在线编辑过的作品；
- 个人资料：仅当 `plan_profiles` 中还没有该计划的行时插入初始资料，**不会覆盖**在线编辑过的资料；
- 传 `--owner-email` 时把该账号写入 `plan_members` 作为所有者。

6. 登录网站后，在"协作者 → 修改登录密码"中设置自己的密码。
7. 需要多人编辑时，部署协作者管理函数：

```powershell
npx supabase functions deploy manage-collaborators
```

## 数据与权限

- 匿名访问：读取公开计划的个人资料、月度内容与状态、每日记录、周复盘、附件和作品集。
- 所有者：全部编辑权限，并可在"协作者"页邀请编辑者。
- 编辑者：修改个人资料、月度正文与状态、打卡、复盘、附件和作品集。
- 邮箱：只有勾选「在首页公开邮箱」时才会随个人资料保存并显示；不勾选时提交会清空邮箱，不会出现在公开数据里。
- 每日记录按"计划 + 用户 + 日期"唯一；周复盘按"计划 + 用户 + 周一日期"唯一；月度状态只由人工设置，打卡时长和复盘不会自动改变它。
- 单附件上限 10MB，每月最多 20 个；支持 PNG、JPG、WebP、HEIC、PDF、Markdown 和文本；头像 ≤2MB（PNG/JPG/WebP），简历 PDF ≤10MB。
- 每日打卡照片：每次打卡最多 3 张、单张 ≤10MB（PNG/JPG/WebP/HEIC），上传前在浏览器压缩；保存在公开的 `learning-files` 桶，会随打卡记录公开显示、可随时删除。未执行 `202611080003` 迁移时只有照片上传会提示报错，文字打卡、日历和月页面不受影响。

## GitHub Pages 部署

1. 仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**。
2. 在仓库 Secrets 中添加 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
3. 推送到 `main`。`.github/workflows/deploy.yml` 会依次运行类型检查、单元测试、端到端测试、构建和部署。
4. 发布地址为 `https://<用户名>.github.io/<仓库名>/`。
5. 发布后如手机仍显示旧版，关闭标签页后重新打开，或刷新两次让 PWA 更新。
6. 打卡照片需要线上 Supabase 已执行 `202611080003_daily_checkin_photos.sql`（SQL Editor 粘贴运行）；未执行时照片上传会提示迁移缺失，文字打卡与打卡日历正常。

构建会生成 `dist/404.html`，因此直接打开月度、路线或作品集子路径不会因 GitHub Pages 静态路由而丢失页面。PWA manifest 已随站点改名为「成长管线 / Growth Pipeline」，首次加载更新版本后需要刷新一次才会生效。

## 测试

```powershell
npm run typecheck
npm test
npm run test:e2e
npm run build
```

- 单元测试（`src/lib/*.test.ts`）：校验 seed 数据的 20 个月 / 5 阶段 / 10 个作品集条目、个人资料完整性、每月交付物与条目数量区间、阶段映射，以及周槽日期与完成度推导。
- 端到端测试（`e2e/learning-journal.spec.ts`，6 个用例）：首页公开浏览、首页打卡保存文字+照片并跳转月页、开营前（2026-11-08）也能在首页打卡、本地演示编辑个人资料并持久化、月度计划公开可读 + 打卡/周复盘/月度验收、作品集编辑与附件上传 + 路线 20 张卡片 + 手机视口无横向溢出。
- Windows 本地端到端测试默认使用已安装的 Microsoft Edge；CI 使用 Playwright Chromium。首页打卡用例用 `page.clock.setFixedTime` 固定日期（活动期 2026-11-12 / 开营前 2026-11-08），避免受真实日期影响；本地跑 e2e 前仍需临时移走 `.env.local`。

> 本地 `.env.local` 存在 `VITE_SUPABASE_*` 时，`npm run test:e2e` 会以云端模式启动，端到端用例假设本地演示模式；**本地跑 e2e 前请临时移走 `.env.local`**（CI 不注入这两个变量，因此不受影响）。

## 规划审计

- [`docs/ta-plan-review-2026-11.md`](docs/ta-plan-review-2026-11.md)：2028 届 Unity TA 计划审计——目标岗位要求与引用链接、校招时间线倒推、现状与岗位差距矩阵、原计划四类问题、修订后的阶段与逐月交付表、执行规则、风险与观察指标、现实定位结论。修订计划前请先读这份文档。

## 托管后如何编辑

- **个人资料、月度正文、月度状态、每日打卡（首页即可，支持照片）、周复盘、附件和作品集**：配置 Supabase 后用所有者邮箱登录网页直接编辑，保存后立即生效，不需要重新提交 GitHub。
- **页面样式、功能或月度内容模板**：在本地修改代码，提交并推送到 `main`，GitHub Actions 会自动测试、构建并重新发布。
- **未配置 Supabase 时**：仍可使用本地演示编辑，但内容只保存在浏览器中，其他设备或公开访问者看不到这些修改。

## 旧工作簿导入（历史）

```powershell
npm run import:plan -- "D:\path\to\plan.xlsx"
```

导入脚本会校验月份、周次和作品集数量，并把标准化数据写入 `src/data/unity-ta.json`；月度化之后该数据仅作历史参考。
