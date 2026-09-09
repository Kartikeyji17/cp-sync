import test from "node:test";
import assert from "node:assert/strict";

import { buildUploadIdempotencyKey } from "../utils/uploadIdentity.js";

test("builds a stable identity for the same upload target", () => {
    const problem = {
        platform: "LeetCode",
        externalId: "two-sum",
        language: "Python3"
    };

    assert.equal(
        buildUploadIdempotencyKey(problem, "user/solutions", "LeetCode/Two-Sum.py"),
        "leetcode:two-sum:user/solutions:leetcode/two-sum.py:python3"
    );
});

test("changes identity when repository or language changes", () => {
    const problem = { platform: "leetcode", slug: "two-sum", language: "Python" };
    const first = buildUploadIdempotencyKey(problem, "user/one", "Two-Sum.py");
    const second = buildUploadIdempotencyKey({ ...problem, language: "C++" }, "user/two", "Two-Sum.cpp");

    assert.notEqual(first, second);
});