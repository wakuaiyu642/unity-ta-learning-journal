import { describe, expect, it } from "vitest";
import { validateAttachment } from "./utils";

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
