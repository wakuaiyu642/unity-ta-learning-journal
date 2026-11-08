import { describe, expect, it } from "vitest";
import { storageFileExtension, validateAttachment } from "./utils";

describe("attachment validation", () => {
  it("accepts supported small files", () => {
    const file = new File(["hello"], "notes.md", { type: "text/markdown" });
    expect(validateAttachment(file)).toBeNull();
  });

  it("rejects unsupported MIME types", () => {
    const file = new File(["binary"], "demo.exe", {
      type: "application/x-msdownload"
    });
    expect(validateAttachment(file)).toContain("仅支持");
  });
});

describe("storage object keys", () => {
  it("uses the ASCII extension of Chinese file names", () => {
    expect(storageFileExtension("屏幕截图-2026-11-08-212035.jpg")).toBe("jpg");
    expect(storageFileExtension("学习笔记.PNG")).toBe("png");
  });

  it("falls back to bin when there is no safe extension", () => {
    expect(storageFileExtension("没有扩展名")).toBe("bin");
    expect(storageFileExtension("截图.图片")).toBe("bin");
  });
});
