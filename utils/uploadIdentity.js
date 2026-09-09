export function buildUploadIdempotencyKey(problem, repository, solutionPath) {
    const platform = problem?.platform || "unknown";
    const problemId = problem?.externalId || problem?.slug || problem?.title || "unknown";
    const language = problem?.language || "unknown";

    return [platform, problemId, repository || "unknown", solutionPath || "unknown", language]
        .map((value) => String(value).trim().toLowerCase())
        .join(":");
}