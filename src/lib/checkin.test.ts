import { describe, expect, it, vi } from "vitest";
import {
  CHECKIN_PHOTO_ACCEPT,
  MAX_CHECKIN_PHOTOS,
  getCheckInState,
  getLogPhotos,
  validateCheckInPhoto
} from "./checkin";
import type { Attachment, Plan } from "../types";

const plan: Pick<Plan, "startDate" | "endDate"> = {
  startDate: "2026-11-09",
  endDate: "2028-06-30"
};

let attachmentSeq = 0;
function makeAttachment(overrides: Partial<Attachment> = {}): Attachment {
  attachmentSeq += 1;
  return {
    id: `attachment-${attachmentSeq}`,
    planId: "local-unity-ta",
    monthId: "month-1",
    dailyLogId: null,
    storagePath: `local/${attachmentSeq}`,
    fileName: `photo-${attachmentSeq}.jpg`,
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    uploadedBy: "local-demo",
    url: null,
    createdAt: `2026-11-0${attachmentSeq}T00:00:00.000Z`,
    ...overrides
  };
}

describe("check-in photo validation", () => {
  it("allows at most three photos per check-in", () => {
    expect(MAX_CHECKIN_PHOTOS).toBe(3);
  });

  it("offers the browser file accept list for supported photo formats", () => {
    expect(CHECKIN_PHOTO_ACCEPT.split(",")).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic"
    ]);
  });

  it("accepts png / jpeg / webp / heic photos", () => {
    for (const type of CHECKIN_PHOTO_ACCEPT.split(",")) {
      const file = new File(["photo"], `photo.${type.split("/")[1]}`, { type });
      expect(validateCheckInPhoto(file)).toBeNull();
    }
  });

  it("rejects unsupported formats with a Chinese hint", () => {
    const gif = new File(["gif"], "meme.gif", { type: "image/gif" });
    expect(validateCheckInPhoto(gif)).toContain("仅支持");

    const pdf = new File(["pdf"], "resume.pdf", { type: "application/pdf" });
    expect(validateCheckInPhoto(pdf)).toContain("仅支持");
  });

  it("accepts a photo exactly 10MB and rejects anything larger", () => {
    const limit = 10 * 1024 * 1024;
    const atLimit = new File([new Uint8Array(limit)], "at-limit.jpg", {
      type: "image/jpeg"
    });
    expect(validateCheckInPhoto(atLimit)).toBeNull();

    const tooLarge = new File([new Uint8Array(limit + 1)], "huge.jpg", {
      type: "image/jpeg"
    });
    expect(validateCheckInPhoto(tooLarge)).toContain("10MB");
  });

  it("falls back to the file extension when the browser omits the MIME type", () => {
    const heic = new File(["photo"], "IMG_0001.HEIC", { type: "" });
    expect(validateCheckInPhoto(heic)).toBeNull();

    const unknown = new File(["binary"], "notes.txt", { type: "" });
    expect(validateCheckInPhoto(unknown)).toContain("仅支持");
  });
});

describe("check-in photos on a daily log", () => {
  it("only returns the photos attached to the requested log", () => {
    const older = makeAttachment({
      id: "photo-older",
      dailyLogId: "log-a",
      createdAt: "2026-11-12T01:00:00.000Z"
    });
    const newer = makeAttachment({
      id: "photo-newer",
      dailyLogId: "log-a",
      createdAt: "2026-11-12T02:00:00.000Z"
    });
    const other = makeAttachment({
      id: "photo-other",
      dailyLogId: "log-b",
      createdAt: "2026-11-12T03:00:00.000Z"
    });
    const monthLevel = makeAttachment({ id: "photo-month", dailyLogId: null });

    const photos = getLogPhotos(
      [older, other, newer, monthLevel],
      "log-a"
    );
    expect(photos.map((photo) => photo.id)).toEqual([
      "photo-newer",
      "photo-older"
    ]);
    expect(getLogPhotos([older, other, newer, monthLevel], "log-c")).toEqual([]);
  });
});

describe("check-in window state", () => {
  it("locks check-in before the plan starts", () => {
    expect(getCheckInState(plan, "2026-11-08")).toBe("before_start");
  });

  it("is active on the start, middle and end dates of the plan", () => {
    expect(getCheckInState(plan, "2026-11-09")).toBe("active");
    expect(getCheckInState(plan, "2027-06-01")).toBe("active");
    expect(getCheckInState(plan, "2028-06-30")).toBe("active");
  });

  it("is read-only after the plan ends", () => {
    expect(getCheckInState(plan, "2028-07-01")).toBe("ended");
  });

  it("defaults to today in Shanghai", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T02:00:00Z"));
    try {
      expect(getCheckInState(plan)).toBe("active");
    } finally {
      vi.useRealTimers();
    }
  });
});
