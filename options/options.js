import GitHubService from "../github/github.js";
import { PLATFORM_LABELS, PLATFORMS } from "../utils/platform.js";
import { getRepositorySettings, normalizePlatformMap, saveRepositorySettings } from "../utils/repositories.js";
import { getUploadJobs } from "../utils/uploadJobs.js";
import { buildBackup, parseBackup } from "../utils/backup.js";
import { getReviewRecords, markReviewed, saveReviewRecord } from "../utils/reviews.js";
import { getAllPlatformCapabilities } from "../utils/platformCapabilities.js";
import { buildWeakTopicStats } from "../utils/learningAnalytics.js";
import { clearLocalData } from "../utils/privacy.js";
import { safeExternalUrl } from "../utils/urls.js";
import { buildRedoQueue } from "../utils/recommendations.js";

const tokenInput = document.getElementById("token");
const repositoryTable = document.getElementById("repositoryTable");
const repoStatus = document.getElementById("repoStatus");
const autoUploadMode = document.getElementById("autoUploadMode");
const organizeBy = document.getElementById("organizeBy");
const repoVisibility = document.getElementById("repoVisibility");
const defaultSelects = {
    leetcode: document.getElementById("leetcodeDefaultRepo"),
    codeforces: document.getElementById("codeforcesDefaultRepo"),
    codechef: document.getElementById("codechefDefaultRepo")
};

const totalSolved=document.getElementById("totalSolved");
const easySolved=document.getElementById("easySolved");
const mediumSolved=document.getElementById("mediumSolved");
const hardSolved=document.getElementById("hardSolved");
const contestSolved=document.getElementById("contestSolved");
const failedAttempts=document.getElementById("failedAttempts");
const currentStreak=document.getElementById("currentStreak");
const longestStreak=document.getElementById("longestStreak");

const recentUploads=document.querySelector("#recentUploads tbody");
const historySearch=document.getElementById("historySearch");
const attemptHistory=document.querySelector("#attemptHistory tbody");
const uploadJobs=document.querySelector("#uploadJobs tbody");
const jobSearch=document.getElementById("jobSearch");
const jobStateFilter=document.getElementById("jobStateFilter");

const platformChart=document.getElementById("platformChart");
const languageChart=document.getElementById("languageChart");
const difficultyChart=document.getElementById("difficultyChart");
const reviewQueue=document.getElementById("reviewQueue");
const platformCapabilities=document.getElementById("platformCapabilities");
const weakTopics=document.getElementById("weakTopics");
const redoQueue=document.getElementById("redoQueue");

let fetchedRepositories = [];
let platformRepositories = normalizePlatformMap();
let defaultRepositories = {};
let uploadJobItems = [];
let uploadHistoryItems = [];

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

