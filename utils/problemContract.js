import { DATA_SCHEMA_VERSION } from "./schema.js";

export const SUPPORTED_PLATFORMS = ["leetcode", "codeforces", "codechef"];
export const PROBLEM_CONTRACT_VERSION = 1;

export function normalizeProblem(problem) {
    if (!problem || typeof problem !== "object")
        return null;

    const normalized = {
        ...problem,
        schemaVersion: DATA_SCHEMA_VERSION,
        contractVersion: PROBLEM_CONTRACT_VERSION,
        parserVersion: Number(problem.parserVersion) || 1,
        captureSource: normalizeString(problem.captureSource),
        externalId: normalizeString(problem.externalId),
        submissionId: normalizeString(problem.submissionId),
        runtime: normalizeString(problem.runtime),
        memory: normalizeString(problem.memory),
        submittedAt: normalizeString(problem.submittedAt),
        approach: normalizeString(problem.approach),
        complexity: normalizeString(problem.complexity),
        editorialUrl: normalizeString(problem.editorialUrl),
        platform: normalizeString(problem.platform),
        title: normalizeString(problem.title),
        slug: normalizeString(problem.slug),
        url: normalizeString(problem.url),
        difficulty: normalizeString(problem.difficulty),
        language: normalizeString(problem.language),
        code: normalizeString(problem.code),
        notes: normalizeString(problem.notes),
        tags: normalizeTags(problem.tags),
        topic: normalizeString(problem.topic),
        accepted: normalizeAccepted(problem.accepted),
        contest: normalizeContest(problem.contest)
    };

    const diagnostics = getProblemDiagnostics(normalized);

    return {
        ...normalized,
        missingFields: diagnostics.missing,
        captureConfidence: diagnostics.confidence
    };
}

export function validateProblem(problem, options = {}) {
    if (!problem)
        throw new Error("No problem data found.");

    if (!SUPPORTED_PLATFORMS.includes(problem.platform))
        throw new Error("Unsupported platform.");

    if (problem.accepted === false)
        throw new Error("The current page does not show an accepted solution yet.");

    const diagnostics = getProblemDiagnostics(problem);

    if (diagnostics.missing.length)
        throw new Error(`Could not identify the current problem: missing ${diagnostics.missing.join(", ")}.`);

    if (!problem.code?.trim() && options.force !== true)
        throw new Error("Could not extract solution code from the page.");
}

export function getProblemDiagnostics(problem) {
    const missing = [];
    const requiredFields = ["title", "slug", "url"];

    requiredFields.forEach((field) => {
        if (!problem?.[field])
            missing.push(field);
    });

    if (!problem?.language)
        missing.push("language");

    if (!problem?.code?.trim())
        missing.push("code");

    return {
        missing,
        confidence: Math.max(0, 1 - missing.length / 5)
    };
}

function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(tags) {
    if (!Array.isArray(tags))
        return [];

    return Array.from(new Set(tags
        .map(normalizeString)
        .filter(Boolean)));
}

function normalizeAccepted(value) {
    return value === true || value === false ? value : null;
}

function normalizeContest(contest) {
    if (!contest || typeof contest !== "object")
        return null;

    return {
        isContest: contest.isContest === true,
        name: normalizeString(contest.name),
        platform: normalizeString(contest.platform)
    };
}