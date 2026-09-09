import { detectPlatformFromUrl, PARSE_MESSAGE_TYPES, platformLabel } from "./utils/platform.js";
import { recordAttempt } from "./utils/attempts.js";

const status = document.getElementById("status");
const uploadButton = document.getElementById("upload");
const repositorySelect = document.getElementById("repository");
const repositoryLabel = document.getElementById("repositoryLabel");
const statusBadge = document.getElementById("statusBadge");
const captureEditor = document.getElementById("captureEditor");
const captureTitle = document.getElementById("captureTitle");
const captureLanguage = document.getElementById("captureLanguage");
const captureCode = document.getElementById("captureCode");
const captureNotes = document.getElementById("captureNotes");
const captureApproach = document.getElementById("captureApproach");
const captureComplexity = document.getElementById("captureComplexity");
const captureEditorialUrl = document.getElementById("captureEditorialUrl");
const confirmCapture = document.getElementById("confirmCapture");

let pendingProblem = null;

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
        async (response) => {
            if (!response?.success) {
                finish(response?.error || "Could not read this page.");
                return;
            }

            if (response.data?.error) {
                finish(response.data.error);
                return;
            }

            if (response.data?.accepted === false)
                await recordAttempt(response.data);

            pendingProblem = response.data;
            openCaptureEditor(pendingProblem);
            const diagnostics = captureDiagnostics(pendingProblem);

            const blockingMissing = diagnostics.missing.filter((field) =>
                ["title", "slug", "url", "code"].includes(field)
            );

            if (blockingMissing.length) {
                finish(`Capture incomplete: missing ${diagnostics.missing.join(", ")}.`);
                return;
            }

            return;
        }
    );
});

confirmCapture.addEventListener("click", () => {
    if (!pendingProblem)
        return;

    const problem = {
        ...pendingProblem,
        title: captureTitle.value.trim(),
        language: captureLanguage.value.trim(),
        code: captureCode.value,
        notes: captureNotes.value,
        approach: captureApproach.value,
        complexity: captureComplexity.value.trim(),
        editorialUrl: captureEditorialUrl.value.trim()
    };
    const diagnostics = captureDiagnostics(problem);
    const blockingMissing = diagnostics.missing.filter((field) =>
        ["title", "slug", "url", "code"].includes(field)
    );

    if (blockingMissing.length) {
        setStatus(`Capture incomplete: missing ${blockingMissing.join(", ")}.`);
        return;
    }

    pendingProblem = problem;
    captureEditor.hidden = true;
    uploadParsedSolution(problem);
});

async function init() {
    const settings = await chrome.storage.local.get(["token"]);
    setConnectionStatus(Boolean(settings.token));
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

function openCaptureEditor(problem) {
    captureTitle.value = problem.title || "";
    captureLanguage.value = problem.language || "";
    captureCode.value = problem.code || "";
    captureNotes.value = problem.notes || "";
    captureApproach.value = problem.approach || "";
    captureComplexity.value = problem.complexity || "";
    captureEditorialUrl.value = problem.editorialUrl || "";
    captureEditor.hidden = false;
    setStatus("Review the captured solution before uploading.");
}

function captureDiagnostics(problem) {
    const missing = [];

    ["title", "slug", "url", "language", "code"].forEach((field) => {
        if (!problem?.[field] || (field === "code" && !problem[field].trim()))
            missing.push(field);
    });

    return {
        missing,
        confidence: Math.max(0, 1 - missing.length / 5)
    };
}

function setConnectionStatus(connected) {
    statusBadge.textContent = connected ? "Connected" : "Not Connected";
    statusBadge.classList.toggle("connected", connected);
    statusBadge.classList.toggle("disconnected", !connected);
}

function finish(message) {
    uploadButton.disabled = false;
    setStatus(message);

    if (!message.startsWith("Uploaded"))
        alert(message);
}
