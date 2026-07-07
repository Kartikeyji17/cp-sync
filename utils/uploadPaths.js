export const ORGANIZE_OPTIONS = {
    platform: "platform",
    difficulty: "difficulty",
    topic: "topic",
    platformDifficulty: "platform-difficulty",
    platformTopic: "platform-topic",
    platformTopicDifficulty: "platform-topic-difficulty"
};

export function buildUploadPaths(problem, settings = {}) {
    const fileName = `${sanitizePathPart(problem.title || problem.slug)}.${extensionFor(problem.language)}`;
    const contestName = detectContestName(problem);
    const topic = primaryTopic(problem);

    if (contestName) {
        return {
            solutionPath: ["Contests", sanitizePathPart(contestName), fileName].join("/"),
            notesPath: ["Contests", sanitizePathPart(contestName), "README.md"].join("/"),
            topic,
            contest: contestName
        };
    }

    const organizeBy = settings.organizeBy || ORGANIZE_OPTIONS.platform;
    const difficulty = sanitizePathPart(problem.difficulty || "Uncategorized");
    const platform = platformLabel(problem.platform);
    const topicFolder = sanitizePathPart(topic || "General");
    let folders = [];

    if (organizeBy === ORGANIZE_OPTIONS.platform)
        folders = [platform];
    else if (organizeBy === ORGANIZE_OPTIONS.difficulty)
        folders = [difficulty];
    else if (organizeBy === ORGANIZE_OPTIONS.topic)
        folders = [topicFolder];
    else if (organizeBy === ORGANIZE_OPTIONS.platformDifficulty)
        folders = [platform, difficulty];
    else if (organizeBy === ORGANIZE_OPTIONS.platformTopic)
        folders = [platform, topicFolder];
    else if (organizeBy === ORGANIZE_OPTIONS.platformTopicDifficulty)
        folders = [platform, topicFolder, difficulty];
    else
        folders = [platform];

    return {
        solutionPath: [...folders, fileName].join("/"),
        notesPath: [...folders, "README.md"].join("/"),
        topic,
        contest: ""
    };
}

export function buildSolutionContent(problem) {
    const header = [
        `// Title: ${problem.title}`,
        `// Platform: ${platformLabel(problem.platform)}`,
        `// URL: ${problem.url}`,
        `// Language: ${problem.language || "Unknown"}`,
        ""
    ].join("\n");

    return `${header}${problem.code.trim()}\n`;
}

export function buildNotesContent(problem, solutionPath) {
    return `# ${problem.title}

Platform: ${platformLabel(problem.platform)}

Solution: [${solutionPath}](${encodeURI(solutionPath)})

## Notes

${problem.notes?.trim() || "No notes added."}
`;
}

export function detectContestName(problem) {
    const raw = problem.contest || "";

    if (raw)
        return raw;

    const text = `${problem.title || ""} ${problem.url || ""}`;
    const patterns = [
        /weekly-contest-(\d+)/i,
        /biweekly-contest-(\d+)/i,
        /Codeforces Round #[\d()A-Za-z -]+/i,
        /Educational Codeforces Round [\d()A-Za-z -]+/i,
        /Starters\s*\d+/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match)
            return normalizeContestName(match[0]);
    }

    return "";
}

export function primaryTopic(problem) {
    const tags = Array.isArray(problem.tags)
        ? problem.tags
        : String(problem.tags || "").split(",");

    return normalizeTopic(tags.find(Boolean) || "");
}

export function sanitizePathPart(value) {
    return String(value || "solution")
        .trim()
        .replace(/[<>:"\\|?*\u0000-\u001F]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^\.+|\.+$/g, "")
        .slice(0, 120) || "solution";
}

function normalizeContestName(value) {
    return String(value)
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\bweekly contest\b/i, "Weekly Contest")
        .replace(/\bbiweekly contest\b/i, "Biweekly Contest");
}

function normalizeTopic(value) {
    const normalized = String(value || "").trim();
    const aliases = {
        "dynamic programming": "DP",
        dp: "DP",
        array: "Arrays",
        arrays: "Arrays",
        graph: "Graphs",
        graphs: "Graphs",
        greedy: "Greedy",
        "binary search": "Binary Search",
        tree: "Trees",
        trees: "Trees",
        backtracking: "Backtracking"
    };

    return aliases[normalized.toLowerCase()] || titleCase(normalized);
}

function titleCase(value) {
    return String(value || "General")
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function extensionFor(language = "") {
    const normalized = language.toLowerCase();

    if (normalized.includes("python")) return "py";
    if (normalized.includes("javascript")) return "js";
    if (normalized.includes("typescript")) return "ts";
    if (normalized.includes("java")) return "java";
    if (normalized.includes("c++") || normalized.includes("cpp") || normalized.includes("gnu")) return "cpp";
    if (normalized === "c" || normalized.includes("clang")) return "c";
    if (normalized.includes("c#")) return "cs";
    if (normalized.includes("go")) return "go";
    if (normalized.includes("rust")) return "rs";
    if (normalized.includes("kotlin")) return "kt";
    if (normalized.includes("swift")) return "swift";
    if (normalized.includes("ruby")) return "rb";
    if (normalized.includes("php")) return "php";

    return "txt";
}

function platformLabel(platform) {
    return {
        leetcode: "LeetCode",
        codeforces: "Codeforces",
        codechef: "CodeChef"
    }[platform] || platform;
}
