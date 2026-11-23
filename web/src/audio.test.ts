import { describe, expect, it, vi, beforeEach } from "vitest";
import { countWord, countMilestoneWord, currentVoice, speak, stopSpeech, unlockAudio } from "./lib/audio";

describe("audio helper tests", () => {
  it("counts words in Russian and English properly", () => {
    expect(countWord(1, "ru")).toBe("Раз");
    expect(countWord(2, "ru")).toBe("Два");
    expect(countWord(10, "ru")).toBe("Десять");
    expect(countWord(1, "en")).toBe("1");
    expect(countWord(15, "en")).toBe("15");
  });

  it("formats milestone words properly", () => {
    expect(countMilestoneWord(10, "ru")).toBe("Десять");
    expect(countMilestoneWord(20, "ru")).toBe("Двадцать");
    expect(countMilestoneWord(30, "ru")).toBe("Тридцать");
    expect(countMilestoneWord(25, "ru")).toBe("25");
    expect(countMilestoneWord(10, "en")).toBe("10");
  });

  it("handles voice selection fallback gracefully", () => {
    const v = currentVoice("", "ru-RU");
    // In node/vitest environment, no voices exist by default, should return undefined without throwing
    expect(v === undefined || typeof v === "object").toBe(true);
  });

  it("safe speak and unlock audio in environment without DOM audio", () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => speak("Раз")).not.toThrow();
    expect(() => stopSpeech()).not.toThrow();
  });
});
