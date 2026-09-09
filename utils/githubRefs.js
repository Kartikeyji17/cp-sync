export function parseRepositoryRef(repositoryRef) {
    const value = String(repositoryRef || "").trim();
    const parts = value.split("/");

    if (parts.length !== 2 || !parts[0] || !parts[1] || /[\s\\]/.test(value))
        throw new Error("Saved repository setting is invalid. Reload repositories in options.");

    return {
        owner: parts[0],
        repo: parts[1]
    };
}