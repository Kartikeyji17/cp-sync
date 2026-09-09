import { DATA_SCHEMA_VERSION } from "./schema.js";

export const ATTEMPT_LIMIT = 1000;

export function createAttemptRecord(problem, now = new Date()) {
    return {
        schemaVersion: DATA_SCHEMA_VERSION,
        id: `${problem?.platform || ""}:${problem?.slug || ""}:${now.toISOString()}`,
        platform: problem?.platform || "",
        slug: problem?.slug || "",
        title: problem?.title || "",
        url: problem?.url || "",
        submissionId: problem?.submissionId || "",
        language: problem?.language || "",
        topic: problem?.topic || "",
        tags: Array.isArray(problem?.tags) ? [...problem.tags] : [],
        verdict: problem?.accepted === true ? "accepted" : problem?.accepted === false ? "failed" : "unknown",
        code: problem?.code || "",
        capturedAt: now.toISOString()
    };
}

export async function recordAttempt(problem) {
    const stored = await chrome.storage.local.get(["attemptHistory"]);
    const history = Array.isArray(stored.attemptHistory) ? stored.attemptHistory : [];
    const record = createAttemptRecord(problem);

    await chrome.storage.local.set({
        attemptHistory: [record, ...history].slice(0, ATTEMPT_LIMIT)
    });

    return record;
}

export async function getAttemptHistory() {
    const stored = await chrome.storage.local.get(["attemptHistory"]);
    return Array.isArray(stored.attemptHistory) ? stored.attemptHistory : [];
}