import { expect, test } from "@playwright/test";

const HOME = "/plans/unity-ta";
const JOURNAL = "/plans/unity-ta/journal";
const FIRST_MONTH = "/plans/unity-ta/months/2026-11";

/** 1x1 PNG：用于打卡照片上传用例。 */
const CHECKIN_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

test.beforeEach(async ({ page }) => {
  await page.goto(HOME);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("public visitor sees the personal homepage without edit controls", async ({
  page
}) => {
  await expect(
    page.getByRole("heading", { name: "老王", exact: true })
  ).toBeVisible();
  await expect(page.locator(".home-headline")).toContainText("数字媒体艺术");
  await expect(page.locator(".home-headline")).toContainText("Unity 技术美术");

  await expect(page.getByText("当前是公开浏览模式")).toBeVisible();
  await expect(page.getByText("能力自评", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /能否独立复现/ })
  ).toBeVisible();
  expect(await page.locator(".skill-card").count()).toBeGreaterThanOrEqual(5);

  // 精选作品已从首页移除，只保留作品集页。
  await expect(page.getByText("精选作品", { exact: true })).toHaveCount(0);
  await expect(page.locator(".home-work-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /查看作品集/ })).toBeVisible();

  // 首页打卡区对公开访客可见，但只读：没有 form / 提交按钮 / 照片选择。
  const homeCheckin = page.locator(".home-checkin");
  await expect(homeCheckin).toBeVisible();
  await expect(page.locator(".checkin-calendar")).toBeVisible();
  await expect(homeCheckin.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "今日打卡" })).toHaveCount(0);
  await expect(
    page.locator('[data-testid="checkin-photo-input"]')
  ).toHaveCount(0);
  await expect(page.locator(".photo-thumb-remove")).toHaveCount(0);

  await expect(page.getByRole("button", { name: "开始体验" })).toBeVisible();
  await expect(page.getByRole("link", { name: /编辑资料/ })).toHaveCount(0);

  // 旧的周次链接按日期重定向到月份页。
  await page.goto("/plans/unity-ta/weeks/W01");
  await expect(page).toHaveURL(/\/plans\/unity-ta\/months\/2026-11$/);
  await expect(
    page.getByRole("heading", { name: /Shader 基础与 GPU 渲染数据流/ })
  ).toBeVisible();
});

test("local demo edits the public profile and keeps it after reload", async ({
  page
}) => {
  await page.getByRole("button", { name: "开始体验" }).click();
  await expect(
    page.getByRole("link", { name: "编辑资料" }).first()
  ).toBeVisible();
  await page.getByRole("link", { name: "编辑资料" }).first().click();
  await expect(page).toHaveURL(/\/plans\/unity-ta\/profile\/edit$/);
  await expect(
    page.getByRole("heading", { name: "编辑个人资料" })
  ).toBeVisible();

  await page.getByLabel("显示名称").fill("测试名字");
  await page.getByRole("button", { name: "保存资料" }).click();

  await expect(page).toHaveURL(/\/plans\/unity-ta$/);
  await expect(
    page.getByRole("heading", { name: "测试名字", exact: true })
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "测试名字", exact: true })
  ).toBeVisible();

  await page.getByRole("link", { name: "编辑资料" }).first().click();
  await page.getByLabel("显示名称").fill("老王");
  await page.getByRole("button", { name: "保存资料" }).click();
  await expect(
    page.getByRole("heading", { name: "老王", exact: true })
  ).toBeVisible();
});

