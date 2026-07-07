window.CPSyncParsers = window.CPSyncParsers || {};

window.CPSyncParsers.CodeChefParser = class CodeChefParser {

    static parse() {

        const problemLink = findProblemLink();
        const title = cleanTitle(
            document.querySelector("h1, .problem-statement h3, [class*='problem'] h3")?.textContent ||
            problemLink?.textContent ||
            document.title
        );
        const slug = slugFromProblemLink(problemLink) || location.pathname.split("/").filter(Boolean).pop() || slugify(title);
        const bodyText = document.body.innerText;

        return {
            platform: "codechef",
            title,
            slug,
            url: location.href,
            difficulty: detectDifficulty(bodyText),
            language: detectLanguage(bodyText),
            code: extractVisibleCode(),
            accepted: detectAccepted(bodyText)
        };

    }

};

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

    const match = text.match(/\b(C\+\+17|C\+\+14|C\+\+|Java|Python 3|Python|PyPy|C|C#|Go|Rust|Kotlin|JavaScript|Node\.js)\b/i);
    return match?.[0] || "";

}

function extractVisibleCode() {

    const source = document.querySelector("textarea, .ace_text-input");

    if (source?.value?.trim())
        return source.value;

    return Array.from(document.querySelectorAll("pre, code"))
        .map((node) => node.textContent.trim())
        .filter((text) => text.split("\n").length > 2)
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

    return document.querySelector('a[href*="/problems/"], a[href*="/submit/"]');

}

function slugFromProblemLink(link) {

    const href = link?.getAttribute("href") || "";
    const match = href.match(/(?:problems|submit)\/([A-Z0-9_]+)/i);

    return match?.[1] || "";

}
