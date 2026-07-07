window.CPSyncParsers = window.CPSyncParsers || {};

window.CPSyncParsers.CodeChefParser = class CodeChefParser {

    static parse() {

        const problemLink = findProblemLink();

        const title = cleanTitle(
            document.querySelector("h1, .problem-statement h3, [class*='problem'] h3")?.textContent ||
            problemLink?.textContent ||
            document.title
        );

        const slug =
            slugFromProblemLink(problemLink) ||
            location.pathname.split("/").filter(Boolean).pop() ||
            slugify(title);

        const bodyText = document.body.innerText;

        const tags = detectTags(bodyText);

        return {

            platform: "codechef",

            title,

            slug,

            url: location.href,

            difficulty: detectDifficulty(bodyText),

            language: detectLanguage(bodyText),

            code: extractVisibleCode(),

            accepted: detectAccepted(bodyText),

            contest: detectContest(bodyText),

            tags,

            topic: tags[0] || "General"

        };

    }

};

function detectContest(text) {

    const patterns = [

        /CodeChef Starters\s+\d+/i,

        /Starters\s+\d+/i,

        /Cook[- ]?Off\s+\d*/i,

        /Lunchtime\s+\d*/i,

        /Long Challenge/i

    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match) {

            return {

                isContest: true,

                name: match[0].trim(),

                platform: "codechef"

            };

        }

    }

    return {

        isContest: false,

        name: "",

        platform: "codechef"

    };

}

function detectTags(text) {

    const detected = [];

    // Try visible tags first
    const pageTags = Array.from(
        document.querySelectorAll(
            ".tag, .problem-tag, .tags a, .tags span"
        )
    )
    .map(node => node.textContent.trim())
    .filter(Boolean);

    detected.push(...pageTags);

    const keywords = [

        "Array",
        "String",
        "Math",
        "Greedy",
        "Dynamic Programming",
        "DP",
        "Graph",
        "Tree",
        "Binary Search",
        "Bit Manipulation",
        "Recursion",
        "Backtracking",
        "Stack",
        "Queue",
        "Heap",
        "Trie",
        "Hash",
        "Hash Table",
        "Linked List",
        "Sorting",
        "Prefix Sum",
        "Sliding Window",
        "DFS",
        "BFS"

    ];

    for (const keyword of keywords) {

        const regex = new RegExp(
            "\\b" + keyword.replace(/\s+/g, "\\s+") + "\\b",
            "i"
        );

        if (regex.test(text))
            detected.push(keyword);

    }

    return [...new Set(detected.map(normalizeTag))];

}

function normalizeTag(tag) {

    const aliases = {

        "array": "Arrays",

        "arrays": "Arrays",

        "graph": "Graphs",

        "graphs": "Graphs",

        "tree": "Trees",

        "trees": "Trees",

        "dynamic programming": "DP",

        "dp": "DP",

        "hash": "Hash Table",

        "hash table": "Hash Table",

        "string": "Strings",

        "strings": "Strings"

    };

    const key = tag.toLowerCase();

    if (aliases[key])
        return aliases[key];

    return tag
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");

}

function cleanTitle(value) {

    return String(value)
        .replace(/Practice Problem.*$/i, "")
        .replace(/CodeChef.*$/i, "")
        .replace(/\s+/g, " ")
        .trim();

}

function detectDifficulty(text) {

    const match = text.match(/Difficulty\s*:?\s*([A-Za-z0-9* ]+)/i);

    return match?.[1]?.trim() || "";

}

function detectLanguage(text) {

    const match = text.match(
        /\b(C\+\+17|C\+\+14|C\+\+|Java|Python 3|Python|PyPy|C|C#|Go|Rust|Kotlin|JavaScript|Node\.js)\b/i
    );

    return match?.[0] || "";

}

function extractVisibleCode() {

    const source = document.querySelector("textarea, .ace_text-input");

    if (source?.value?.trim())
        return source.value;

    return Array.from(document.querySelectorAll("pre, code"))
        .map(node => node.textContent.trim())
        .filter(text => text.split("\n").length > 2)
        .sort((a, b) => b.length - a.length)[0] || "";

}

function detectAccepted(text) {

    if (/\bAccepted\b|\bCorrect Answer\b/i.test(text))
        return true;

    if (/\bWrong Answer\b|\bCompilation Error\b|\bRuntime Error\b|\bTime Limit Exceeded\b/i.test(text))
        return false;

    return null;

}

function slugify(value) {

    return String(value || "codechef-solution")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

}

function findProblemLink() {

    return document.querySelector(
        'a[href*="/problems/"], a[href*="/submit/"]'
    );

}

function slugFromProblemLink(link) {

    const href = link?.getAttribute("href") || "";

    const match = href.match(
        /(?:problems|submit)\/([A-Z0-9_]+)/i
    );

    return match?.[1] || "";

}