import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/plans/unity-ta");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("public visitor can read the monthly plan without edit controls", async ({
  page
}) => {
  await expect(
    page.getByRole("heading", { name: /一个月只做清楚/ })
  ).toBeVisible();
  await expect(page.getByText("2026.11", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("公开浏览", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /打开 2026\.11/ }).click();
  await expect(
    page.getByRole("heading", { name: /Shader 基础与 GPU 渲染数据流/ })
  ).toBeVisible();
  await expect(page.getByText("公开查看")).toBeVisible();
  await expect(page.getByRole("button", { name: "今日打卡" })).toHaveCount(0);
  await expect(page.getByText("学什么", { exact: true })).toBeVisible();
  await expect(page.getByText("做什么", { exact: true })).toBeVisible();
  await expect(page.getByText("达到什么水平", { exact: true })).toBeVisible();
});

test("local demo persists daily check-in, weekly review and monthly acceptance", async ({
  page
}) => {
  await page.getByRole("button", { name: "开始体验" }).click();
  await page.getByRole("link", { name: /继续记录|查看月度计划/ }).click();
  await expect(
    page.getByRole("heading", { name: /Shader 基础与 GPU 渲染数据流/ })
  ).toBeVisible();

  await page.getByLabel("学习时长").fill("80");
  await page
    .getByLabel(/今天做了什么/)
    .fill("完成 Shader 数据流整理和 UV 可视化。");
  await page.getByRole("button", { name: "今日打卡" }).click();
  await expect(page.getByText("今日打卡已写入")).toBeVisible();

  const firstWeek = page.locator(".weekly-review-card").first();
  await firstWeek.locator("summary").click();
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
  await persistedWeek.locator("summary").click();
  await expect(
    persistedWeek.getByLabel("下周重点")
  ).toHaveValue("补坐标空间");
});

test("local demo persists monthly attachments and portfolio edits", async ({
  page
}) => {
  await page.getByRole("button", { name: "开始体验" }).click();
  await page.goto("/plans/unity-ta/months/2026-11");
  await page.locator('input[type="file"]').setInputFiles({
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
  await page.getByLabel("公开到首页").check();
  await page.getByRole("button", { name: "保存作品资料" }).click();
  await expect(page.getByText("Shader 效果合集 · 月度验收版")).toBeVisible();
  await expect(page.getByText("已公开").first()).toBeVisible();
});

test("monthly roadmap and mobile layout stay within the viewport", async ({
  page
}) => {
  await page.goto("/plans/unity-ta/roadmap");
  await expect(page.getByText("20 个月，围绕能力而不是堆积名词")).toBeVisible();
  await expect(page.locator(".roadmap-month-card")).toHaveCount(20);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.goto("/plans/unity-ta/months/2026-11");
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(mobileOverflow).toBeLessThanOrEqual(0);
});
