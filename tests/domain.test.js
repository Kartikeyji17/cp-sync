import test from "node:test";
import assert from "node:assert/strict";

import { chooseRepository } from "../utils/repositories.js";
import {
    getProblemDiagnostics,
    normalizeProblem,
    validateProblem
} from "../utils/problemContract.js";
import {
    buildReadmeDashboard,
    entryKey,
    mergeReadmeDashboard,
    parseReadmeEntries
} from "../utils/readmeDashboard.js";
import { buildUploadPaths } from "../utils/uploadPaths.js";

test("chooses the valid last-used repository before the default", () => {
    const settings = {
        platformRepositories: {
            leetcode: ["user/solutions", "user/archive"]
        },
        lastUsedRepositories: {
            leetcode: "user/archive"
        },
        defaultRepositories: {
            leetcode: "user/solutions"
        }
    };

    assert.equal(chooseRepository("leetcode", settings), "user/archive");
});

test("falls back to the first assigned repository when choices are invalid", () => {
    const settings = {
        platformRepositories: {
            codeforces: ["user/solutions"]
        },
        lastUsedRepositories: {
            codeforces: "user/removed"
        },
        defaultRepositories: {
            codeforces: "user/removed"
        }
    };

    assert.equal(chooseRepository("codeforces", settings), "user/solutions");
});

test("builds language-aware platform and topic paths", () => {
    const result = buildUploadPaths({
        platform: "codeforces",
        title: "Graph Paths",
        slug: "graph-paths",
        language: "GNU C++17",
        difficulty: "Hard",
        topic: "Graphs"
    }, {
        organizeBy: "platform-topic-difficulty"
    });

    assert.equal(result.solutionPath, "Codeforces/Graphs/Hard/Graph-Paths.cpp");
    assert.equal(result.notesPath, "Codeforces/Graphs/Hard/README.md");
});

test("places contest solutions under the contest directory", () => {
    const result = buildUploadPaths({
        platform: "leetcode",
        title: "Two Sum",
        language: "Python3",
        contest: {
            isContest: true,
            name: "Weekly Contest 1"
        }
    });

    assert.equal(result.solutionPath, "Contests/Weekly-Contest-1/Two-Sum.py");
    assert.equal(result.contest, "Weekly Contest 1");
});

test("round-trips generated README dashboard entries", () => {
    const entries = [{
        platform: "LeetCode",
        title: "Two Sum",
        slug: "two-sum",
        difficulty: "Easy",
        language: "Python3",
        topic: "Arrays",
        contest: "",
        url: "https://leetcode.com/problems/two-sum/",
        path: "LeetCode/Two-Sum.py",
        notesPath: "",
        uploadedAt: "2026-09-09T00:00:00.000Z"
    }];

    const readme = buildReadmeDashboard(entries);
    const parsed = parseReadmeEntries(readme);

    assert.equal(parsed.length, 1);
    assert.equal(entryKey(parsed[0]), "LeetCode:Two-Sum");
    assert.equal(parsed[0].title, "Two Sum");
    assert.equal(parsed[0].path, "LeetCode/Two-Sum.py");
});

test("preserves user README content while replacing the generated section", () => {
    const original = "# My Solutions\n\nPersonal notes.\n";
    const first = mergeReadmeDashboard(original, []);
    const second = mergeReadmeDashboard(first, [{
        platform: "CodeChef",
        title: "Example",
        slug: "example",
        url: "https://www.codechef.com/problems/EXAMPLE",
        path: "CodeChef/Example.cpp"
    }]);

    assert.match(second, /^# My Solutions/);
    assert.match(second, /Personal notes\./);
    assert.match(second, /\| CodeChef \|/);
});

test("normalizes parser output into the versioned problem contract", () => {
    const problem = normalizeProblem({
        platform: "leetcode",
        title: " Two Sum ",
        slug: "two-sum",
        url: " https://leetcode.com/problems/two-sum/ ",
        tags: ["Array", "Array", ""],
        accepted: "yes",
        contest: {
            isContest: true,
            name: " Weekly Contest 1 "
        }
    });

    assert.equal(problem.contractVersion, 1);
    assert.equal(problem.captureConfidence, 0.6);
    assert.deepEqual(problem.missingFields, ["language", "code"]);
    assert.equal(problem.title, "Two Sum");
    assert.deepEqual(problem.tags, ["Array"]);
    assert.equal(problem.accepted, null);
    assert.equal(problem.contest.name, "Weekly Contest 1");
});

test("rejects invalid problem contracts before upload", () => {
    assert.throws(
        () => validateProblem(normalizeProblem({
            platform: "unknown",
            title: "Example",
            slug: "example",
            url: "https://example.com"
        })),
        /Unsupported platform/
    );

    assert.throws(
        () => validateProblem(normalizeProblem({
            platform: "leetcode",
            title: "Example",
            slug: "example",
            url: "https://leetcode.com/problems/example/",
            accepted: false,
            code: "solution()"
        })),
        /accepted solution/
    );
});

test("reports missing capture fields with a confidence score", () => {
    const diagnostics = getProblemDiagnostics({
        title: "Example",
        slug: "example",
        url: "https://example.com"
    });

    assert.deepEqual(diagnostics.missing, ["language", "code"]);
    assert.equal(diagnostics.confidence, 0.6);
});