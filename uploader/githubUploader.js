import GitHubService from "../github/github.js";
import { entryKey, mergeReadmeDashboard, parseReadmeEntries } from "../utils/readmeDashboard.js";
import { rememberRepository } from "../utils/repositories.js";
import { buildNotesContent, buildSolutionContent, buildUploadPaths } from "../utils/uploadPaths.js";

export async function uploadSolution(problem, options = {}) {
    const settings = await chrome.storage.local.get([
        "token",
        "platformRepositories",
        "defaultRepositories",
        "lastUsedRepositories",
        "leetcodeRepo",
        "codeforcesRepo",
        "codechefRepo",
        "organizeBy",
        "repoVisibility"
    ]);

    if (!settings.token)
        throw new Error("GitHub Token Missing");

    validateProblem(problem, options);

    const repositoryRef = options.repository || selectRepository(problem.platform, settings);

    if (!repositoryRef)
        throw new Error(`Select a GitHub repository for ${platformLabel(problem.platform)} first.`);

    const { owner, repo } = parseRepositoryRef(repositoryRef);
    const github = new GitHubService(settings.token);

    await ensureRepository(github, owner, repo, settings, options);

    const pathInfo = buildUploadPaths(problem, settings);

    if (!problem.code?.trim()) {
        if (await isAlreadyStoredSolution(github, owner, repo, pathInfo.solutionPath, problem))
            return buildSkippedUpload(owner, repo, pathInfo.solutionPath, repositoryRef, problem);

        throw new Error("Could not extract solution code from the page.");
    }

    const solutionContent = buildSolutionContent(problem);
    const duplicate = await isIdenticalFile(github, owner, repo, pathInfo.solutionPath, solutionContent);

    if (duplicate)
        return buildSkippedUpload(owner, repo, pathInfo.solutionPath, repositoryRef, problem);

    await github.createOrUpdateFile(
        owner,
        repo,
        pathInfo.solutionPath,
        solutionContent,
        solutionCommitMessage(problem)
    );

    let notesPath = "";

    if (problem.notes?.trim()) {
        notesPath = pathInfo.notesPath;

        await github.createOrUpdateFile(
            owner,
            repo,
            notesPath,
            buildNotesContent(problem, pathInfo.solutionPath),
            notesCommitMessage(problem)
        );
    }

    await updateReadme(github, owner, repo, problem, pathInfo, notesPath);
    await rememberRepository(problem.platform, repositoryRef);
    await rememberUpload({
        ...problem,
        platform: platformLabel(problem.platform),
        path: pathInfo.solutionPath,
        notesPath,
        topic: pathInfo.topic,
        contest: pathInfo.contest,
        uploadedAt: new Date().toISOString()
    });

    return {
        owner,
        repo,
        path: pathInfo.solutionPath,
        notesPath,
        skipped: false
    };
}

function selectRepository(platform, settings) {
    const platformRepositories = settings.platformRepositories?.[platform] || [];
    const lastUsed = settings.lastUsedRepositories?.[platform];
    const defaultRepository = settings.defaultRepositories?.[platform];
    const legacyRepository = settings[`${platform}Repo`];

    if (lastUsed && platformRepositories.includes(lastUsed))
        return lastUsed;

    if (defaultRepository && platformRepositories.includes(defaultRepository))
        return defaultRepository;

    if (platformRepositories.length)
        return platformRepositories[0];

    return legacyRepository || "";
}

async function ensureRepository(github, owner, repo, settings, options) {
    try {
        await github.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    }
    catch (error) {
        if (!/not found/i.test(error.message) || options.createRepository === false)
            throw error;

        await github.createRepository(repo, {
            private: settings.repoVisibility !== "public"
        });
    }
}

async function isIdenticalFile(github, owner, repo, path, content) {
    try {
        const existing = await github.getFileContent(owner, repo, path);

        return existing.content.trim() === content.trim();
    }
    catch {
        return false;
    }
}

async function isAlreadyStoredSolution(github, owner, repo, path, problem) {
    if (await isInUploadHistory(problem))
        return true;

    return fileExists(github, owner, repo, path);
}

