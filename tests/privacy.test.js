import test from "node:test";
import assert from "node:assert/strict";

import { LOCAL_DATA_KEYS } from "../utils/privacy.js";

test("defines all sensitive local data categories for deletion", () => {
    assert.ok(LOCAL_DATA_KEYS.includes("token"));
    assert.ok(LOCAL_DATA_KEYS.includes("leetcodeRepo"));
    assert.ok(LOCAL_DATA_KEYS.includes("storageSchemaVersion"));
    assert.ok(LOCAL_DATA_KEYS.includes("uploadHistory"));
    assert.ok(LOCAL_DATA_KEYS.includes("reviewRecords"));
    assert.ok(LOCAL_DATA_KEYS.includes("attemptHistory"));
});