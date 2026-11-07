# 评审记录 · 成长管线 / Growth Pipeline 改版

- 评审：review-agent（红队 + UI 把关，只读），2026-11-08 02:40–03:05。
- 方法：只读代码审阅 + 真实渲染（`npm run dev` 强制演示模式，端口 5180）+ Playwright 桌面 1440×900 / 手机 390×844 截图与自动测量 + 真实 Supabase 只读探测。截图在仓库外 `D:\xuexi\Codex\_review-shots\`（d-home/m-home/d-month/m-portfolio/d-profile-edit/*-modal.png）。
- 状态说明：工作树未提交；`src/styles.css` 评审期间仍被 style-agent 修改（截图对应 02:44–02:48 版本），字号/间距类结论在合并后需复测。

## 总体判断

1. 数据结构与"可验证"方向明显进步：每月 deliverable/evidenceGate/estimatedHours 具体（多数门槛可通过产物核对），作品集拆成 5 作品 + 5 能力模块并标完成度/AI，个人主页有了明确"谁/目标岗位/背景"，诚实基调贯穿文案。三合一（主页+成长档案+作品集）目前能连成一条叙事，未到"面试官找不到重点"的程度，但学习计划内部指标在首页占比过高（见 P1-10）。
2. **但现在不能部署**：线上 Supabase 还没跑 003 迁移，新代码一上线整站加载失败（P0-1）。这篇评审的核心是"先让发布路径安全，再谈打磨"。
3. 计划"可执行性"仍有残余幻觉（问题 b）：门槛是自评、站点不强制交付物链接；12 个月简历证据是占位符；estimatedHours 与实际打卡无对比；2027 春暑期实习窗口没排进月度计划。
4. 测试存在关键盲区（问题 e）：移动端月度页真实溢出，而 e2e 对应断言在页面渲染前执行，属于假通过。

## P0（阻断发布，必须先处理）

1. **线上 Supabase 缺 `202611080002` 迁移，新前端部署即整站报错。**
   - 证据：只读探测真实项目（wbutfafxkawybyfwizzb）→ `plan_profiles` 返回 404（表不存在）、`portfolio_items?select=evidence_level` / `plan_months?select=deliverable` 返回 400（列不存在）。`loadCloudBundle` 把 profile 查询错误当致命错误（`src/lib/supabase-data.ts:256-273`），AppContext 无缓存时直接抛错（`src/context/AppContext.tsx:147-160`）→ 新访客只看到"学习计划加载失败"。
   - 方案：① 推送前先执行三份迁移并重跑 `npm run seed:supabase -- --owner-email=...`（seed 才写入 deliverable/profile/evidence 字段）；② 代码兜底：`plan_profiles` 查询 catch → `fallbackProfile(plan.id)`，缺失字段用 seed 默认值渲染，使迁移未跑时站点仍可读；③ README/PR 模板加"部署顺序"门禁。

## P1（发布前必修：会误导面试官、丢数据或明显难看）

2. **月度页移动端横向溢出 23–26px，且现有 e2e 断言是假通过。**
   - 证据：390/393/360 宽均复现，scrollWidth=416；`.page-header` 在 ≤720px 变 grid 单列后被 `.week-nav-actions`（flex nowrap：select 351 + 按钮 44）撑到 402px（`src/styles.css:2624/2664`）。e2e `monthOverflow` 在 `page.goto` 后立即 evaluate，此时仍在加载壳（实测无 h1、scrollWidth=393），渲染后为 416（`e2e/learning-journal.spec.ts:183-186`）→ 8 条 e2e 全绿但页面确实溢出。
   - 方案：`@media(max-width:720px){.page-header{grid-template-columns:minmax(0,1fr)}.week-nav-actions{flex-wrap:wrap}.week-nav-actions .select-input{min-width:0}}`（已本地注入验证 scrollWidth=390）；e2e 断言前 `waitForSelector(".deliverable-panel")`。
3. **旧 localStorage / 旧云端缓存 bundle 不做字段合并 → 回访者看到空交付物与空徽章。**
   - 证据：`src/lib/local-store.ts:19-45` 只补 profile，不补 `month.deliverable/evidenceGate/estimatedHours` 与 `portfolio.evidenceLevel/aiAssisted/perfNotes`；实测注入旧 bundle 后月度页出现"本月唯一交付物 / 预计投入  小时"（`src/pages/MonthPage.tsx:690-698`），作品卡出现空值"完成度："。
   - 方案：storage key 带 schemaVersion；load 时按 monthKey/code 从 seed 合并新字段（保留用户编辑的 status/日志），或版本不符时提示重置。
4. **`profile.links.email` 一旦迁移执行即可被匿名读取，与 README 承诺冲突。**
   - 证据：`supabase/migrations/202611080002_profile_and_evidence.sql:46-59` 对 anon 开放整行 select，links 是含 email 的 jsonb；`src/lib/supabase-data.ts:75-81` 把 email 映射进公开 bundle；`README.md:106` 仍写"邮箱…不进入公开 API 结果"。
   - 方案：邮箱移出 `plan_profiles`（独立表仅编辑者可读），或公开读取走 security definer RPC/视图并按 `showEmail` 脱敏；同步改 README。
5. **作品卡三枚徽章语义冲突：同一卡片同时"未开始 / 完成度：能跟做 / AI 辅助"。**
   - 证据：JSON 中作品 01–05 `status=not_started` 但 `evidenceLevel=guided|learning`、4 项 `aiAssisted=true`；`src/pages/PortfolioPage.tsx:97-99` 同排展示；10 张卡全部如此（d-portfolio.png、m-portfolio.png）。"未开始"是验收状态，却被读成"没做过"，与完成度/AI 标注自相矛盾。
   - 方案：公开视图把 status 文案改"验收状态"，或未开始项目不显示完成度/AI；作品页补完成度与 AI 图例；seed 里把已在做的作品置 `in_progress`。
6. **迁移+seed 不重跑时，已有 10 项作品的标注会全是默认值（learning / AI=false）。**
   - 证据：迁移给新列默认 `'learning'`/`false`（`202611080002:26-28`），而 seed 对已存在 `code` 只跳过不更新（`scripts/seed-supabase.mjs:176-209`）→ 线上作品 01 实际 guided+AI，会显示"学习中、无 AI"，恰好违背诚实标注目标。
   - 方案：在迁移/一次性脚本里按内容回填标注，或 seed 增加 `--refresh-labels` 只更新 evidence_level/ai_assisted/perf_notes。
7. **12 个月的 `resumeEvidence` 是生成器占位符「完成  交付物」（2027-07～2028-06），正好覆盖整个投递/面试期。**
   - 证据：`src/data/unity-ta-monthly.json` 第 721、778…1322 行；月度页新增"写进简历"面板原样展示（`MonthPage.tsx:713-718`）；`seed.test.ts:83-84` 只校验条数不校验内容。另作品 05 `perfNotes="待补充：优化前后量化数据"`（L1427）会在公开页展示。
   - 方案：补写 12 个月真实能力证据；seed.test 增加"禁止空串/占位符"断言；perfNotes 改为设计说明或留空。
8. **关键正文/元信息字号仅 9–10.5px，两处对比度低于 WCAG AA。**
   - 证据：实测/样式行：`styles.css:3775` 技能说明 10px、`3672` 关于我标签 9px、`3946` 徽章 9px、`4111` 阶段说明 10px、`3509` hero 简介 12.5px；`--ink-faint` #7B8A85 在 #F9F6EF 上 3.35:1（图例 10.5px）、在 #FFFDF8 上 3.55:1，低于 4.5。
   - 方案：正文 ≥13px、元信息 ≥11px；`--ink-faint` 加深到 ≥4.5:1（约 #5F6F6A），或仅用于非文本装饰。
9. **时间线内部不一致：2027 春暑期实习窗口没排进月度计划，2027-07 才"投递暑期/日常实习"。**
   - 证据：`docs/ta-plan-review-2026-11.md:40` 明确暑期实习投递在 2027.02—04；但 JSON 2027-03/04 交付物是水面/环境材质，2027-07 才出现"投递 5 个暑期/日常实习岗位"（此时暑期实习已截止，应属秋招提前批）；演示视频排在 2027-08，晚于文档的 2027.07 提前批。
   - 方案：二选一写清：在 2027-03/04 增加"简历初稿 + 暑期实习投递 ≥5 家"并调整交付物；或删掉暑期实习承诺、2027-07 改称秋招提前批并把视频/README 提前到 2027-06。
10. **首页首屏缺"能力/证据"，hero 侧卡与作品集首屏放的是内部学习指标。**
    - 证据：1440×900 实测：hero 197–612、关于我 627–952（部分在首屏）、能力自评 967、精选作品 1582 起（首屏无作品无能力）；hero 右侧卡为"当前阶段 / 已验收 0/20 月 / 0% / 查看本月"；作品集页顶部为"整体完成 0/10 项作品或能力模块通过验收"；作品 10 项均无 demo/repo 链接，卡片不可点。
    - 方案：hero 侧卡换成"2–3 项核心能力 + 精选作品缩略/入口"；0/20、0/10 等进度移到学习记录页或弱化；作品卡至少链到演示/详情。

## P2（建议修，不阻断）

11. 月度页"本月唯一交付物"面板与下方"达到什么水平"重复渲染 acceptance（实测同页 2 次），建议面板只留交付物/门槛/简历映射。
12. 文案与数据驱动小问题："20 个月阶段规划"实际只列 5 个阶段（`HomePage.tsx:351`）；公开浏览 banner 让点"右上角『本地演示编辑』"但按钮标签是"公开浏览"（`HomePage.tsx:88` vs `AppShell.tsx:75`）；"关于我"里"Unity 6 + URP + HLSL…"是硬编码（`HomePage.tsx:228`），在线改资料改不到。
13. 执行闭环缺口：`estimatedHours` 只在月度页展示，不与打卡分钟对比；`plan.weeklyTargets`（4 条周预算）全站无渲染（只有类型/seed/测试）。建议月度页加"已记录 X / 预算 56h"+ 周预算，否则"可执行"只是声明。
14. 作品/能力模块与月份无互链：2027-06 只写"3 个核心作品"未写是哪三个，作品 01 没有对应月份；建议 portfolio 加 `targetMonth` 或月份页列出对应作品，方便自查是否兑现。
15. 两套四级量表并存且 4 级标签不同（能力自评"能讲原理" vs 作品"可复用"），首页图例有解释、作品集页没有；建议统一或作品页加图例。
16. profile 编辑页可用但偏长：桌面 2541px / 手机 3690px，保存只在底部、无吸底栏，校验错误显示在底部（`ProfileEditorPage.tsx:528`）；建议粘性保存条 + 错误汇总到顶部 + 离开未保存提示。
17. 其他小 bug（待验证项标注）：云端直链刷新 `/profile/edit` 可能在 roleQuery 返回前被弹回首页（`AppContext.tsx:536-539` + `ProfileEditorPage.tsx:35`，需 owner 账号验证）；SPA 切页后 document.title 停留上次（实测从首页点作品集后仍是"老王 · 成长管线"）；`deleteCloudAsset` 定义了但无人调用（`supabase-data.ts:588`），换头像/封面的旧文件成为公开孤儿；`imageSourceSchema` 的 `.url()` 分支接受 `javascript:`/任意 data URL（`validation.ts:31-35`，React 19 已阻断 javascript: 渲染，属加固项）。
18. 测试覆盖缺口：e2e 未覆盖 `/weeks` 旧链接（实测可用）、移动端抽屉导航、作品"公开到首页"后首页变化、徽章标注内容；单元测试未覆盖 validation schema 和 local-store 回退（正是 P1-3 漏点）；e2e 溢出断言假通过（见 P1-2）。
19. 素材/部署收尾：`src/components/WorkVisual.tsx` 与 `public/media/work-0*.svg` 已生成但全站无引用（grep 无使用），首页/作品集仍用 CSS 渐变封面；og-cover.png 406KB 偏大；PWA 旧 SW 缓存下首次访问新路由会落回首页（可接受，刷新两次即恢复）；建议云端失败时对新访客降级到 seed 内容而非 ErrorState（目前只在有缓存时降级）。

## 待验证（不确定，需账号/部署后）

- 云端登录后直接刷新 `/profile/edit` 是否被弹回首页（逻辑推断成立，未用 owner 账号实测）。
- 云端是否存在把头像写成 data URL 的入口（UI 未发现）；若经 API 写入，3MB data URL 会让每次首屏都拉取（`imageSourceSchema` 上限 3,000,000 字符）。
- 部署后 PWA 旧包 + 新路由的实际表现（需线上验证）。

## 建议优先修 3 个

1. **P0-1** 迁移 + seed 先行，并把 `plan_profiles` 查询改成非致命降级——否则一推就整站挂。
2. **P1-2** 移动端月度页溢出 + 修 e2e 假断言（否则移动端观感和 CI 都在自欺）。
3. **P1-3** 旧 localStorage 兼容（回访用户会看到空交付物/空完成度徽章，直接影响第一印象）。
   - 只能再补一个就选 **P1-4 邮箱隐私**：它和 README 的公开承诺直接冲突。
