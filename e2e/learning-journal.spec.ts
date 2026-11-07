import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/plans/unity-ta");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("public visitor can read the full plan without edit controls", async ({
  page
}) => {
  await expect(
    page.getByRole("heading", {
      name: /把漫长的学习/
    })
  ).toBeVisible();
  await expect(page.getByText("W01 · 顶点与片元数据").first()).toBeVisible();
  await expect(page.getByText("公开浏览", { exact: true })).toBeVisible();
  await expect(page.getByText("四条学习主线")).toHaveCount(0);

  await page.getByRole("link", { name: /打开 W01/ }).click();
  await expect(
    page.getByRole("heading", { name: "W01 · 顶点与片元数据" })
  ).toBeVisible();
  await expect(page.getByText("公开查看").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "今日打卡" })).toHaveCount(0);
});

test("local demo persists a daily check-in and weekly completion", async ({
  page
}) => {
  await page.getByRole("button", { name: "开始体验" }).click();
  await page.getByRole("link", { name: /继续记录|查看本周任务/ }).click();
  await expect(
    page.getByRole("heading", { name: "W01 · 顶点与片元数据" })
  ).toBeVisible();

  await page.getByLabel("学习时长").fill("75");
  await page
    .getByLabel(/今天做了什么/)
    .fill("完成 UV 可视化实验，复习了点乘。");
  await page.getByRole("button", { name: "今日打卡" }).click();
  await expect(page.getByText("今日打卡已写入")).toBeVisible();

  await page.getByRole("button", { name: /标记本周完成/ }).click();
  await expect(page.getByText("本周验收已完成")).toBeVisible();
  await expect(page.getByRole("button", { name: /本周已完成/ })).toBeVisible();

  await page.reload();
  await expect(
    page
      .locator(".daily-log-item p")
      .filter({ hasText: "完成 UV 可视化实验，复习了点乘。" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /本周已完成/ })).toBeVisible();
});

test("local demo persists attachments and portfolio edits", async ({ page }) => {
  await page.getByRole("button", { name: "开始体验" }).click();
  await page.goto("/plans/unity-ta/weeks/W01");
  await page.locator('input[type="file"]').setInputFiles({
    name: "weekly-notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Week 01 notes")
  });
  await expect(page.getByText("weekly-notes.md")).toBeVisible();
  await page.reload();
  await expect(page.getByText("weekly-notes.md")).toBeVisible();

  await page.goto("/plans/unity-ta/portfolio");
  await page.getByRole("button", { name: "编辑作品" }).first().click();
  await page.getByLabel("名称").fill("Shader 效果合集 · 验收版");
  await page.getByLabel("公开到首页").check();
  await page.getByRole("button", { name: "保存作品资料" }).click();
  await expect(page.getByText("Shader 效果合集 · 验收版")).toBeVisible();
  await expect(page.getByText("已公开").first()).toBeVisible();
});

test("roadmap and mobile layout stay within the viewport", async ({ page }) => {
  await page.goto("/plans/unity-ta/roadmap");
  await expect(page.getByText("20 个阶段月 · 86 个学习周")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.goto("/plans/unity-ta");
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(mobileOverflow).toBeLessThanOrEqual(0);
});
