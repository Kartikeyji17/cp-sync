import test from "node:test";
import assert from "node:assert/strict";

import { safeExternalUrl } from "../utils/urls.js";

test("allows HTTP and HTTPS URLs", () => {
    assert.equal(safeExternalUrl("https://leetcode.com/problems/two-sum/"), "https://leetcode.com/problems/two-sum/");
    assert.equal(safeExternalUrl("http://example.com/problem"), "http://example.com/problem");
});

test("rejects unsafe or malformed URLs", () => {
    assert.equal(safeExternalUrl("javascript:alert(1)"), "");
    assert.equal(safeExternalUrl("not a url"), "");
    assert.equal(safeExternalUrl("data:text/html,test"), "");
});