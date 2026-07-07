window.CPSyncParsers = window.CPSyncParsers || {};

window.CPSyncParsers.CodeforcesParser = class CodeforcesParser {

    static parse() {

        const problemStatement = document.querySelector(".problem-statement");
        const titleNode = problemStatement?.querySelector(".title");
        const problemLink = findProblemLink();
        const title = cleanTitle(titleNode?.textContent || problemLink?.textContent || document.title);
        const slug = buildSlug(title);
        const bodyText = document.body.innerText;

        return {
            platform: "codeforces",
            title,
            slug,
            url: location.href,
            contest: contestName(),
            difficulty: rating(),
            language: detectLanguage(),
            code: extractVisibleCode(),
            accepted: detectAccepted(bodyText)
        };

    }

};

function cleanTitle(value) {

    return String(value)
        .replace(/ - Codeforces$/, "")
        .replace(/^[A-Z0-9]+\.\s*/, "")
        .trim();

}

function buildSlug(title) {

    const problemHref = findProblemLink()?.getAttribute("href") || location.pathname;
    const match = problemHref.match(/contest\/(\d+)\/problem\/([A-Z0-9]+)|problemset\/problem\/(\d+)\/([A-Z0-9]+)/i);
    const contestId = match?.[1] || match?.[3] || "";
    const index = match?.[2] || match?.[4] || "";

    return [contestId, index, slugify(title)].filter(Boolean).join("-");

}

function findProblemLink() {

    return document.querySelector('a[href*="/problemset/problem/"], a[href*="/problem/"]');

}

function contestName() {

    const match = location.pathname.match(/contest\/(\d+)|problemset\/problem\/(\d+)/);
    return match?.[1] || match?.[2] || "";

}

function rating() {

    const tag = Array.from(document.querySelectorAll(".tag-box"))
        .map((node) => node.textContent.trim())
        .find((text) => /^\*\d+$/.test(text));

    return tag || "";

}

function detectLanguage() {

    const text = document.body.innerText;
    const match = text.match(/GNU C\+\+\d+|PyPy \d+|Python \d+|Java \d+|Kotlin|C#|Go|Rust|JavaScript|Node\.js/i);

    return match?.[0] || "";

}

function extractVisibleCode() {

    const source = document.querySelector("#sourceCodeTextarea, textarea[name='source'], textarea");

    if (source?.value?.trim())
        return source.value;

    return Array.from(document.querySelectorAll("pre.prettyprint, pre, code"))
        .map((node) => node.textContent.trim())
        .filter((text) => text.split("\n").length > 2)
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
