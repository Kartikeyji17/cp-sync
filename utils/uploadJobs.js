export const UPLOAD_JOB_STATES = {
    pending: "pending",
    uploading: "uploading",
    retrying: "retrying",
    succeeded: "succeeded",
    skipped: "skipped",
    conflict: "conflict",
    failed: "failed",
    cancelled: "cancelled"
};

import { buildUploadIdempotencyKey } from "./uploadIdentity.js";
import { DATA_SCHEMA_VERSION } from "./schema.js";

const TRANSITIONS = {
    pending: ["uploading", "cancelled"],
    uploading: ["retrying", "succeeded", "skipped", "conflict", "failed"],
    retrying: ["uploading", "failed", "cancelled"],
    conflict: ["uploading", "cancelled"],
    succeeded: [],
    skipped: [],
    failed: ["retrying", "cancelled"],
    cancelled: []
};

export function createUploadJob(problem, repository) {
    const now = new Date().toISOString();

    return {
        schemaVersion: DATA_SCHEMA_VERSION,
        id: createJobId(),
        state: UPLOAD_JOB_STATES.pending,
        platform: problem?.platform || "",
        slug: problem?.slug || "",
        title: problem?.title || "",
        problem: problem ? { ...problem } : null,
        repository: repository || "",
        idempotencyKey: buildUploadIdempotencyKey(problem, repository, "pending"),
        attempts: 0,
        error: "",
        result: null,
        createdAt: now,
        updatedAt: now
    };
}

export function transitionUploadJob(job, nextState, patch = {}) {
    const allowed = TRANSITIONS[job?.state] || [];

    if (!allowed.includes(nextState))
        throw new Error(`Invalid upload job transition: ${job?.state} -> ${nextState}`);

    return {
        ...job,
        ...patch,
        state: nextState,
        attempts: nextState === UPLOAD_JOB_STATES.uploading
            ? job.attempts + 1
            : job.attempts,
        updatedAt: new Date().toISOString()
    };
}

export async function saveUploadJob(job) {
    const stored = await chrome.storage.local.get(["uploadJobs"]);
    const jobs = Array.isArray(stored.uploadJobs) ? stored.uploadJobs : [];
    const filtered = jobs.filter((item) => item.id !== job.id);

    filtered.unshift(job);

    await chrome.storage.local.set({
        uploadJobs: filtered.slice(0, 100)
    });

    return job;
}

export async function cancelUploadJob(jobId) {
    const jobs = await getUploadJobs();
    const job = jobs.find((item) => item.id === jobId);

    if (!job)
        throw new Error("Upload job not found.");

    const cancelled = transitionUploadJob(job, UPLOAD_JOB_STATES.cancelled);
    await saveUploadJob(cancelled);
    return cancelled;
}

export async function getUploadJobs() {
    const stored = await chrome.storage.local.get(["uploadJobs"]);
    return Array.isArray(stored.uploadJobs) ? stored.uploadJobs : [];
}

function createJobId() {
    if (globalThis.crypto?.randomUUID)
        return globalThis.crypto.randomUUID();

    return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}