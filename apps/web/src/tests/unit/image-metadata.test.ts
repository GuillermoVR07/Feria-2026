import { describe, expect, it, vi } from "vitest";

import { sha256File } from "@/lib/utils/image-metadata";
import { formatBytes, validateImageFile } from "@/features/images/utils";

describe("image utilities", () => {
  it("formats bytes for UI", () => {
    expect(formatBytes(512)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("2 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });

  it("validates selected image metadata", () => {
    const validFile = new File(["demo"], "demo.jpg", { type: "image/jpeg" });
    const invalidFile = new File(["demo"], "demo.pdf", { type: "application/pdf" });

    expect(validateImageFile(validFile, 640, 480).success).toBe(true);
    expect(validateImageFile(invalidFile, 640, 480).success).toBe(false);
  });

  it("hashes file content with SHA-256", async () => {
    const digestSpy = vi.spyOn(crypto.subtle, "digest");
    const hash = await sha256File(new File(["abc"], "demo.txt", { type: "text/plain" }));

    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(digestSpy).toHaveBeenCalledWith("SHA-256", expect.any(ArrayBuffer));
  });
});
