import { detectPlatformFromUrl, PARSE_MESSAGE_TYPES, platformLabel } from "./utils/platform.js";

const status = document.getElementById("status");
const uploadButton = document.getElementById("upload");
const repositorySelect = document.getElementById("repository");
const repositoryLabel = document.getElementById("repositoryLabel");

let activeTab = null;
let activePlatform = "";

init();

document.getElementById("connect").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

uploadButton.addEventListener("click", () => {
    if (!activeTab || !activePlatform) {
        finish("Open a LeetCode, Codeforces, or CodeChef problem first.");
        return;
    }

    uploadButton.disabled = true;
    setStatus("Extracting accepted solution...");

    chrome.runtime.sendMessage(
        {
            type: "SEND_TO_TAB",
            tabId: activeTab.id,
            payload: { type: PARSE_MESSAGE_TYPES[activePlatform] }
        },
        (response) => {
            if (!response?.success) {
                finish(response?.error || "Could not read this page.");
                return;
            }

            if (response.data?.error) {
                finish(response.data.error);
                return;
            }

            uploadParsedSolution(response.data);
        }
    );
});

async function init() {
    const settings = await chrome.storage.local.get(["token"]);
    setStatus(settings.token ? "GitHub Connected" : "GitHub Not Connected");

    chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB" }, (tab) => {
        activeTab = tab;
        activePlatform = detectPlatformFromUrl(tab?.url || "");

        if (!activePlatform) {
            setRepositoryState([], "");
            setStatus("Open a supported problem page.");
            uploadButton.disabled = true;
            return;
        }

        loadRepositories(activePlatform);
    });
}

function loadRepositories(platform) {
    chrome.runtime.sendMessage(
        {
            type: "GET_PLATFORM_REPOSITORIES",
            platform
        },
        (response) => {
            if (!response?.success) {
                setRepositoryState([], "");
                setStatus(response?.error || "Could not load repositories.");
                uploadButton.disabled = true;
                return;
            }

            const repositories = response.data.repositories || [];
            setRepositoryState(repositories, response.data.selectedRepository);
            repositoryLabel.textContent = `${platformLabel(platform)} Repository`;
            uploadButton.disabled = repositories.length === 0;

            if (!repositories.length)
                setStatus(`Assign a ${platformLabel(platform)} repository in Settings.`);
        }
    );
}

function setRepositoryState(repositories, selectedRepository) {
    repositorySelect.innerHTML = "";

    if (!repositories.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No repositories assigned";
        repositorySelect.appendChild(option);
        return;
    }

    repositories.forEach((repository) => {
        const option = document.createElement("option");
        option.value = repository;
        option.textContent = repository;
        repositorySelect.appendChild(option);
    });

    repositorySelect.value = selectedRepository && repositories.includes(selectedRepository)
        ? selectedRepository
        : repositories[0];
}

function uploadParsedSolution(problem) {
    setStatus("Uploading to GitHub...");

    chrome.runtime.sendMessage(
        {
            type: "UPLOAD_SOLUTION",
            problem,
            repository: repositorySelect.value,
            force: true
        },
        (response) => {
            if (!response?.success) {
                finish(response?.error || "Upload failed.");
                return;
            }

            const result = response.data;

            if (result.skipped) {
                finish(result.reason || "Already uploaded");
                return;
            }

            finish(`Uploaded ${result.owner}/${result.repo}`);
            alert(`Uploaded to ${result.owner}/${result.repo}/${result.path}`);
        }
    );
}

function setStatus(text) {
    status.textContent = text;
}

function finish(message) {
    uploadButton.disabled = false;
    setStatus(message);

    if (!message.startsWith("Uploaded"))
        alert(message);
}