test("monthly journal is readable publicly and demo records progress", async ({
  page
}) => {
  await page.goto(JOURNAL);
  await expect(
    page.getByRole("heading", { name: /一个月只做清楚/ })
  ).toBeVisible();
  await expect(page.getByText("2026.11", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("公开浏览", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /打开 2026\.11/ }).click();
  await expect(page).toHaveURL(/\/plans\/unity-ta\/months\/2026-11$/);
  await expect(
    page.getByRole("heading", { name: /Shader 基础与 GPU 渲染数据流/ })
  ).toBeVisible();
  await expect(page.getByText("公开查看")).toBeVisible();
  await expect(page.getByText("学什么", { exact: true })).toBeVisible();
  await expect(page.getByText("做什么", { exact: true })).toBeVisible();
  await expect(page.getByText("达到什么水平", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "今日打卡" })).toHaveCount(0);

  await page.goto(HOME);
  await page.getByRole("button", { name: "开始体验" }).click();
  await page.goto(JOURNAL);
  await page.getByRole("link", { name: "继续记录" }).click();
  await expect(page.getByRole("button", { name: "今日打卡" })).toBeVisible();

  await page.getByLabel("学习时长").fill("80");
  await page
    .getByLabel(/今天做了什么/)
    .fill("完成 Shader 数据流整理和 UV 可视化。");
  await page.getByRole("button", { name: "今日打卡" }).click();
  await expect(page.getByText("今日打卡已写入")).toBeVisible();

  const firstWeek = page.locator(".weekly-review-card").first();
  if (
    !(await firstWeek.evaluate(
      (element) => (element as HTMLDetailsElement).open
    ))
  ) {
    await firstWeek.locator("summary").click();
  }
  await firstWeek.getByLabel("本周完成").fill("写完基础顶点片元 Shader");
  await firstWeek.getByLabel("卡点").fill("矩阵顺序还不够熟");
  await firstWeek.getByLabel("下周重点").fill("补坐标空间");
  await firstWeek.getByRole("button", { name: "保存周复盘" }).click();
  await expect(firstWeek.getByText("已保存")).toBeVisible();

  await page.getByRole("button", { name: /完成本月验收/ }).click();
  await expect(
    page.getByRole("heading", { name: "本月验收已完成" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /本月已完成/ })).toBeVisible();

  await page.reload();
  await expect(
    page.locator(".daily-log-item p").filter({
      hasText: "完成 Shader 数据流整理和 UV 可视化。"
    })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /本月已完成/ })).toBeVisible();
  const persistedWeek = page.locator(".weekly-review-card").first();
  if (
    !(await persistedWeek.evaluate(
      (element) => (element as HTMLDetailsElement).open
    ))
  ) {
    await persistedWeek.locator("summary").click();
  }
  await expect(persistedWeek.getByLabel("下周重点")).toHaveValue("补坐标空间");
});

test("homepage check-in saves text and photo, then opens the monthly record", async ({
  page
}) => {
  // 固定到开营后的活动期（2026-11-12 上海时间 10:00）。
  await page.clock.setFixedTime(new Date("2026-11-12T02:00:00Z"));
  await page.reload();

  const homeCheckin = page.locator(".home-checkin");
  await expect(homeCheckin).toBeVisible();
  await expect(page.locator(".checkin-calendar")).toBeVisible();

  // 活动期公开只读：没有表单、提交按钮、删除按钮和照片选择。
  await expect(homeCheckin.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "今日打卡" })).toHaveCount(0);
  await expect(page.locator(".photo-thumb-remove")).toHaveCount(0);
  await expect(
    page.locator('[data-testid="checkin-photo-input"]')
  ).toHaveCount(0);

  // 进入演示编辑后出现打卡表单。
  await page.getByRole("button", { name: "开始体验" }).click();
  await expect(homeCheckin.locator("form")).toBeVisible();

  await page.getByLabel("学习时长").fill("80");
  await page.getByLabel(/今天做了什么/).fill("完成 Shader 数据流整理。");
  await page.locator('[data-testid="checkin-photo-input"]').setInputFiles({
    name: "checkin.png",
    mimeType: "image/png",
    buffer: CHECKIN_PNG
  });
  await expect(page.locator(".photo-thumb")).toHaveCount(1);

  await page.getByRole("button", { name: "今日打卡" }).click();
  await expect(page.getByText("今日打卡已写入")).toBeVisible();
  await expect(page.locator(".photo-thumb img").first()).toBeVisible();

  // 打卡当天在日历上出现绿点。
  const checkinDay = page.locator('.calendar-day[data-date="2026-11-12"]');
  await expect(checkinDay).toHaveClass(/is-checked/);
  await expect(checkinDay.locator(".calendar-day-dot")).toBeVisible();

  // 刷新后记录与照片仍在（本地演示存 localStorage + IndexedDB）。
  await page.reload();
  await expect(page.locator(".photo-thumb img").first()).toBeVisible();
  await expect(page.getByLabel(/今天做了什么/)).toHaveValue(
    "完成 Shader 数据流整理。"
  );
  await expect(page.getByRole("button", { name: "更新今日记录" })).toBeVisible();
  await expect(
    page.locator('.calendar-day[data-date="2026-11-12"]')
  ).toHaveClass(/is-checked/);

  // 点击该日期显示当天详情（笔记 + 照片 + 月度记录链接）。
  await page.locator('.calendar-day[data-date="2026-11-12"]').click();
  const dayDetail = page.locator(".checkin-day-detail");
  await expect(dayDetail).toContainText("完成 Shader 数据流整理。");
  await expect(dayDetail.locator(".photo-thumb img")).toBeVisible();
  await dayDetail.getByRole("link", { name: /在月度记录中查看/ }).click();

  await expect(page).toHaveURL(
    /\/plans\/unity-ta\/months\/2026-11\?date=2026-11-12#daily-record$/
  );
  await expect(page.getByLabel("日期")).toHaveValue("2026-11-12");
  const activeLog = page.locator(".daily-log-item-active");
  await expect(activeLog).toContainText("完成 Shader 数据流整理。");
  await expect(activeLog.locator(".photo-thumb img")).toBeVisible();
});

