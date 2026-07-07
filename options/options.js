import GitHubService from "../github/github.js";

const tokenInput = document.getElementById("token");
const leetcodeRepo = document.getElementById("leetcodeRepo");
const codeforcesRepo = document.getElementById("codeforcesRepo");
const codechefRepo = document.getElementById("codechefRepo");

loadSavedSettings();

document.getElementById("fetchRepos").addEventListener("click", async () => {
    try {
        const token = tokenInput.value.trim();

        if (!token) {
            alert("Enter GitHub Token");
            return;
        }

        const github = new GitHubService(token);
        const user = await github.getUser();
        const repositories = await github.getRepositories();
        const saved = await chrome.storage.local.get([
            "leetcodeRepo",
            "codeforcesRepo",
            "codechefRepo"
        ]);

        fillDropdown(leetcodeRepo, repositories, saved.leetcodeRepo);
        fillDropdown(codeforcesRepo, repositories, saved.codeforcesRepo);
        fillDropdown(codechefRepo, repositories, saved.codechefRepo);

        alert(`Welcome ${user.login}. Loaded ${repositories.length} repositories.`);
    }
    catch (error) {
        console.error(error);
        alert(error.message || "Invalid GitHub Token");
    }
});

document.getElementById("save").addEventListener("click", () => {
    chrome.storage.local.set(
        {
            token: tokenInput.value.trim(),
            leetcodeRepo: leetcodeRepo.value,
            codeforcesRepo: codeforcesRepo.value,
            codechefRepo: codechefRepo.value
        },
        () => {
            alert("Settings saved successfully.");
        }
    );
});

async function loadSavedSettings() {
    const settings = await chrome.storage.local.get([
        "token",
        "leetcodeRepo",
        "codeforcesRepo",
        "codechefRepo"
    ]);

    tokenInput.value = settings.token || "";
    addSavedOption(leetcodeRepo, settings.leetcodeRepo);
    addSavedOption(codeforcesRepo, settings.codeforcesRepo);
    addSavedOption(codechefRepo, settings.codechefRepo);
}

function fillDropdown(select, repositories, selectedValue = "") {
    select.innerHTML = "";

    repositories.forEach((repository) => {
        const option = document.createElement("option");
        option.value = repository.full_name;
        option.textContent = repository.full_name;
        select.appendChild(option);
    });

    if (selectedValue)
        select.value = selectedValue;
}

function addSavedOption(select, value) {
    if (!value)
        return;

    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
    select.value = value;
}