document.getElementById("exportBackup").addEventListener("click", async () => {
    const confirmed = confirm("The backup includes your saved GitHub token. Store the exported file securely.");

    if (!confirmed)
        return;

    const storage = await chrome.storage.local.get();
    const backup = buildBackup(storage);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `cp-sync-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
});

document.getElementById("importBackup").addEventListener("click", () => {
    document.getElementById("backupFile").click();
});

document.getElementById("backupFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file)
        return;

    try {
        const backup = parseBackup(JSON.parse(await file.text()));
        const confirmed = confirm("Importing will replace matching local CP Sync settings, history, and jobs. Continue?");

        if (!confirmed)
            return;

        await chrome.storage.local.set(backup);
        alert("Backup imported. Reloading settings.");
        location.reload();
    }
    catch (error) {
        alert(error.message || "Could not import backup.");
    }
    finally {
        event.target.value = "";
    }
});

document.getElementById("clearLocalData").addEventListener("click", async () => {
    const confirmed = confirm("This will delete the GitHub token, repositories, upload history, jobs, reviews, and attempts from this browser.");

    if (!confirmed || !confirm("Delete all CP Sync local data now?"))
        return;

    await clearLocalData();
    alert("CP Sync local data cleared.");
    location.reload();
});

document.getElementById("save").addEventListener("click", async () => {
    const nextPlatformRepositories = readPlatformRepositoryAssignments();
    const nextDefaultRepositories = readDefaultRepositories(nextPlatformRepositories);
    const current = await getRepositorySettings();

    await chrome.storage.local.set({
        token: tokenInput.value.trim(),
        autoUploadMode: autoUploadMode.value,
        organizeBy: organizeBy.value,
        repoVisibility: repoVisibility.value
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
        chrome.storage.local.get(["token", "autoUploadMode", "fetchedRepositories", "organizeBy", "repoVisibility"]),
        getRepositorySettings()
    ]);

    tokenInput.value = settings.token || "";
    autoUploadMode.value = normalizeUploadMode(settings.autoUploadMode);
    organizeBy.value = settings.organizeBy || "platform";
    repoVisibility.value = settings.repoVisibility === "public" ? "public" : "private";
    fetchedRepositories = Array.isArray(settings.fetchedRepositories) ? settings.fetchedRepositories : [];
    platformRepositories = repositories.platformRepositories;
    defaultRepositories = repositories.defaultRepositories;

    renderRepositoryTable();
    renderDefaultSelectors();
    renderPlatformCapabilities();
    await renderDashboard();
    await renderUploadJobs();
    await renderReviewQueue();
}

function renderPlatformCapabilities() {
    platformCapabilities.innerHTML = Object.values(getAllPlatformCapabilities())
        .map((capability) => `
            <div class="capability-item">
                <strong>${escapeHtml(capability.name)}</strong>
                <span>${escapeHtml(capability.source)}</span>
                <small>Captures: ${escapeHtml(capability.fields.join(", "))}</small>
                <small>Submission metadata: ${capability.submissionMetadata ? "available" : "limited"}</small>
            </div>
        `)
        .join("");
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
            <span class="repo-name">${escapeHtml(repository)}</span>
            ${PLATFORMS.map((platform) => `
                <label class="check-cell" title="Assign ${escapeHtml(repository)} to ${escapeHtml(PLATFORM_LABELS[platform])}">
                    <input
                        type="checkbox"
                        data-platform="${platform}"
                        data-repository="${escapeHtml(repository)}"
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

async function renderDashboard(){

    const data=await chrome.storage.local.get(["uploadHistory", "attemptHistory"]);

    uploadHistoryItems=data.uploadHistory||[];
    const history=uploadHistoryItems;
    const attempts=data.attemptHistory||[];

    totalSolved.textContent=history.length;

    const diff={
        Easy:0,
        Medium:0,
        Hard:0
    };

    const platform={};

    const language={};

    let contests=0;

    history.forEach(item=>{

        diff[item.difficulty]=(diff[item.difficulty]||0)+1;

        platform[item.platform]=(platform[item.platform]||0)+1;

        language[item.language]=(language[item.language]||0)+1;

        if(item.contest)
            contests++;

    });

    easySolved.textContent=diff.Easy||0;
    mediumSolved.textContent=diff.Medium||0;
    hardSolved.textContent=diff.Hard||0;

    contestSolved.textContent=contests;
    failedAttempts.textContent=attempts.filter((attempt) => attempt.verdict === "failed").length;
    renderWeakTopics(attempts);
    renderRedoQueue(attempts);

    const streak=calculateStreak(history);

    currentStreak.textContent=streak.current;
    longestStreak.textContent=streak.longest;

    drawBarChart(platformChart,platform);

    drawBarChart(languageChart,language);

    drawBarChart(difficultyChart,diff);

    renderRecent(history);
    renderAttempts(attempts);

}

function renderWeakTopics(attempts) {
    const stats = buildWeakTopicStats(attempts);

    weakTopics.innerHTML = stats.length
        ? stats.map((item) => `
            <div class="weak-topic">
                <span>${escapeHtml(item.topic)}</span>
                <strong>${escapeHtml(item.failures)} failed</strong>
            </div>
        `).join("")
        : '<p class="empty-state">No failed-topic data yet.</p>';
}

function renderRedoQueue(attempts) {
    const queue = buildRedoQueue(attempts);

    redoQueue.innerHTML = queue.length
        ? queue.map((item) => `
            <div class="redo-item">
                <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${escapeHtml(item.platform)} · ${escapeHtml(item.topic)}</small>
                </div>
                ${safeExternalUrl(item.url)
                    ? `<a href="${escapeHtml(safeExternalUrl(item.url))}" target="_blank" rel="noreferrer">Open problem</a>`
                    : ""}
            </div>
        `).join("")
        : '<p class="empty-state">No failed problems to redo.</p>';
}

async function renderReviewQueue() {
    const records = (await getReviewRecords())
        .filter((record) => new Date(record.dueAt).getTime() <= Date.now())
        .slice(0, 20);

    reviewQueue.innerHTML = records.length
        ? records.map((record) => `
            <div class="review-item">
                <div>
                    <strong>${escapeHtml(record.title || record.slug)}</strong>
                    <small>${escapeHtml(record.platform)} · ${escapeHtml(record.repository || "local")}</small>
                </div>
                <textarea data-review-notes="${escapeHtml(record.id)}" rows="2" placeholder="What should you remember?">${escapeHtml(record.mistakes || "")}</textarea>
                <div class="review-actions">
                    ${["again", "hard", "good", "easy"].map((rating) => `
                        <button type="button" data-review-id="${escapeHtml(record.id)}" data-review-rating="${rating}">${rating}</button>
                    `).join("")}
                </div>
            </div>
        `).join("")
        : '<p class="empty-state">Nothing is due for review.</p>';
}

reviewQueue.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-review-id]");

    if (!button)
        return;

    const records = await getReviewRecords();
    const record = records.find((item) => item.id === button.dataset.reviewId);

    if (!record)
        return;

    const notes = reviewQueue.querySelector(`[data-review-notes="${CSS.escape(record.id)}"]`)?.value || "";

    await saveReviewRecord(markReviewed(record, button.dataset.reviewRating, notes));
    await renderReviewQueue();
});

