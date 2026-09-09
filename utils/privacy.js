export const LOCAL_DATA_KEYS = [
    "storageSchemaVersion",
    "token",
    "leetcodeRepo",
    "codeforcesRepo",
    "codechefRepo",
    "platformRepositories",
    "defaultRepositories",
    "lastUsedRepositories",
    "fetchedRepositories",
    "autoUploadMode",
    "organizeBy",
    "repoVisibility",
    "uploadHistory",
    "uploadJobs",
    "reviewRecords",
    "attemptHistory"
];

export async function clearLocalData() {
    await chrome.storage.local.remove(LOCAL_DATA_KEYS);
}