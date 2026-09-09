export const BACKUP_VERSION = 1;

export const BACKUP_KEYS = [
    "storageSchemaVersion",
    "token",
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

export function buildBackup(storage) {
    const data = {};

    BACKUP_KEYS.forEach((key) => {
        if (storage[key] !== undefined)
            data[key] = storage[key];
    });

    return {
        format: "cp-sync-backup",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data
    };
}

export function parseBackup(value) {
    if (!value || typeof value !== "object")
        throw new Error("Backup must be a JSON object.");

    if (value.format !== "cp-sync-backup")
        throw new Error("This file is not a CP Sync backup.");

    if (value.version !== BACKUP_VERSION)
        throw new Error(`Unsupported backup version: ${value.version}.`);

    if (!value.data || typeof value.data !== "object" || Array.isArray(value.data))
        throw new Error("Backup data is invalid.");

    return Object.fromEntries(
        Object.entries(value.data)
            .filter(([key]) => BACKUP_KEYS.includes(key))
    );
}