import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = globalThis;

await import("../platforms/leetcodeParser.js");
await import("../platforms/codeforcesParser.js");
await import("../platforms/codechefParser.js");

function node(text = "", attributes = {}) {
    return {
        textContent: text,
        value: attributes.value || "",
        getAttribute(name) {
            return attributes[name] || "";
        }
    };
}

function setPage({ pathname, title, bodyText, selectors = {}, selectorLists = {} }) {
    globalThis.location = {
        href: `https://example.test${pathname}`,
        pathname
    };

    globalThis.document = {
        title,
        body: {
            innerText: bodyText
        },
        querySelector(selector) {
            return selectors[selector] || null;
        },
        querySelectorAll(selector) {
            return selectorLists[selector] || [];
        }
    };
}

test("parses a LeetCode problem and editor payload", () => {
    setPage({
        pathname: "/problems/two-sum/",
        title: "Two Sum - LeetCode",
        bodyText: "Easy Accepted Array Weekly Contest 1",
        selectors: {
            '[data-cy="question-title"], a[href^="/problems/"]': node("1. Two Sum")
        }
    });

    const problem = window.CPSyncParsers.LeetCodeParser.parse({
        language: "python",
        code: "return nums"
    });

    assert.equal(problem.platform, "leetcode");
    assert.equal(problem.title, "Two Sum");
    assert.equal(problem.slug, "two-sum");
    assert.equal(problem.difficulty, "Easy");
    assert.equal(problem.accepted, true);
    assert.equal(problem.language, "python");
    assert.equal(problem.code, "return nums");
    assert.equal(problem.contest.name, "Weekly Contest 1");
    assert.deepEqual(problem.tags, ["Array"]);
});

test("parses a Codeforces contest submission", () => {
    const problemStatement = node();
    problemStatement.querySelector = (selector) => {
        if (selector === ".title")
            return title;

        return null;
    };
    const title = node("A. Nearly Lucky Number");
    const problemLink = node("Problem", { href: "/contest/123/problem/A" });
    const tags = [node("implementation"), node("*800")];

    setPage({
        pathname: "/contest/123/submission/456",
        title: "A. Nearly Lucky Number - Codeforces",
        bodyText: "Codeforces Round #123 OK GNU C++17 Codeforces Round #123",
        selectors: {
            ".problem-statement": problemStatement,
            ".problem-statement .title": title,
            'a[href*="/problemset/problem/"], a[href*="/problem/"]': problemLink,
            "#sourceCodeTextarea, textarea[name='source'], textarea": node("", {
                value: "int main() {}"
            })
        },
        selectorLists: {
            ".tag-box": tags,
            "pre.prettyprint, pre, code": []
        }
    });

    const problem = window.CPSyncParsers.CodeforcesParser.parse();

    assert.equal(problem.platform, "codeforces");
    assert.equal(problem.title, "Nearly Lucky Number");
    assert.equal(problem.slug, "123-A-nearly-lucky-number");
    assert.equal(problem.difficulty, "*800");
    assert.equal(problem.language, "GNU C++17");
    assert.equal(problem.accepted, true);
    assert.equal(problem.contest.name, "Codeforces Round #123");
    assert.deepEqual(problem.tags, ["Implementation"]);
    assert.equal(problem.code, "int main() {}");
    assert.equal(problem.submissionId, "456");
});

test("parses a CodeChef problem with tags and accepted state", () => {
    const problemLink = node("EXAMPLE", { href: "/problems/EXAMPLE" });

    setPage({
        pathname: "/problems/EXAMPLE",
        title: "EXAMPLE - CodeChef",
        bodyText: "Difficulty: 1200 Accepted Python 3 Array Starters 50",
        selectors: {
            'a[href*="/problems/"], a[href*="/submit/"]': problemLink,
            "h1, .problem-statement h3, [class*='problem'] h3": node("Example Problem"),
            "textarea, .ace_text-input": node("", {
                value: "print(1)"
            })
        },
        selectorLists: {
            ".tag, .problem-tag, .tags a, .tags span": []
        }
    });

    const problem = window.CPSyncParsers.CodeChefParser.parse();

    assert.equal(problem.platform, "codechef");
    assert.equal(problem.title, "Example Problem");
    assert.equal(problem.slug, "EXAMPLE");
    assert.equal(problem.difficulty, "1200");
    assert.equal(problem.language, "Python 3");
    assert.equal(problem.accepted, true);
    assert.equal(problem.contest.name, "Starters 50");
    assert.deepEqual(problem.tags, ["Arrays"]);
    assert.equal(problem.code, "print(1)");
    assert.equal(problem.submissionId, "");
});