test("homepage check-in works before the plan starts on 2026-11-08", async ({
  page
}) => {
  // 开营前一天（2026-11-08）也应该能在首页打卡，而不是只显示倒计时。
  await page.clock.setFixedTime(new Date("2026-11-08T02:00:00Z"));
  await page.reload();

  const homeCheckin = page.locator(".home-checkin");
  await expect(homeCheckin).toBeVisible();
  await expect(homeCheckin.locator("form")).toHaveCount(0);
  await expect(page.locator(".home-checkin-note")).toContainText("11月9日");

  await page.getByRole("button", { name: "开始体验" }).click();
  await expect(homeCheckin.locator("form")).toBeVisible();

  await page.getByLabel("学习时长").fill("45");
  await page
    .getByLabel(/今天做了什么/)
    .fill("开营前先记录：完成 Unity 阴影基础练习。");
  await page.getByRole("button", { name: "今日打卡" }).click();
  await expect(page.getByText("今日打卡已写入")).toBeVisible();

  const todayCell = page.locator('.calendar-day[data-date="2026-11-08"]');
  await expect(todayCell).toHaveClass(/is-checked/);
  await expect(todayCell.locator(".calendar-day-dot")).toBeVisible();
  await expect(page.locator(".home-checkin-records")).toContainText(
    "开营前先记录：完成 Unity 阴影基础练习。"
  );

  await page.reload();
  await expect(page.locator(".home-checkin-records")).toContainText(
    "开营前先记录：完成 Unity 阴影基础练习。"
  );

  await page.locator('.calendar-day[data-date="2026-11-08"]').click();
  await expect(page.locator(".checkin-day-detail")).toContainText(
    "开营前先记录：完成 Unity 阴影基础练习。"
  );
  await page.getByRole("link", { name: /在月度记录中查看/ }).click();
  await expect(page).toHaveURL(
    /\/plans\/unity-ta\/months\/2026-11\?date=2026-11-08#daily-record$/
  );
  await expect(page.getByLabel("日期")).toHaveValue("2026-11-08");
  await expect(page.locator(".daily-log-item-active")).toContainText(
    "开营前先记录：完成 Unity 阴影基础练习。"
  );
});

test("portfolio edits, attachments and roadmap stay inside the viewport", async ({
  page
}) => {
  await page.getByRole("button", { name: "开始体验" }).click();

  await page.goto(FIRST_MONTH);
  // 月页现在有两个文件输入：月份附件面板 + 打卡照片，选择器要限定在附件面板。
  await page.locator('.attachment-panel input[type="file"]').setInputFiles({
    name: "november-notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# November notes")
  });
  await expect(page.getByText("november-notes.md")).toBeVisible();
  await page.reload();
  await expect(page.getByText("november-notes.md")).toBeVisible();

  await page.goto("/plans/unity-ta/portfolio");
  await page.getByRole("button", { name: "编辑作品" }).first().click();
  await page.getByLabel("名称").fill("Shader 效果合集 · 月度验收版");
  await page.getByLabel("标记为已公开").check();
  await page.getByRole("button", { name: "保存作品资料" }).click();
  await expect(page.getByText("Shader 效果合集 · 月度验收版")).toBeVisible();
  await expect(page.getByText("已公开").first()).toBeVisible();

  await page.goto("/plans/unity-ta/roadmap");
  await expect(
    page.getByText("20 个月，围绕能力而不是堆积名词")
  ).toBeVisible();
  await expect(page.locator(".roadmap-month-card")).toHaveCount(20);
  const roadmapOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(roadmapOverflow).toBeLessThanOrEqual(0);

  await page.goto(FIRST_MONTH);
  // 等 React 渲染完成再量宽度，否则会把「正在加载」的窄页面误判为不溢出。
  await page.locator(".deliverable-panel").waitFor();
  await page.waitForTimeout(300);
  const monthOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(monthOverflow).toBeLessThanOrEqual(0);

  // 360px 窄屏复查（Pixel 7 / 桌面 project 都覆盖）。
  await page.setViewportSize({ width: 360, height: 780 });
  await page.reload();
  await page.locator(".deliverable-panel").waitFor();
  await page.waitForTimeout(300);
  const narrowOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(narrowOverflow).toBeLessThanOrEqual(0);

  // 首页打卡区在 360px 也不能横向溢出。
  await page.goto(HOME);
  await page.locator(".home-checkin").waitFor();
  await page.waitForTimeout(300);
  const homeOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(homeOverflow).toBeLessThanOrEqual(0);
});
