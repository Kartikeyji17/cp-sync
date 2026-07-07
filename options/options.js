import GitHubService from "../github/github.js";
import { PLATFORM_LABELS, PLATFORMS } from "../utils/platform.js";
import { getRepositorySettings, normalizePlatformMap, saveRepositorySettings } from "../utils/repositories.js";

const tokenInput = document.getElementById("token");
const repositoryTable = document.getElementById("repositoryTable");
const repoStatus = document.getElementById("repoStatus");
const autoUploadMode = document.getElementById("autoUploadMode");
const defaultSelects = {
    leetcode: document.getElementById("leetcodeDefaultRepo"),
    codeforces: document.getElementById("codeforcesDefaultRepo"),
    codechef: document.getElementById("codechefDefaultRepo")
};

let fetchedRepositories = [];
let platformRepositories = normalizePlatformMap();
let defaultRepositories = {};

loadSavedSettings();

Object.entries(defaultSelects).forEach(([platform, select]) => {
    select.addEventListener("change", () => {
        defaultRepositories[platform] = select.value;
    });
});

document.getElementById("fetchRepos").addEventListener("click", async () => {
    try {
        const token = tokenInput.value.trim();

        if (!token) {
            alert("Enter GitHub Token");
            return;
        }

        repoStatus.textContent = "Loading repositories...";

        const github = new GitHubService(token);
        const user = await github.getUser();
        fetchedRepositories = await github.getRepositories();
        await chrome.storage.local.set({ fetchedRepositories });

        renderRepositoryTable();
        renderDefaultSelectors();

        repoStatus.textContent = `Loaded ${fetchedRepositories.length} repositories for ${user.login}.`;
    }
    catch (error) {
        console.error(error);
        repoStatus.textContent = "Could not load repositories.";
        alert(error.message || "Invalid GitHub Token");
    }
});

document.getElementById("save").addEventListener("click", async () => {
    const nextPlatformRepositories = readPlatformRepositoryAssignments();
    const nextDefaultRepositories = readDefaultRepositories(nextPlatformRepositories);
    const current = await getRepositorySettings();

    await chrome.storage.local.set({
        token: tokenInput.value.trim(),
        autoUploadMode: autoUploadMode.value
    });

    await saveRepositorySettings({
        platformRepositories: nextPlatformRepositories,
        defaultRepositories: nextDefaultRepositories,
        lastUsedRepositories: current.lastUsedRepositories
    });

    platformRepositories = nextPlatformRepositories;
    defaultRepositories = nextDefaultRepositories;
    renderDefaultSelectors();

    alert("Settings saved successfully.");
});

async function loadSavedSettings() {
    const [settings, repositories] = await Promise.all([
        chrome.storage.local.get(["token", "autoUploadMode", "fetchedRepositories"]),
        getRepositorySettings()
    ]);

    tokenInput.value = settings.token || "";
    autoUploadMode.value = normalizeUploadMode(settings.autoUploadMode);
    fetchedRepositories = Array.isArray(settings.fetchedRepositories) ? settings.fetchedRepositories : [];
    platformRepositories = repositories.platformRepositories;
    defaultRepositories = repositories.defaultRepositories;

    renderRepositoryTable();
    renderDefaultSelectors();
}

function renderRepositoryTable() {
    const allRepositories = mergedRepositoryNames();

    if (!allRepositories.length) {
        repositoryTable.innerHTML = '<div class="empty-state">Load repositories, or save existing assignments to see them here.</div>';
        return;
    }

    repositoryTable.innerHTML = `
        <div class="table-row table-head">
            <span>Repository</span>
            ${PLATFORMS.map((platform) => `<span>${PLATFORM_LABELS[platform]}</span>`).join("")}
        </div>
        ${allRepositories.map((repository) => repositoryRow(repository)).join("")}
    `;

    repositoryTable.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            platformRepositories = readPlatformRepositoryAssignments();
            renderDefaultSelectors();
        });
    });
}

function repositoryRow(repository) {
    return `
        <div class="table-row">
            <span class="repo-name">${repository}</span>
            ${PLATFORMS.map((platform) => `
                <label class="check-cell" title="Assign ${repository} to ${PLATFORM_LABELS[platform]}">
                    <input
                        type="checkbox"
                        data-platform="${platform}"
                        data-repository="${repository}"
                        ${platformRepositories[platform]?.includes(repository) ? "checked" : ""}
                    >
                </label>
            `).join("")}
        </div>
    `;
}

function renderDefaultSelectors() {
    PLATFORMS.forEach((platform) => {
        const select = defaultSelects[platform];
        const repositories = platformRepositories[platform] || [];
        const selected = repositories.includes(defaultRepositories[platform])
            ? defaultRepositories[platform]
            : repositories[0] || "";

        select.innerHTML = '<option value="">No repository selected</option>';

        repositories.forEach((repository) => {
            const option = document.createElement("option");
            option.value = repository;
            option.textContent = repository;
            select.appendChild(option);
        });

        select.value = selected;
        defaultRepositories[platform] = selected;
    });
}

function readPlatformRepositoryAssignments() {
    const assignments = normalizePlatformMap();

    repositoryTable.querySelectorAll("input[type='checkbox']:checked").forEach((checkbox) => {
        assignments[checkbox.dataset.platform].push(checkbox.dataset.repository);
    });

    return assignments;
}

function readDefaultRepositories(assignments) {
    return PLATFORMS.reduce((accumulator, platform) => {
        const selected = defaultSelects[platform].value;
        accumulator[platform] = assignments[platform].includes(selected)
            ? selected
            : assignments[platform][0] || "";

        return accumulator;
    }, {});
}

function mergedRepositoryNames() {
    const names = new Set(fetchedRepositories.map((repository) => repository.full_name).filter(Boolean));

    PLATFORMS.forEach((platform) => {
        platformRepositories[platform].forEach((repository) => names.add(repository));
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function normalizeUploadMode(value) {
    if (value === "ask" || value === "auto" || value === "manual")
        return value;

    return "manual";
}
