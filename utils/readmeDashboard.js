const DASHBOARD_START = "<!-- CP_SYNC_DASHBOARD_START -->";
const DASHBOARD_END = "<!-- CP_SYNC_DASHBOARD_END -->";
const TABLE_START = "<!-- CP_SYNC_TABLE_START -->";
const TABLE_END = "<!-- CP_SYNC_TABLE_END -->";

export function buildReadmeDashboard(entries, generatedAt = new Date()) {
    const normalized = normalizeEntries(entries);
    const stats = buildStats(normalized);
    const languageRows = renderCountRows(stats.languages);
    const platformRows = renderCountRows(stats.platforms);
    const problemRows = normalized
        .sort(compareEntries)
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

    return `# CP Sync Dashboard

Auto-generated summary of competitive programming solutions synced by CP Sync.

## Overview

| Total Solved | Easy | Medium | Hard |
| ---: | ---: | ---: | ---: |
| ${stats.total} | ${stats.easy} | ${stats.medium} | ${stats.hard} |

## Languages

| Language | Problems |
| --- | ---: |
${languageRows}

## Platforms

| Platform | Problems |
| --- | ---: |
${platformRows}

## Last Updated

${formatTimestamp(generatedAt)}

## Uploaded Problems

${TABLE_START}
| Platform | Problem | Difficulty | Language | Topic | Contest | Solution | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
${problemRows}
${TABLE_END}
`;
}

export function mergeReadmeDashboard(existingReadme = "", entries, generatedAt = new Date()) {
    const dashboard = wrapDashboard(buildReadmeDashboard(entries, generatedAt));
    const start = existingReadme.indexOf(DASHBOARD_START);
    const end = existingReadme.indexOf(DASHBOARD_END);

    if (start !== -1 && end !== -1 && end > start)
        return `${existingReadme.slice(0, start)}${dashboard}${existingReadme.slice(end + DASHBOARD_END.length)}`;

    const trimmed = existingReadme.trim();

    if (!trimmed)
        return dashboard;

    if (isLegacyCpSyncReadme(trimmed))
        return dashboard;

    return `${trimmed}\n\n${dashboard}\n`;
}

export function parseReadmeEntries(readme = "") {
    const start = readme.indexOf(TABLE_START);
    const end = readme.indexOf(TABLE_END);

    if (start === -1 || end === -1 || end <= start)
        return [];

    return readme
        .slice(start + TABLE_START.length, end)
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

        increment(stats.languages, normalizeLanguage(entry.language));
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
            language: normalizeLanguage(entry.language),
            topic: entry.topic || "",
            contest: entry.contest || "",
            url: entry.url || "",
            path: entry.path,
            notesPath: entry.notesPath || "",
            uploadedAt: entry.uploadedAt || ""
        });
    });

    return Array.from(byKey.values());
}

function renderCountRows(values) {
    return Object.entries(values)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => `| ${escapeCell(label)} | ${count} |`)
        .join("\n") || "| - | 0 |";
}

function compareEntries(a, b) {
    const platformCompare = a.platform.localeCompare(b.platform);

    if (platformCompare !== 0)
        return platformCompare;

    const difficultyCompare = difficultyRank(a.difficulty) - difficultyRank(b.difficulty);

    if (difficultyCompare !== 0)
        return difficultyCompare;

    return a.title.localeCompare(b.title);
}

function difficultyRank(value) {
    const difficulty = String(value || "").toLowerCase();

    if (difficulty === "easy") return 0;
    if (difficulty === "medium") return 1;
    if (difficulty === "hard") return 2;

    return 99;
}

function normalizeLanguage(language = "") {
    const value = String(language || "").trim();

    if (!value)
        return "Unknown";

    const lower = value.toLowerCase();

    if (lower.includes("python") || lower.includes("pypy"))
        return "Python";

    if (lower.includes("c++") || lower.includes("cpp") || lower.includes("gnu"))
        return "C++";

    if (lower === "c" || lower.includes("clang"))
        return "C";

    if (lower.includes("javascript") || lower.includes("node"))
        return "JavaScript";

    if (lower.includes("typescript"))
        return "TypeScript";

    if (lower.includes("java"))
        return "Java";

    if (lower.includes("kotlin"))
        return "Kotlin";

    if (lower.includes("c#"))
        return "C#";

    if (lower.includes("go"))
        return "Go";

    if (lower.includes("rust"))
        return "Rust";

    if (lower.includes("swift"))
        return "Swift";

    if (lower.includes("ruby"))
        return "Ruby";

    if (lower.includes("php"))
        return "PHP";

    return value;
}

function wrapDashboard(content) {
    return `${DASHBOARD_START}\n${content.trimEnd()}\n${DASHBOARD_END}\n`;
}

function isLegacyCpSyncReadme(readme) {
    return (readme.startsWith("# CP Sync") || readme.startsWith("# CP Sync Dashboard"))
        && readme.includes(TABLE_START);
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
