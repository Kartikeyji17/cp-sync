window.CPSyncParsers = window.CPSyncParsers || {};

window.CPSyncParsers.LeetCodeParser = class LeetCodeParser {

    static parse(editorData = {}) {

        const slug = location.pathname.split("/")[2] || slugify(document.title);

        const heading = document.querySelector(
            '[data-cy="question-title"], a[href^="/problems/"]'
        );

        const title = cleanTitle(
            heading?.textContent ||
            document.title.replace(/ - LeetCode$/, "")
        );

        const bodyText = document.body.innerText;

        const language = editorData.language || detectLanguage();

        const code = editorData.code || extractVisibleCode();

        const contest = detectContest(bodyText);

        const tags = detectTags();

        return {

            platform: "leetcode",

            title,

            slug,

            url: location.href,

            difficulty: detectDifficulty(bodyText),

            language,

            code,

            accepted: detectAccepted(bodyText),

            contest,

            tags,

            topic: tags[0] || "General"

        };

    }

};

function detectContest(text) {

    const patterns = [

        /Weekly Contest\s+\d+/i,

        /Biweekly Contest\s+\d+/i

    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match) {

            return {

                isContest: true,

                name: match[0].trim(),

                platform: "leetcode"

            };

        }

    }

    return {

        isContest: false,

        name: "",

        platform: "leetcode"

    };

}

function detectTags() {

    const knownTopics = [

        "Array",
        "Hash Table",
        "String",
        "Math",
        "Sorting",
        "Greedy",
        "Binary Search",
        "Two Pointers",
        "Sliding Window",
        "Stack",
        "Queue",
        "Heap",
        "Priority Queue",
        "Tree",
        "Binary Tree",
        "BST",
        "Graph",
        "DFS",
        "BFS",
        "Dynamic Programming",
        "DP",
        "Backtracking",
        "Bit Manipulation",
        "Trie",
        "Union Find",
        "Linked List",
        "Recursion",
        "Simulation",
        "Geometry",
        "Matrix",
        "Prefix Sum"

    ];

    const text = document.body.innerText;

    const tags = [];

    for (const topic of knownTopics) {

        const regex = new RegExp("\\b" + topic.replace(/\s+/g, "\\s+") + "\\b", "i");

        if (regex.test(text))
            tags.push(topic);

    }

    return [...new Set(tags)];

}

function detectDifficulty(text) {

    if (/\bEasy\b/.test(text))
        return "Easy";

    if (/\bMedium\b/.test(text))
        return "Medium";

    if (/\bHard\b/.test(text))
        return "Hard";

    return "";

}

function detectAccepted(text) {

    if (/\bAccepted\b/i.test(text))
        return true;

    if (/\bWrong Answer\b|\bCompile Error\b|\bRuntime Error\b|\bTime Limit Exceeded\b/i.test(text))
        return false;

    return null;

}

function detectLanguage() {

    const text = document.body.innerText;

    const languages = [

        "C++",
        "Java",
        "Python3",
        "Python",
        "JavaScript",
        "TypeScript",
        "C",
        "C#",
        "Go",
        "Rust",
        "Kotlin",
        "Swift",
        "Ruby",
        "PHP"

    ];

    return languages.find(language => text.includes(language)) || "";

}

function extractVisibleCode() {

    const textarea = document.querySelector("textarea");

    if (textarea?.value?.trim())
        return textarea.value;

    return Array.from(document.querySelectorAll("pre, code"))
        .map(node => node.textContent.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0] || "";

}

function cleanTitle(value) {

    return value
        .replace(/^\d+\.\s*/, "")
        .trim();

}

function slugify(value) {

    return String(value || "leetcode-solution")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

}