function renderRecent(history){
    const query = historySearch.value.trim().toLowerCase();
    const filtered = history.filter((item) => [
        item.title,
        item.platform,
        item.language,
        item.difficulty,
        item.topic,
        item.contest
    ].some((value) => String(value || "").toLowerCase().includes(query)));

    recentUploads.innerHTML="";

    filtered
    .slice(0,50)
    .forEach(item=>{

        recentUploads.innerHTML+=`
        <tr>

        <td>${escapeHtml(item.title)}</td>

        <td>${escapeHtml(item.platform)}</td>

        <td>${escapeHtml(item.language)}</td>

        <td>${escapeHtml(item.difficulty)}</td>

        <td>${escapeHtml(new Date(item.uploadedAt).toLocaleDateString())}</td>

        </tr>
        `;

    });

}

historySearch.addEventListener("input", async () => {
    renderRecent(uploadHistoryItems);
    const data = await chrome.storage.local.get(["attemptHistory"]);
    renderAttempts(data.attemptHistory || []);
});

function renderAttempts(attempts) {
    const query = historySearch.value.trim().toLowerCase();
    const filtered = attempts
        .filter((item) => item.verdict === "failed")
        .filter((item) => [item.title, item.platform, item.language, item.slug]
            .some((value) => String(value || "").toLowerCase().includes(query)))
        .slice(0, 50);

    attemptHistory.innerHTML = filtered.map((item) => `
        <tr>
            <td>${escapeHtml(item.title || item.slug)}</td>
            <td>${escapeHtml(item.platform)}</td>
            <td>${escapeHtml(item.language)}</td>
            <td>${escapeHtml(new Date(item.capturedAt).toLocaleString())}</td>
        </tr>
    `).join("") || '<tr><td colspan="4">No failed attempts recorded.</td></tr>';
}

async function renderUploadJobs() {
    uploadJobItems = await getUploadJobs();
    renderFilteredUploadJobs();
}

function renderFilteredUploadJobs() {
    const query = jobSearch.value.trim().toLowerCase();
    const state = jobStateFilter.value;
    const jobs = uploadJobItems.filter((job) => {
        const matchesQuery = !query || [job.title, job.slug, job.repository]
            .some((value) => String(value || "").toLowerCase().includes(query));
        const matchesState = state === "all" || job.state === state;

        return matchesQuery && matchesState;
    });

    uploadJobs.innerHTML = jobs.length
        ? jobs.map((job) => `
            <tr>
                <td>${escapeHtml(job.title || job.slug || "Unknown problem")}</td>
                <td>${escapeHtml(job.repository || "-")}</td>
                <td>${escapeHtml(formatJobStatus(job))}</td>
                <td>${escapeHtml(job.attempts)}</td>
                <td>${renderCommitLinks(job)}</td>
                <td>${escapeHtml(new Date(job.updatedAt).toLocaleString())}</td>
                <td>${job.problem && (job.state === "failed" || job.state === "conflict")
                    ? `<button type="button" data-retry-job="${escapeHtml(job.id)}">${job.state === "conflict" ? "Keep Local" : "Retry"}</button>
                       ${job.state === "conflict" ? `<button type="button" data-keep-remote="${escapeHtml(job.id)}">Keep Remote</button>` : ""}`
                    : "-"}</td>
            </tr>
        `).join("")
        : '<tr><td colspan="7">No upload jobs recorded.</td></tr>';
}

    jobSearch.addEventListener("input", renderFilteredUploadJobs);
    jobStateFilter.addEventListener("change", renderFilteredUploadJobs);

