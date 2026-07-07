export async function getSettings() {

    return await chrome.storage.local.get([
        "token",
        "leetcodeRepo",
        "codeforcesRepo",
        "codechefRepo"
    ]);

}

export async function saveSettings(data) {

    return await chrome.storage.local.set(data);

}