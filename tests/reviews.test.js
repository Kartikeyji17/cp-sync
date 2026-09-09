import test from "node:test";
import assert from "node:assert/strict";

import {
    createReviewRecord,
    isReviewDue,
    markReviewed,
    upsertReview
} from "../utils/reviews.js";

test("creates a review due immediately for a new solution", () => {
    const now = new Date("2026-09-09T00:00:00.000Z");
    const record = createReviewRecord({
        repository: "user/solutions",
        platform: "LeetCode",
        slug: "two-sum",
        title: "Two Sum"
    }, now);

    assert.equal(record.confidence, "new");
    assert.equal(record.dueAt, now.toISOString());
    assert.equal(isReviewDue(record, now), true);
});

test("schedules the next review according to its rating", () => {
    const now = new Date("2026-09-09T00:00:00.000Z");
    const record = createReviewRecord({ slug: "two-sum" }, now);
    const reviewed = markReviewed(record, "good", "Missed the boundary case.", now);

    assert.equal(reviewed.intervalDays, 7);
    assert.equal(reviewed.reviewCount, 1);
    assert.equal(reviewed.mistakes, "Missed the boundary case.");
    assert.equal(reviewed.dueAt, "2026-09-16T00:00:00.000Z");
});

test("replaces a review record by stable identity", () => {
    const first = createReviewRecord({ repository: "user/solutions", platform: "LeetCode", slug: "two-sum" });
    const second = { ...first, confidence: "easy" };

    assert.deepEqual(upsertReview([first], second), [second]);
    assert.throws(() => markReviewed(first, "unknown"), /Unsupported review rating/);
});