async function fileExists(github, owner, repo, path) {
    try {
        await github.getFileContent(owner, repo, path);
        return true;
    }
    catch {
        return false;
    }
}

async function isInUploadHistory(problem) {
    const stored = await chrome.storage.local.get(["uploadHistory"]);
    const history = Array.isArray(stored.uploadHistory) ? stored.uploadHistory : [];
    const slug = problem.slug;
    const labels = new Set([
        platformLabel(problem.platform),
        problem.platform
    ]);

    return history.some((item) => item.slug === slug && labels.has(item.platform));
}

async function buildSkippedUpload(owner, repo, path, repositoryRef, problem) {
    await rememberRepository(problem.platform, repositoryRef);

    return {
        owner,
        repo,
        path,
        skipped: true,
        reason: "Already uploaded"
    };
}

async function updateReadme(github, owner, repo, problem, pathInfo, notesPath) {
    const readmePath = "README.md";
    let existing = "";

    try {
        existing = (await github.getFileContent(owner, repo, readmePath)).content;
    }
    catch {
        existing = "";
    }

    const entries = parseReadmeEntries(existing);
    const nextEntry = {
        platform: platformLabel(problem.platform),
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty || "",
        language: problem.language || "",
        topic: pathInfo.topic || "",
        contest: pathInfo.contest || "",
        url: problem.url,
        path: pathInfo.solutionPath,
        notesPath,
        uploadedAt: new Date().toISOString()
    };
    const merged = new Map(entries.map((entry) => [entryKey(entry), entry]));

    merged.set(entryKey(nextEntry), nextEntry);

    await github.createOrUpdateFile(
        owner,
        repo,
        readmePath,
        mergeReadmeDashboard(existing, Array.from(merged.values())),
        "README: Update statistics"
    );
}

async function rememberUpload(entry) {
    const stored = await chrome.storage.local.get(["uploadHistory"]);
    const history = Array.isArray(stored.uploadHistory) ? stored.uploadHistory : [];
    const key = `${entry.platform}:${entry.slug}`;
    const filtered = history.filter((item) => `${item.platform}:${item.slug}` !== key);

    filtered.unshift(entry);

    await chrome.storage.local.set({
        uploadHistory: filtered.slice(0, 500)
    });
}

function validateProblem(problem, options = {}) {
    if (!problem)
        throw new Error("No problem data found.");

    if (!problem.platform || !["leetcode", "codeforces", "codechef"].includes(problem.platform))
        throw new Error("Unsupported platform.");

    if (!problem.title || !problem.slug || !problem.url)
        throw new Error("Could not identify the current problem.");

    if (problem.accepted === false)
        throw new Error("The current page does not show an accepted solution yet.");

    if (!problem.code?.trim() && options.force !== true)
        throw new Error("Could not extract solution code from the page.");
}

function parseRepositoryRef(repositoryRef) {
    const [owner, repo] = repositoryRef.split("/");

    if (!owner || !repo)
        throw new Error("Saved repository setting is invalid. Reload repositories in options.");

    return { owner, repo };
}

function solutionCommitMessage(problem) {

    const contest =
        problem.contest &&
        typeof problem.contest === "object" &&
        problem.contest.isContest
            ? problem.contest.name
            : "";

    if (contest) {

        return `${platformLabel(problem.platform)}: ${contest} - ${problem.title}`;

    }

    return `${platformLabel(problem.platform)}: Solve ${problem.title}`;

}

function notesCommitMessage(problem) {

    const contest =
        problem.contest &&
        typeof problem.contest === "object" &&
        problem.contest.isContest
            ? problem.contest.name
            : "";

    if (contest) {

        return `${platformLabel(problem.platform)}: Notes for ${contest} - ${problem.title}`;

    }

    return `${platformLabel(problem.platform)}: Add notes for ${problem.title}`;

}

function platformLabel(platform) {
    return {
        leetcode: "LeetCode",
        codeforces: "Codeforces",
        codechef: "CodeChef"
    }[platform] || platform;
}
