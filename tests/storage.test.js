import test from "node:test";
import assert from "node:assert/strict";

import { initializeStorage, STORAGE_SCHEMA_VERSION } from "../utils/storage.js";

function installStorage(initial) {
    const data = { ...initial };
    let writes = 0;

    globalThis.chrome = {
        storage: {
            local: {
                async get(keys) {
                    return Object.fromEntries(keys.map((key) => [key, data[key]]));
                },
                async set(values) {
                    writes += 1;
                    Object.assign(data, values);
                }
            }
        }
    };

    return { data, get writes() { return writes; } };
}

test("migrates legacy repositories into the normalized storage schema", async () => {
    const storage = installStorage({
        leetcodeRepo: "user/leetcode",
        codeforcesRepo: "user/codeforces"
    });

    await initializeStorage();

    assert.equal(storage.data.storageSchemaVersion, STORAGE_SCHEMA_VERSION);
    assert.deepEqual(storage.data.platformRepositories.leetcode, ["user/leetcode"]);
    assert.equal(storage.data.defaultRepositories.codeforces, "user/codeforces");
    assert.equal(storage.writes, 1);
});

test("does not rewrite current storage on subsequent startup", async () => {
    const storage = installStorage({
        storageSchemaVersion: STORAGE_SCHEMA_VERSION,
        platformRepositories: { leetcode: ["user/solutions"] },
        defaultRepositories: { leetcode: "user/solutions" },
        lastUsedRepositories: {}
    });

    await initializeStorage();

    assert.equal(storage.writes, 0);
});

test("adds schema versions to existing local records during migration", async () => {
    const storage = installStorage({
        storageSchemaVersion: 1,
        uploadHistory: [{ slug: "two-sum" }],
        uploadJobs: [{ id: "job-1" }],
        reviewRecords: [{ id: "review-1" }],
        attemptHistory: [{ id: "attempt-1" }]
    });

    await initializeStorage();

    assert.equal(storage.data.storageSchemaVersion, STORAGE_SCHEMA_VERSION);
    assert.equal(storage.data.uploadHistory[0].schemaVersion, 1);
    assert.equal(storage.data.uploadJobs[0].schemaVersion, 1);
    assert.equal(storage.data.reviewRecords[0].schemaVersion, 1);
    assert.equal(storage.data.attemptHistory[0].schemaVersion, 1);
});