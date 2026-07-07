export const PLATFORMS = ["leetcode", "codeforces", "codechef"];

export const PLATFORM_LABELS = {
    leetcode: "LeetCode",
    codeforces: "Codeforces",
    codechef: "CodeChef"
};

export const PARSE_MESSAGE_TYPES = {
    leetcode: "LEETCODE_PARSE",
    codeforces: "CODEFORCES_PARSE",
    codechef: "CODECHEF_PARSE"
};

export function detectPlatformFromUrl(url = "") {
    if (url.includes("leetcode.com")) return "leetcode";
    if (url.includes("codeforces.com")) return "codeforces";
    if (url.includes("codechef.com")) return "codechef";

    return "";
}

export function platformLabel(platform) {
    return PLATFORM_LABELS[platform] || platform;
}
