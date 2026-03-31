import { describe, it, expect } from "vitest";
import {
  splitSentences,
  groupSentences,
  splitScenes,
} from "../scene-splitter";
import type { ShortWord } from "../../remotion/BriefShort";
import type { PexelsVideoResult } from "../../image/pexels-video-client";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeWords(count: number, fps = 30): ShortWord[] {
  const words: ShortWord[] = [];
  for (let i = 0; i < count; i++) {
    words.push({
      text: `word${i}`,
      startFrame: i * fps,
      endFrame: (i + 1) * fps - 1,
    });
  }
  return words;
}

function makeBgs(count: number): PexelsVideoResult[] {
  return Array.from({ length: count }, (_, i) => ({
    videoUrl: `https://pexels.com/video/${i}.mp4`,
    width: 1920,
    height: 1080,
    duration: 15,
    id: 1000 + i,
  }));
}

// ---------------------------------------------------------------------------
// splitSentences
// ---------------------------------------------------------------------------

describe("splitSentences", () => {
  it("should split by period", () => {
    const result = splitSentences("Hello world. Goodbye world.");
    expect(result).toEqual(["Hello world.", "Goodbye world."]);
  });

  it("should split by question mark and exclamation", () => {
    const result = splitSentences("Is this real? Yes it is! Done.");
    expect(result).toEqual(["Is this real?", "Yes it is!", "Done."]);
  });

  it("should handle text without trailing punctuation", () => {
    const result = splitSentences("First sentence. No punctuation at end");
    expect(result).toEqual(["First sentence.", "No punctuation at end"]);
  });

  it("should handle single sentence", () => {
    const result = splitSentences("Just one.");
    expect(result).toEqual(["Just one."]);
  });

  it("should ignore empty strings", () => {
    const result = splitSentences("");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// groupSentences
// ---------------------------------------------------------------------------

describe("groupSentences", () => {
  it("should split 4 sentences into 4 groups", () => {
    const sentences = ["A.", "B.", "C.", "D."];
    const groups = groupSentences(sentences, 4);
    expect(groups).toHaveLength(4);
    groups.forEach((g) => expect(g).toHaveLength(1));
  });

  it("should split 8 sentences into 4 groups of ~2", () => {
    const sentences = ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H."];
    const groups = groupSentences(sentences, 4);
    expect(groups).toHaveLength(4);
    expect(groups.flat()).toHaveLength(8);
  });

  it("should gracefully degrade when sentences < sceneCount", () => {
    const sentences = ["A.", "B."];
    const groups = groupSentences(sentences, 4);
    // Should return 2 groups (can't create more than sentences)
    expect(groups.length).toBeLessThanOrEqual(2);
    expect(groups.flat()).toHaveLength(2);
  });

  it("should handle single sentence", () => {
    const groups = groupSentences(["Only."], 4);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(["Only."]);
  });

  it("should handle empty array", () => {
    const groups = groupSentences([], 4);
    expect(groups).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// splitScenes
// ---------------------------------------------------------------------------

describe("splitScenes", () => {
  it("should split 4 sentences into 4 scenes", () => {
    const script = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    const words = makeWords(20);
    const bgs = makeBgs(4);

    const scenes = splitScenes({
      script,
      words,
      sceneCount: 4,
      backgrounds: bgs,
    });

    expect(scenes).toHaveLength(4);

    // Each scene should have valid frame range
    for (const scene of scenes) {
      expect(scene.startFrame).toBeDefined();
      expect(scene.endFrame).toBeGreaterThanOrEqual(scene.startFrame);
      expect(scene.kenBurns).toBeDefined();
    }

    // Scenes should be non-overlapping and cover the full range
    for (let i = 1; i < scenes.length; i++) {
      expect(scenes[i]!.startFrame).toBeGreaterThanOrEqual(scenes[i - 1]!.startFrame);
    }
  });

  it("should cycle kenBurns patterns", () => {
    const script = "A. B. C. D. E. F. G. H.";
    const words = makeWords(40);
    const bgs = makeBgs(8);

    const scenes = splitScenes({
      script,
      words,
      sceneCount: 8,
      backgrounds: bgs,
    });

    expect(scenes[0]!.kenBurns).toBe("zoom-in");
    expect(scenes[1]!.kenBurns).toBe("zoom-out");
    expect(scenes[2]!.kenBurns).toBe("pan-left");
    expect(scenes[3]!.kenBurns).toBe("pan-right");
    expect(scenes[4]!.kenBurns).toBe("zoom-in"); // cycle
  });

  it("should assign Pexels backgrounds", () => {
    const script = "One. Two. Three. Four.";
    const words = makeWords(20);
    const bgs = makeBgs(4);

    const scenes = splitScenes({
      script,
      words,
      sceneCount: 4,
      backgrounds: bgs,
    });

    scenes.forEach((scene, i) => {
      expect(scene.videoSrc).toBe(bgs[i]!.videoUrl);
    });
  });

  it("should set chapterTitles for longform", () => {
    const script = "Intro. Chapter one. Chapter two. Conclusion.";
    const words = makeWords(20);
    const bgs = makeBgs(4);

    const scenes = splitScenes({
      script,
      words,
      sceneCount: 4,
      backgrounds: bgs,
      chapterTitles: ["Intro", "Ch 1", "Ch 2", "Outro"],
    });

    expect(scenes[0]!.chapterTitle).toBe("Intro");
    expect(scenes[3]!.chapterTitle).toBe("Outro");
  });

  it("should extend last scene to cover all words", () => {
    const script = "Short.";
    const words = makeWords(30); // 30 words, frames 0..869

    const scenes = splitScenes({
      script,
      words,
      sceneCount: 1,
      backgrounds: makeBgs(1),
    });

    expect(scenes).toHaveLength(1);
    // Last scene endFrame should be at least the last word's endFrame
    expect(scenes[0]!.endFrame).toBeGreaterThanOrEqual(words[words.length - 1]!.endFrame);
  });

  it("should handle empty words gracefully", () => {
    const script = "Hello. World.";

    const scenes = splitScenes({
      script,
      words: [],
      sceneCount: 2,
      backgrounds: makeBgs(2),
    });

    // Empty words → empty scenes (no frames to split)
    expect(scenes).toHaveLength(0);
  });
});
