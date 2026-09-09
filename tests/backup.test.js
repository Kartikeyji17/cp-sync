import test from "node:test";
import assert from "node:assert/strict";

import { buildBackup, parseBackup } from "../utils/backup.js";

test("builds a versioned backup using supported storage keys", () => {
    const backup = buildBackup({
        token: "secret",
        uploadHistory: [{ slug: "two-sum" }],
        unknownKey: "ignored"
    });

    assert.equal(backup.format, "cp-sync-backup");
    assert.equal(backup.version, 1);
    assert.equal(backup.data.token, "secret");
    assert.equal(backup.data.unknownKey, undefined);
});

test("parses only supported data from a valid backup", () => {
    const data = parseBackup({
        format: "cp-sync-backup",
        version: 1,
        data: {
            autoUploadMode: "manual",
            injected: "ignored"
        }
    });

    assert.deepEqual(data, { autoUploadMode: "manual" });
});

test("rejects invalid or unsupported backups", () => {
    assert.throws(() => parseBackup(null), /JSON object/);
    assert.throws(() => parseBackup({ format: "other", version: 1, data: {} }), /not a CP Sync backup/);
    assert.throws(() => parseBackup({ format: "cp-sync-backup", version: 99, data: {} }), /Unsupported backup version/);
});