test("reports an unaccepted LeetCode submission without inventing code", () => {
    setPage({
        pathname: "/problems/three-sum/",
        title: "Three Sum - LeetCode",
        bodyText: "Medium Wrong Answer JavaScript",
        selectors: {
            '[data-cy="question-title"], a[href^="/problems/"]': node("15. Three Sum"),
            textarea: node("", { value: "" })
        },
        selectorLists: {
            "pre, code": []
        }
    });

    const problem = window.CPSyncParsers.LeetCodeParser.parse();

    assert.equal(problem.accepted, false);
    assert.equal(problem.code, "");
    assert.equal(problem.language, "JavaScript");
});

test("keeps Codeforces problem pages incomplete until a verdict exists", () => {
    const title = node("B. Problem Only");
    const problemStatement = node();
    problemStatement.querySelector = () => title;

    setPage({
        pathname: "/problemset/problem/321/B",
        title: "B. Problem Only - Codeforces",
        bodyText: "Codeforces Round 321 Python",
        selectors: {
            ".problem-statement": problemStatement,
            'a[href*="/problemset/problem/"], a[href*="/problem/"]': node("Problem", {
                href: "/problemset/problem/321/B"
            }),
            "#sourceCodeTextarea, textarea[name='source'], textarea": node("", {
                value: ""
            })
        },
        selectorLists: {
            ".tag-box": [],
            "pre.prettyprint, pre, code": []
        }
    });

    const problem = window.CPSyncParsers.CodeforcesParser.parse();

    assert.equal(problem.accepted, null);
    assert.equal(problem.code, "");
    assert.equal(problem.slug, "321-B-problem-only");
});

test("reports a failed CodeChef submission without source code", () => {
    setPage({
        pathname: "/submit/EXAMPLE",
        title: "EXAMPLE - CodeChef",
        bodyText: "Wrong Answer C++17",
        selectors: {
            'a[href*="/problems/"], a[href*="/submit/"]': node("EXAMPLE", {
                href: "/submit/EXAMPLE"
            }),
            "h1, .problem-statement h3, [class*='problem'] h3": node("Example Problem"),
            "textarea, .ace_text-input": node("", { value: "" })
        },
        selectorLists: {
            ".tag, .problem-tag, .tags a, .tags span": [],
            "pre, code": []
        }
    });

    const problem = window.CPSyncParsers.CodeChefParser.parse();

    assert.equal(problem.accepted, false);
    assert.equal(problem.code, "");
    assert.equal(problem.language, "C++17");
});

test("uses visible code blocks when the LeetCode editor payload is empty", () => {
    setPage({
        pathname: "/problems/example/",
        title: "Example - LeetCode",
        bodyText: "Easy Python",
        selectors: {
            '[data-cy="question-title"], a[href^="/problems/"]': node("1. Example"),
            textarea: node("", { value: "" })
        },
        selectorLists: {
            "pre, code": [node("line one\nline two\nline three")]
        }
    });

    const problem = window.CPSyncParsers.LeetCodeParser.parse({});

    assert.equal(problem.code, "line one\nline two\nline three");
});

test("uses a Codeforces preformatted submission when no textarea exists", () => {
    const title = node("A. Example");
    const problemStatement = node();
    problemStatement.querySelector = () => title;

    setPage({
        pathname: "/contest/10/submission/20",
        title: "A. Example - Codeforces",
        bodyText: "OK Python 3 Codeforces Round 10",
        selectors: {
            ".problem-statement": problemStatement,
            'a[href*="/problemset/problem/"], a[href*="/problem/"]': node("Problem", {
                href: "/contest/10/problem/A"
            }),
            "#sourceCodeTextarea, textarea[name='source'], textarea": null
        },
        selectorLists: {
            ".tag-box": [],
            "pre.prettyprint, pre, code": [node("one\ntwo\nthree")]
        }
    });

    const problem = window.CPSyncParsers.CodeforcesParser.parse();

    assert.equal(problem.code, "one\ntwo\nthree");
});

test("uses the Ace editor input on CodeChef", () => {
    setPage({
        pathname: "/submit/EXAMPLE",
        title: "EXAMPLE - CodeChef",
        bodyText: "Accepted C++17",
        selectors: {
            'a[href*="/problems/"], a[href*="/submit/"]': node("EXAMPLE", {
                href: "/submit/EXAMPLE"
            }),
            "h1, .problem-statement h3, [class*='problem'] h3": node("Example"),
            "textarea, .ace_text-input": node("", {
                value: "int main() { return 0; }"
            })
        },
        selectorLists: {
            ".tag, .problem-tag, .tags a, .tags span": []
        }
    });

    const problem = window.CPSyncParsers.CodeChefParser.parse();

    assert.equal(problem.code, "int main() { return 0; }");
});