import test from "node:test";
import assert from "node:assert/strict";

import { createAttemptRecord } from "../utils/attempts.js";

test("creates a failed attempt record with problem identity", () => {
    const record = createAttemptRecord({
        platform: "Codeforces",
        slug: "123-a-example",
        title: "Example",
        url: "https://codeforces.com/contest/123/problem/A",
        language: "GNU C++17",
        accepted: false,
        code: "int main() {}"
    }, new Date("2026-09-09T00:00:00.000Z"));

    assert.equal(record.verdict, "failed");
    assert.equal(record.platform, "Codeforces");
    assert.equal(record.language, "GNU C++17");
    assert.match(record.id, /Codeforces:123-a-example:/);
});

test("classifies accepted and unknown attempts", () => {
    assert.equal(createAttemptRecord({ accepted: true }).verdict, "accepted");
    assert.equal(createAttemptRecord({ accepted: null }).verdict, "unknown");
});