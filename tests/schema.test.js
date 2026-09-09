import test from "node:test";
import assert from "node:assert/strict";

import { DATA_SCHEMA_VERSION } from "../utils/schema.js";
import { createAttemptRecord } from "../utils/attempts.js";
import { createReviewRecord } from "../utils/reviews.js";
import { createUploadJob } from "../utils/uploadJobs.js";

test("new local records carry the shared schema version", () => {
    assert.equal(createAttemptRecord({}).schemaVersion, DATA_SCHEMA_VERSION);
    assert.equal(createReviewRecord({}).schemaVersion, DATA_SCHEMA_VERSION);
    assert.equal(createUploadJob({}, "").schemaVersion, DATA_SCHEMA_VERSION);
});