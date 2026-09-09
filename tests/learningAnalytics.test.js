import test from "node:test";
import assert from "node:assert/strict";

import { buildWeakTopicStats } from "../utils/learningAnalytics.js";

test("ranks topics by failed attempts", () => {
    const stats = buildWeakTopicStats([
        { verdict: "failed", topic: "Graphs" },
        { verdict: "failed", topic: "Graphs" },
        { verdict: "failed", tags: ["DP"] },
        { verdict: "accepted", topic: "Graphs" }
    ]);

    assert.deepEqual(stats, [
        { topic: "Graphs", failures: 2 },
        { topic: "DP", failures: 1 }
    ]);
});

test("uses General for failed attempts without topic metadata", () => {
    assert.deepEqual(
        buildWeakTopicStats([{ verdict: "failed" }]),
        [{ topic: "General", failures: 1 }]
    );
});