import test from "node:test";
import assert from "node:assert/strict";

import { buildRedoQueue } from "../utils/recommendations.js";

test("builds a deduplicated redo queue from recent failed attempts", () => {
    const queue = buildRedoQueue([
        {
            verdict: "failed",
            platform: "LeetCode",
            slug: "two-sum",
            title: "Two Sum",
            url: "https://leetcode.com/problems/two-sum/",
            topic: "Arrays",
            capturedAt: "2026-09-08T00:00:00.000Z"
        },
        {
            verdict: "failed",
            platform: "LeetCode",
            slug: "two-sum",
            title: "Two Sum",
            capturedAt: "2026-09-07T00:00:00.000Z"
        },
        {
            verdict: "failed",
            platform: "Codeforces",
            slug: "123-a",
            title: "Example",
            capturedAt: "2026-09-09T00:00:00.000Z"
        }
    ]);

    assert.equal(queue.length, 2);
    assert.equal(queue[0].slug, "123-a");
    assert.equal(queue[1].topic, "Arrays");
});