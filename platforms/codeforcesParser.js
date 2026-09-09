window.CPSyncParsers = window.CPSyncParsers || {};

window.CPSyncParsers.CodeforcesParser = class CodeforcesParser {

    static parse() {

        const problemStatement = document.querySelector(".problem-statement");

        const titleNode = problemStatement?.querySelector(".title");

        const problemLink = findProblemLink();

        const title = cleanTitle(
            titleNode?.textContent ||
            problemLink?.textContent ||
            document.title
        );

        const slug = buildSlug(title);

        const bodyText = document.body.innerText;

        const tags = detectTags();

        return {

            platform: "codeforces",
            parserVersion: 1,
            captureSource: location.pathname.includes("/submission/") ? "submission-page" : "problem-page",
            externalId: slug,
            submissionId: location.pathname.match(/\/submission\/(\d+)/)?.[1] || "",
            runtime: submissionMetadata().runtime,
            memory: submissionMetadata().memory,
            submittedAt: "",

            title,

            slug,

            url: location.href,

            contest: detectContest(),

            difficulty: rating(),

            language: detectLanguage(),

            code: extractVisibleCode(),

            accepted: detectAccepted(bodyText),

            tags,

            topic: tags[0] || "General"

        };

    }

};

function detectContest() {

    const text = document.body.innerText;

    const patterns = [

        /Codeforces Round\s+#?\d+/i,
        /Educational Codeforces Round\s+\d+/i,
        /Codeforces Global Round\s+\d+/i,
        /Codeforces Round\s+\d+/i,
        /CodeTON Round\s+\d+/i,
        /Div\.\s*1/i,
        /Div\.\s*2/i,
        /Div\.\s*3/i,
        /Div\.\s*4/i

    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match) {

            return {

                isContest: true,

                name: match[0].trim(),

                platform: "codeforces"

            };

        }

    }

    const id = contestId();

    if (id) {

        return {

            isContest: true,

            name: "Codeforces Round " + id,

            platform: "codeforces"

        };

    }

    return {

        isContest: false,

        name: "",

        platform: "codeforces"

    };

}

function submissionMetadata() {
    const text = document.body.innerText;
    const runtime = text.match(/(?:time taken|time used|runtime)\s*:?\s*([\d.]+\s*(?:ms|s))/i)?.[1] || "";
    const memory = text.match(/(?:memory used|memory)\s*:?\s*([\d.]+\s*(?:KB|MB|GB))/i)?.[1] || "";

    return { runtime, memory };
}

function detectTags() {

    return Array.from(document.querySelectorAll(".tag-box"))
        .map(node => node.textContent.trim())
        .filter(tag => {

            if (!tag)
                return false;

            if (/^\*\d+$/.test(tag))
                return false;

            return true;

        })
        .map(normalizeTag);

}

function normalizeTag(tag) {

    const aliases = {

        "data structures": "Data Structures",

        "binary search": "Binary Search",

        "dfs and similar": "DFS",

        "graphs": "Graphs",

        "graph": "Graphs",

        "dp": "DP",

        "dynamic programming": "DP",

        "greedy": "Greedy",

        "implementation": "Implementation",

        "math": "Math",

        "strings": "Strings",

        "string": "Strings",

        "trees": "Trees",

        "tree": "Trees",

        "constructive algorithms": "Constructive",

        "bitmasks": "Bitmask",

        "brute force": "Brute Force",

        "number theory": "Number Theory"

    };

    const key = tag.toLowerCase();

    if (aliases[key])
        return aliases[key];

    return tag
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

}

function contestId() {

    const match = location.pathname.match(
        /contest\/(\d+)|problemset\/problem\/(\d+)/
    );

    return match?.[1] || match?.[2] || "";

}

function cleanTitle(value) {

    return String(value)
        .replace(/ - Codeforces$/, "")
        .replace(/^[A-Z0-9]+\.\s*/, "")
        .trim();

}

function buildSlug(title) {

    const problemHref =
        findProblemLink()?.getAttribute("href") ||
        location.pathname;

    const match = problemHref.match(
        /contest\/(\d+)\/problem\/([A-Z0-9]+)|problemset\/problem\/(\d+)\/([A-Z0-9]+)/i
    );

    const contest = match?.[1] || match?.[3] || "";

    const index = match?.[2] || match?.[4] || "";

    return [contest, index, slugify(title)]
        .filter(Boolean)
        .join("-");

}

function findProblemLink() {

    return document.querySelector(
        'a[href*="/problemset/problem/"], a[href*="/problem/"]'
    );

}

function rating() {

    const tag = Array.from(document.querySelectorAll(".tag-box"))
        .map(node => node.textContent.trim())
        .find(text => /^\*\d+$/.test(text));

    return tag || "";

}

function detectLanguage() {

    const text = document.body.innerText;

    const match = text.match(
        /GNU C\+\+\d+|PyPy \d+|Python \d+|Java \d+|Kotlin|C#|Go|Rust|JavaScript|Node\.js/i
    );

    return match?.[0] || "";

}

function extractVisibleCode() {

    const source = document.querySelector(
        "#sourceCodeTextarea, textarea[name='source'], textarea"
    );

    if (source?.value?.trim())
        return source.value;

    return Array.from(document.querySelectorAll("pre.prettyprint, pre, code"))
        .map(node => node.textContent.trim())
        .filter(text => text.split("\n").length > 2)
        .sort((a, b) => b.length - a.length)[0] || "";

}

function detectAccepted(text) {

    const isSubmissionPage = /\/submission\//.test(location.pathname);

    if (/\bAccepted\b/.test(text))
        return true;

    if (isSubmissionPage && /\bOK\b/.test(text))
        return true;

    if (/\bWrong answer\b|\bCompilation error\b|\bRuntime error\b|\bTime limit exceeded\b/i.test(text))
        return false;

    return null;

}

function slugify(value) {

    return String(value || "codeforces-solution")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

}