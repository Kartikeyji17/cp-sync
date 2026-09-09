export function buildRedoQueue(attempts, limit = 10) {
    const seen = new Set();
    const queue = [];

    attempts
        .filter((attempt) => attempt.verdict === "failed")
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
        .forEach((attempt) => {
            const key = `${attempt.platform}:${attempt.slug}`;

            if (seen.has(key) || queue.length >= limit)
                return;

            seen.add(key);
            queue.push({
                platform: attempt.platform,
                slug: attempt.slug,
                title: attempt.title || attempt.slug,
                url: attempt.url,
                topic: attempt.topic || attempt.tags?.[0] || "General",
                lastAttemptedAt: attempt.capturedAt
            });
        });

    return queue;
}