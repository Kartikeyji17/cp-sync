import { DATA_SCHEMA_VERSION } from "./schema.js";

export const REVIEW_INTERVALS = {
    again: 1,
    hard: 3,
    good: 7,
    easy: 21
};

export function createReviewRecord(entry, now = new Date()) {
    const timestamp = now.toISOString();

    return {
        schemaVersion: DATA_SCHEMA_VERSION,
        id: `${entry.repository || ""}:${entry.platform}:${entry.slug}`,
        repository: entry.repository || "",
        platform: entry.platform || "",
        slug: entry.slug || "",
        title: entry.title || "",
        path: entry.path || "",
        confidence: "new",
        intervalDays: 0,
        reviewCount: 0,
        mistakes: "",
        notes: entry.notes || "",
        approach: entry.approach || "",
        complexity: entry.complexity || "",
        editorialUrl: entry.editorialUrl || "",
        dueAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

export function markReviewed(record, rating, mistakes = record.mistakes || "", now = new Date()) {
    if (!Object.hasOwn(REVIEW_INTERVALS, rating))
        throw new Error(`Unsupported review rating: ${rating}`);

    const intervalDays = rating === "again"
        ? REVIEW_INTERVALS.again
        : Math.max(REVIEW_INTERVALS[rating], record.intervalDays * 2 || 0);
    const dueAt = new Date(now.getTime() + intervalDays * 86400000).toISOString();

    return {
        ...record,
        confidence: rating,
        intervalDays,
        reviewCount: (record.reviewCount || 0) + 1,
        mistakes: String(mistakes).trim(),
        dueAt,
        updatedAt: now.toISOString()
    };
}

export function isReviewDue(record, now = new Date()) {
    return new Date(record.dueAt).getTime() <= now.getTime();
}

export function upsertReview(records, nextRecord) {
    return [nextRecord, ...records.filter((record) => record.id !== nextRecord.id)];
}

export async function getReviewRecords() {
    const stored = await chrome.storage.local.get(["reviewRecords"]);
    return Array.isArray(stored.reviewRecords) ? stored.reviewRecords : [];
}

export async function saveReviewRecord(record) {
    const records = await getReviewRecords();

    await chrome.storage.local.set({
        reviewRecords: upsertReview(records, record)
    });

    return record;
}