function renderCommitLinks(job) {
    const commits = job.result?.commits || {};
    const labels = [
        ["solution", "Solution"],
        ["notes", "Notes"],
        ["readme", "README"]
    ];

    return labels
        .filter(([stage]) => commits[stage])
        .map(([stage, label]) => {
            const url = commitUrl(job.repository, commits[stage]);

            return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer" title="${label} commit ${escapeHtml(commits[stage])}">${label}</a>`;
        })
        .join(" ") || "-";
}

function commitUrl(repository, sha) {
    const [owner, repo] = String(repository || "").split("/");

    if (!owner || !repo)
        return "#";

    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commit/${encodeURIComponent(sha)}`;
}

function formatJobStatus(job) {
    if (job.error)
        return job.result?.completed
            ? `${job.error} (${completedStages(job.result.completed)} completed)`
            : job.error;

    return job.state;
}

function completedStages(completed) {
    return Object.entries(completed)
        .filter(([, value]) => value)
        .map(([name]) => name)
        .join(", ") || "none";
}

uploadJobs.addEventListener("click", async (event) => {
    const keepRemoteButton = event.target.closest("[data-keep-remote]");

    if (keepRemoteButton) {
        keepRemoteButton.disabled = true;

        chrome.runtime.sendMessage({
            type: "CANCEL_UPLOAD_JOB",
            jobId: keepRemoteButton.dataset.keepRemote
        }, async (response) => {
            if (!response?.success)
                alert(response?.error || "Could not cancel the conflict.");

            await renderUploadJobs();
        });

        return;
    }

    const button = event.target.closest("[data-retry-job]");

    if (!button)
        return;

    const jobs = await getUploadJobs();
    const job = jobs.find((item) => item.id === button.dataset.retryJob);

    if (!job?.problem)
        return;

    button.disabled = true;
    button.textContent = "Retrying...";

    chrome.runtime.sendMessage({
        type: "RETRY_UPLOAD_JOB",
        jobId: job.id
    }, async (response) => {
        if (!response?.success)
            alert(response?.error || "Retry failed.");

        await renderUploadJobs();
        await renderDashboard();
    });
});

function calculateStreak(history){

    const days=[
        ...new Set(
            history.map(x=>
                new Date(x.uploadedAt)
                .toISOString()
                .slice(0,10)
            )
        )
    ].sort().reverse();

    let current=0;

    let longest=0;

    let prev=null;

    for(const day of days){

        const d=new Date(day);

        if(prev){

            const diff=(prev-d)/86400000;

            if(diff===1){

                current++;

            }

            else{

                longest=Math.max(longest,current);

                current=1;

            }

        }

        else{

            current=1;

        }

        prev=d;

    }

    longest=Math.max(longest,current);

    return{

        current,

        longest

    };

}

function drawBarChart(canvas,data){

    const ctx=canvas.getContext("2d");

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const entries=Object.entries(data);

    if(!entries.length)
        return;

    const max=Math.max(...entries.map(x=>x[1]));

    const width=60;

    const gap=20;

    entries.forEach(([label,value],i)=>{

        const h=(value/max)*150;

        const x=40+i*(width+gap);

        const y=180-h;

        ctx.fillStyle="#2563eb";

        ctx.fillRect(x,y,width,h);

        ctx.fillStyle="#111";

        ctx.fillText(label,x,y+170);

        ctx.fillText(value,x+20,y-5);

    });

}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* ===========================
   Sidebar Navigation
=========================== */

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-btn");

navButtons.forEach(button => {

    button.addEventListener("click", () => {

        navButtons.forEach(btn =>
            btn.classList.remove("active")
        );

        pages.forEach(page =>
            page.classList.remove("active")
        );

        button.classList.add("active");

        document
            .getElementById(button.dataset.page)
            .classList.add("active");

    });

});
