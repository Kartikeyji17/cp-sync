import { PLATFORMS } from "./platform.js";

import { DATA_SCHEMA_VERSION } from "./schema.js";

export const STORAGE_SCHEMA_VERSION = 2;

const LEGACY_REPO_KEYS = {
    leetcode: "leetcodeRepo",
    codeforces: "codeforcesRepo",
    codechef: "codechefRepo"
};

export async function initializeStorage() {
    const keys = [
        "storageSchemaVersion",
        "platformRepositories",
        "defaultRepositories",
        "lastUsedRepositories",
        "uploadHistory",
        "uploadJobs",
        "reviewRecords",
        "attemptHistory",
        ...Object.values(LEGACY_REPO_KEYS)
    ];
    const stored = await chrome.storage.local.get(keys);

    if (stored.storageSchemaVersion >= STORAGE_SCHEMA_VERSION)
        return;

    const platformRepositories = normalizePlatformMap(stored.platformRepositories);
    const defaultRepositories = normalizeRepoChoiceMap(stored.defaultRepositories);
    const lastUsedRepositories = normalizeRepoChoiceMap(stored.lastUsedRepositories);
    const uploadHistory = addSchemaVersion(stored.uploadHistory);
    const uploadJobs = addSchemaVersion(stored.uploadJobs);
    const reviewRecords = addSchemaVersion(stored.reviewRecords);
    const attemptHistory = addSchemaVersion(stored.attemptHistory);

    PLATFORMS.forEach((platform) => {
        const legacy = stored[LEGACY_REPO_KEYS[platform]];

        if (legacy && !platformRepositories[platform].includes(legacy))
            platformRepositories[platform].push(legacy);

        if (legacy && !defaultRepositories[platform])
            defaultRepositories[platform] = legacy;
    });

    await chrome.storage.local.set({
        storageSchemaVersion: STORAGE_SCHEMA_VERSION,
        platformRepositories,
        defaultRepositories,
        lastUsedRepositories,
        uploadHistory,
        uploadJobs,
        reviewRecords,
        attemptHistory
    });
}

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

function normalizePlatformMap(value = {}) {
    return PLATFORMS.reduce((accumulator, platform) => {
        const repositories = Array.isArray(value?.[platform])
            ? value[platform]
            : [];

        accumulator[platform] = Array.from(new Set(repositories.filter(Boolean)));

        return accumulator;
    }, {});
}

function normalizeRepoChoiceMap(value = {}) {
    return PLATFORMS.reduce((accumulator, platform) => {
        accumulator[platform] = value?.[platform] || "";
        return accumulator;
    }, {});
}

function addSchemaVersion(value) {
    if (!Array.isArray(value))
        return [];

    return value.map((item) => ({
        ...item,
        schemaVersion: item.schemaVersion || DATA_SCHEMA_VERSION
    }));
}