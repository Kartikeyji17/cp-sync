export function buildReadmeDashboard(entries, generatedAt = new Date()) {
    const normalized = normalizeEntries(entries);
    const stats = buildStats(normalized);
    const languageRows = Object.entries(stats.languages)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([language, count]) => `| ${escapeCell(language)} | ${count} |`)
        .join("\n") || "| - | 0 |";
    const platformRows = Object.entries(stats.platforms)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([platform, count]) => `| ${escapeCell(platform)} | ${count} |`)
        .join("\n") || "| - | 0 |";
    const problemRows = normalized
        .sort((a, b) => `${a.platform} ${a.title}`.localeCompare(`${b.platform} ${b.title}`))
        .map((entry) => [
            escapeCell(entry.platform),
            `[${escapeCell(entry.title)}](${entry.url})`,
            escapeCell(entry.difficulty || "-"),
            escapeCell(entry.language || "-"),
            escapeCell(entry.topic || "-"),
            escapeCell(entry.contest || "-"),
            `[Solution](${encodeURI(entry.path)})`,
            entry.notesPath ? `[Notes](${encodeURI(entry.notesPath)})` : "-"
        ].join(" | "))
        .map((row) => `| ${row} |`)
        .join("\n") || "| - | - | - | - | - | - | - | - |";

    return `# CP Sync

## Statistics

| Metric | Count |
| --- | ---: |
| Total Solved | ${stats.total} |
| Easy | ${stats.easy} |
| Medium | ${stats.medium} |
| Hard | ${stats.hard} |

## Languages

| Language | Count |
| --- | ---: |
${languageRows}

## Platform

| Platform | Count |
| --- | ---: |
${platformRows}

## Last Updated

${formatTimestamp(generatedAt)}

## Uploaded Problems

<!-- CP_SYNC_TABLE_START -->
| Platform | Problem | Difficulty | Language | Topic | Contest | Solution | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
${problemRows}
<!-- CP_SYNC_TABLE_END -->
`;
}

export function parseReadmeEntries(readme = "") {
    const startMarker = "<!-- CP_SYNC_TABLE_START -->";
    const endMarker = "<!-- CP_SYNC_TABLE_END -->";
    const start = readme.indexOf(startMarker);
    const end = readme.indexOf(endMarker);

    if (start === -1 || end === -1 || end <= start)
        return [];

    return readme
        .slice(start + startMarker.length, end)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("|") && !line.includes("---"))
        .map((line) => splitMarkdownRow(line))
        .filter((cells) => cells.length >= 7 && cells[0] !== "Platform")
        .map((cells) => ({
            platform: cells[0],
            title: extractMarkdownText(cells[1]),
            difficulty: dashToEmpty(cells[2]),
            language: dashToEmpty(cells[3]),
            topic: dashToEmpty(cells[4]),
            contest: dashToEmpty(cells[5]),
            url: extractMarkdownUrl(cells[1]),
            path: extractMarkdownUrl(cells[6]),
            notesPath: cells[7] ? dashToEmpty(extractMarkdownUrl(cells[7])) : ""
        }));
}

export function entryKey(entry) {
    return `${entry.platform}:${entry.slug || slugFromPath(entry.path) || entry.title}`;
}

function buildStats(entries) {
    return entries.reduce((stats, entry) => {
        stats.total += 1;
        const difficulty = String(entry.difficulty || "").toLowerCase();

        if (difficulty === "easy") stats.easy += 1;
        if (difficulty === "medium") stats.medium += 1;
        if (difficulty === "hard") stats.hard += 1;

        increment(stats.languages, entry.language || "Unknown");
        increment(stats.platforms, entry.platform || "Unknown");

        return stats;
    }, {
        total: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        languages: {},
        platforms: {}
    });
}

function normalizeEntries(entries) {
    const byKey = new Map();

    entries.forEach((entry) => {
        if (!entry?.title || !entry?.path)
            return;

        byKey.set(entryKey(entry), {
            platform: entry.platform || "Unknown",
            title: entry.title,
            slug: entry.slug || slugFromPath(entry.path),
            difficulty: entry.difficulty || "",
            language: entry.language || "",
            topic: entry.topic || "",
            contest: entry.contest || "",
            url: entry.url || "",
            path: entry.path,
            notesPath: entry.notesPath || ""
        });
    });

    return Array.from(byKey.values());
}

function splitMarkdownRow(line) {
    return line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
}

function increment(target, key) {
    target[key] = (target[key] || 0) + 1;
}

function slugFromPath(path = "") {
    return path
        .split("/")
        .pop()
        ?.replace(/\.[^.]+$/, "") || "";
}

function formatTimestamp(date) {
    return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function extractMarkdownUrl(value) {
    const match = String(value).match(/\]\(([^)]+)\)/);
    return match ? match[1] : value;
}

function extractMarkdownText(value) {
    const match = String(value).match(/\[([^\]]+)\]/);
    return match ? match[1] : value;
}

function dashToEmpty(value) {
    return value === "-" ? "" : value;
}

function escapeCell(value) {
    return String(value || "").replace(/\|/g, "\\|");
}
