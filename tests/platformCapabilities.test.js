import test from "node:test";
import assert from "node:assert/strict";

import {
    getAllPlatformCapabilities,
    getPlatformCapabilities
} from "../utils/platformCapabilities.js";

test("describes supported capture capabilities", () => {
    const leetcode = getPlatformCapabilities("leetcode");

    assert.equal(leetcode.name, "LeetCode");
    assert.equal(leetcode.submissionMetadata, false);
    assert.ok(leetcode.fields.includes("code"));
});

test("returns isolated capability data and null for unknown platforms", () => {
    const first = getPlatformCapabilities("codeforces");
    first.fields.push("unexpected");

    assert.equal(getPlatformCapabilities("codeforces").fields.includes("unexpected"), false);
    assert.equal(getPlatformCapabilities("unknown"), null);
    assert.deepEqual(Object.keys(getAllPlatformCapabilities()), ["leetcode", "codeforces", "codechef"]);
});