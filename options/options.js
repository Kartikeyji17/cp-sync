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

const totalSolved=document.getElementById("totalSolved");
const easySolved=document.getElementById("easySolved");
const mediumSolved=document.getElementById("mediumSolved");
const hardSolved=document.getElementById("hardSolved");
const contestSolved=document.getElementById("contestSolved");
const currentStreak=document.getElementById("currentStreak");
const longestStreak=document.getElementById("longestStreak");

const recentUploads=document.querySelector("#recentUploads tbody");

const platformChart=document.getElementById("platformChart");
const languageChart=document.getElementById("languageChart");
const difficultyChart=document.getElementById("difficultyChart");

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
    renderDashboard();
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

async function renderDashboard(){

    const data=await chrome.storage.local.get(["uploadHistory"]);

    const history=data.uploadHistory||[];

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

    const streak=calculateStreak(history);

    currentStreak.textContent=streak.current;
    longestStreak.textContent=streak.longest;

    drawBarChart(platformChart,platform);

    drawBarChart(languageChart,language);

    drawBarChart(difficultyChart,diff);

    renderRecent(history);

}

function renderRecent(history){

    recentUploads.innerHTML="";

    history
    .slice(0,15)
    .forEach(item=>{

        recentUploads.innerHTML+=`
        <tr>

        <td>${item.title}</td>

        <td>${item.platform}</td>

        <td>${item.language}</td>

        <td>${item.difficulty}</td>

        <td>${new Date(item.uploadedAt).toLocaleDateString()}</td>

        </tr>
        `;

    });

}

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
