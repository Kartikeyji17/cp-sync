import { PLATFORMS } from "./platform.js";

const LEGACY_REPO_KEYS = {
    leetcode: "leetcodeRepo",
    codeforces: "codeforcesRepo",
    codechef: "codechefRepo"
};

export async function getRepositorySettings() {
    const keys = [
        "platformRepositories",
        "defaultRepositories",
        "lastUsedRepositories",
        ...Object.values(LEGACY_REPO_KEYS)
    ];
    const stored = await chrome.storage.local.get(keys);
    const platformRepositories = normalizePlatformMap(stored.platformRepositories);
    const defaultRepositories = normalizeRepoChoiceMap(stored.defaultRepositories);
    const lastUsedRepositories = normalizeRepoChoiceMap(stored.lastUsedRepositories);

    PLATFORMS.forEach((platform) => {
        const legacy = stored[LEGACY_REPO_KEYS[platform]];

        if (legacy && !platformRepositories[platform].includes(legacy))
            platformRepositories[platform].push(legacy);

        if (legacy && !defaultRepositories[platform])
            defaultRepositories[platform] = legacy;
    });

    return {
        platformRepositories,
        defaultRepositories,
        lastUsedRepositories
    };
}

export async function saveRepositorySettings(settings) {
    const normalized = {
        platformRepositories: normalizePlatformMap(settings.platformRepositories),
        defaultRepositories: normalizeRepoChoiceMap(settings.defaultRepositories),
        lastUsedRepositories: normalizeRepoChoiceMap(settings.lastUsedRepositories)
    };

    await chrome.storage.local.set(normalized);
}

export async function getRepositoriesForPlatform(platform) {
    const settings = await getRepositorySettings();
    const repositories = settings.platformRepositories[platform] || [];

    return {
        repositories,
        selectedRepository: chooseRepository(platform, settings)
    };
}

export async function rememberRepository(platform, repository) {
    if (!platform || !repository)
        return;

    const settings = await getRepositorySettings();

    await chrome.storage.local.set({
        lastUsedRepositories: {
            ...settings.lastUsedRepositories,
            [platform]: repository
        },
        defaultRepositories: {
            ...settings.defaultRepositories,
            [platform]: settings.defaultRepositories[platform] || repository
        }
    });
}

export function chooseRepository(platform, settings) {
    const repositories = settings.platformRepositories?.[platform] || [];
    const lastUsed = settings.lastUsedRepositories?.[platform];
    const defaultRepository = settings.defaultRepositories?.[platform];

    if (lastUsed && repositories.includes(lastUsed))
        return lastUsed;

    if (defaultRepository && repositories.includes(defaultRepository))
        return defaultRepository;

    return repositories[0] || "";
}

export function normalizePlatformMap(value = {}) {
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
