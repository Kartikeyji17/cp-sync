import GitHubService from "../github/github.js";

export async function uploadSolution(problem) {

    const settings = await chrome.storage.local.get([
        "token",
        "leetcodeRepo",
        "codeforcesRepo",
        "codechefRepo"
    ]);

    if (!settings.token)
        throw new Error("GitHub Token Missing");

    validateProblem(problem);

    const repositoryKey = `${problem.platform}Repo`;
    const repositoryRef = settings[repositoryKey];

    if (!repositoryRef)
        throw new Error(`Select a GitHub repository for ${platformLabel(problem.platform)} first.`);

    const { owner, repo } = parseRepositoryRef(repositoryRef);
    const github = new GitHubService(settings.token);
    const solutionPath = buildSolutionPath(problem);
    const solutionContent = buildSolutionContent(problem);

    await github.createOrUpdateFile(
        owner,
        repo,
        solutionPath,
        solutionContent,
        `Sync ${problem.platform}: ${problem.title}`
    );

    await updateReadme(github, owner, repo, problem, solutionPath);

    return {
        owner,
        repo,
        path: solutionPath
    };

}

function validateProblem(problem) {

    if (!problem)
        throw new Error("No problem data found.");

    if (!problem.platform || !["leetcode", "codeforces", "codechef"].includes(problem.platform))
        throw new Error("Unsupported platform.");

    if (!problem.title || !problem.slug || !problem.url)
        throw new Error("Could not identify the current problem.");

    if (!problem.code || !problem.code.trim())
        throw new Error("Could not extract solution code from the page.");

    if (problem.accepted === false)
        throw new Error("The current page does not show an accepted solution yet.");

}

function parseRepositoryRef(repositoryRef) {

    const [owner, repo] = repositoryRef.split("/");

    if (!owner || !repo)
        throw new Error("Saved repository setting is invalid. Reload repositories in options.");

    return { owner, repo };

}

function buildSolutionPath(problem) {

    const fileName = `${sanitizePathPart(problem.slug)}.${extensionFor(problem.language)}`;

    return [
        platformLabel(problem.platform),
        fileName
    ].join("/");

}

function buildSolutionContent(problem) {

    const header = [
        `// Title: ${problem.title}`,
        `// Platform: ${platformLabel(problem.platform)}`,
        `// URL: ${problem.url}`,
        `// Language: ${problem.language || "Unknown"}`,
        ""
    ].join("\n");

    return `${header}${problem.code.trim()}\n`;

}

async function updateReadme(github, owner, repo, problem, solutionPath) {

    const readmePath = "README.md";
    let existing = "";

    try {
        const file = await github.getFile(owner, repo, readmePath);
        existing = decodeBase64(file.content || "");
    }
    catch {
        existing = "";
    }

    const next = upsertReadmeEntry(existing, problem, solutionPath);

    await github.createOrUpdateFile(
        owner,
        repo,
        readmePath,
        next,
        `Update README for ${problem.title}`
    );

}

function upsertReadmeEntry(existing, problem, solutionPath) {

    const startMarker = "<!-- CP_SYNC_TABLE_START -->";
    const endMarker = "<!-- CP_SYNC_TABLE_END -->";
    const title = existing.trim()
        ? existing.trim()
        : "# Competitive Programming Solutions";

    const outside = title.includes(startMarker)
        ? `${title.slice(0, title.indexOf(startMarker)).trim()}\n\n`
        : `${title}\n\n`;

    const rows = parseExistingRows(existing, startMarker, endMarker);
    const key = `${problem.platform}:${problem.slug}`;

    rows.set(key, {
        platform: platformLabel(problem.platform),
        title: problem.title,
        difficulty: problem.difficulty || "",
        language: problem.language || "",
        url: problem.url,
        path: solutionPath
    });

    const tableRows = Array.from(rows.values())
        .sort((a, b) => `${a.platform} ${a.title}`.localeCompare(`${b.platform} ${b.title}`))
        .map((row) => `| ${row.platform} | [${escapeCell(row.title)}](${row.url}) | ${escapeCell(row.difficulty || "-")} | ${escapeCell(row.language || "-")} | [Solution](${encodeURI(row.path)}) |`);

    return `${outside}${startMarker}
| Platform | Problem | Difficulty | Language | Solution |
| --- | --- | --- | --- | --- |
${tableRows.join("\n")}
${endMarker}
`;

}

function parseExistingRows(existing, startMarker, endMarker) {

    const rows = new Map();
    const start = existing.indexOf(startMarker);
    const end = existing.indexOf(endMarker);

    if (start === -1 || end === -1 || end <= start)
        return rows;

    const table = existing.slice(start + startMarker.length, end);

    table
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("|") && !line.includes("---"))
        .forEach((line) => {
            const cells = line
                .split("|")
                .slice(1, -1)
                .map((cell) => cell.trim());

            if (cells.length < 5 || cells[0] === "Platform")
                return;

            const url = extractMarkdownUrl(cells[1]);
            const path = extractMarkdownUrl(cells[4]);
            const slug = path
                .split("/")
                .pop()
                ?.replace(/\.[^.]+$/, "") || cells[1];
            const platform = cells[0].toLowerCase();

            rows.set(`${platform}:${slug}`, {
                platform: cells[0],
                title: extractMarkdownText(cells[1]),
                difficulty: cells[2] === "-" ? "" : cells[2],
                language: cells[3] === "-" ? "" : cells[3],
                url,
                path
            });
        });

    return rows;

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

function sanitizePathPart(value) {

    return String(value || "solution")
        .trim()
        .replace(/[<>:"\\|?*\u0000-\u001F]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^\.+|\.+$/g, "")
        .slice(0, 120) || "solution";

}

function decodeBase64(content) {

    const cleaned = content.replace(/\s/g, "");
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);

}

function extractMarkdownUrl(value) {

    const match = value.match(/\]\(([^)]+)\)/);
    return match ? match[1] : value;

}

function extractMarkdownText(value) {

    const match = value.match(/\[([^\]]+)\]/);
    return match ? match[1] : value;

}

function escapeCell(value) {

    return String(value).replace(/\|/g, "\\|");

}
