export function buildWeakTopicStats(attempts, limit = 5) {
    const stats = {};

    attempts
        .filter((attempt) => attempt.verdict === "failed")
        .forEach((attempt) => {
            const topic = attempt.topic || attempt.tags?.[0] || "General";
            stats[topic] = (stats[topic] || 0) + 1;
        });

    return Object.entries(stats)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, limit)
        .map(([topic, failures]) => ({ topic, failures }));
}