import test from "node:test";
import assert from "node:assert/strict";

import {
    createUploadJob,
    transitionUploadJob,
    UPLOAD_JOB_STATES
} from "../utils/uploadJobs.js";

test("creates a pending upload job with problem identity", () => {
    const job = createUploadJob({
        platform: "leetcode",
        slug: "two-sum",
        title: "Two Sum"
    }, "user/solutions");

    assert.equal(job.state, UPLOAD_JOB_STATES.pending);
    assert.equal(job.platform, "leetcode");
    assert.equal(job.repository, "user/solutions");
    assert.equal(job.problem.title, "Two Sum");
    assert.match(job.idempotencyKey, /^leetcode:two-sum:user\/solutions:pending:/);
    assert.equal(job.attempts, 0);
    assert.ok(job.id);
});

test("allows a retryable upload lifecycle", () => {
    const pending = createUploadJob({
        platform: "codeforces",
        slug: "123-a",
        title: "Example"
    }, "user/solutions");
    const uploading = transitionUploadJob(pending, "uploading");
    const retrying = transitionUploadJob(uploading, "retrying", {
        error: "Service unavailable"
    });
    const retryUpload = transitionUploadJob(retrying, "uploading");
    const succeeded = transitionUploadJob(retryUpload, "succeeded", {
        result: { path: "Codeforces/Example.cpp" },
        error: ""
    });

    assert.equal(uploading.attempts, 1);
    assert.equal(retryUpload.attempts, 2);
    assert.equal(succeeded.state, "succeeded");
    assert.equal(succeeded.result.path, "Codeforces/Example.cpp");
});

test("rejects transitions out of terminal states", () => {
    const pending = createUploadJob({ platform: "codechef" }, "user/solutions");
    const uploading = transitionUploadJob(pending, "uploading");
    const succeeded = transitionUploadJob(uploading, "succeeded");

    assert.throws(
        () => transitionUploadJob(succeeded, "retrying"),
        /Invalid upload job transition/
    );
});

test("supports an explicit conflict state and resolution retry", () => {
    const pending = createUploadJob({ platform: "leetcode" }, "user/solutions");
    const uploading = transitionUploadJob(pending, "uploading");
    const conflict = transitionUploadJob(uploading, "conflict", {
        error: "File changed remotely"
    });
    const retry = transitionUploadJob(conflict, "uploading");

    assert.equal(conflict.state, UPLOAD_JOB_STATES.conflict);
    assert.equal(retry.state, UPLOAD_JOB_STATES.uploading);
    assert.equal(retry.attempts, 2);
});

test("retains partial completion details on a failed job", () => {
    const pending = createUploadJob({ platform: "leetcode" }, "user/solutions");
    const uploading = transitionUploadJob(pending, "uploading");
    const failed = transitionUploadJob(uploading, "failed", {
        error: "README update failed",
        result: {
            commits: {
                solution: "abc123",
                notes: "def456"
            },
            completed: {
                solution: true,
                notes: true,
                readme: false
            }
        }
    });

    assert.equal(failed.result.completed.solution, true);
    assert.equal(failed.result.completed.readme, false);
    assert.equal(failed.result.commits.solution, "abc123");
});