const CAPABILITIES = {
    leetcode: {
        name: "LeetCode",
        source: "DOM + Monaco page bridge",
        fields: ["title", "slug", "url", "difficulty", "language", "code", "accepted", "contest", "tags"],
        submissionMetadata: false
    },
    codeforces: {
        name: "Codeforces",
        source: "DOM problem and submission pages",
        fields: ["title", "slug", "url", "difficulty", "language", "code", "accepted", "contest", "tags"],
        submissionMetadata: false
    },
    codechef: {
        name: "CodeChef",
        source: "DOM problem and submission pages",
        fields: ["title", "slug", "url", "difficulty", "language", "code", "accepted", "contest", "tags"],
        submissionMetadata: false
    }
};

export function getPlatformCapabilities(platform) {
    const capability = CAPABILITIES[platform];

    if (!capability)
        return null;

    return {
        ...capability,
        fields: [...capability.fields]
    };
}

export function getAllPlatformCapabilities() {
    return Object.fromEntries(
        Object.keys(CAPABILITIES).map((platform) => [platform, getPlatformCapabilities(platform)])
    );
}