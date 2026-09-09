import test from "node:test";
import assert from "node:assert/strict";

import { uploadSolution } from "../uploader/githubUploader.js";

function jsonResponse(status, body) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get() {
                return "";
            }
        },
        async json() {
            return body;
        }
    };
}

function installChromeStorage(initial = {}) {
    const data = { ...initial };

    globalThis.chrome = {
        storage: {
            local: {
                async get(keys) {
                    if (!keys)
                        return { ...data };

                    return Object.fromEntries(keys.map((key) => [key, data[key]]));
                },
                async set(values) {
                    Object.assign(data, values);
                }
            }
        }
    };

    return data;
}

function problem() {
    return {
        platform: "leetcode",
        title: "Two Sum",
        slug: "two-sum",
        url: "https://leetcode.com/problems/two-sum/",
        language: "Python3",
        code: "return nums",
        difficulty: "Easy",
        accepted: true,
        tags: ["Array"],
        topic: "Array",
        contest: { isContest: false, name: "", platform: "leetcode" }
    };
}

test("uploads a solution and records its GitHub commits", async () => {
    const originalFetch = globalThis.fetch;
    const data = installChromeStorage({
        token: "token",
        platformRepositories: { leetcode: ["user/solutions"] },
        defaultRepositories: { leetcode: "user/solutions" },
        lastUsedRepositories: { leetcode: "" },
        uploadHistory: [],
        reviewRecords: []
    });
    const requests = [];

    globalThis.fetch = async (url, options = {}) => {
        requests.push({ url, method: options.method || "GET" });

        if (url.endsWith("/repos/user/solutions"))
            return jsonResponse(200, { full_name: "user/solutions" });

        if (url.includes("/contents/LeetCode/Two-Sum.py") && !options.method)
            return jsonResponse(404, { message: "Not Found" });

        if (url.includes("/contents/README.md") && !options.method)
            return jsonResponse(404, { message: "Not Found" });

        if (options.method === "PUT")
            return jsonResponse(200, { commit: { sha: `sha-${requests.length}` } });

        throw new Error(`Unexpected request: ${url}`);
    };

    try {
        const result = await uploadSolution(problem(), {
            repository: "user/solutions"
        });

        assert.equal(result.skipped, false);
        assert.equal(result.completed.solution, true);
        assert.equal(result.completed.readme, true);
        assert.equal(result.idempotencyKey, "leetcode:two-sum:user/solutions:leetcode/two-sum.py:python3");
        assert.ok(result.commits.solution);
        assert.ok(result.commits.readme);
        assert.equal(data.uploadHistory.length, 1);
        assert.equal(data.reviewRecords.length, 1);
        assert.ok(requests.some((request) => request.method === "PUT"));
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});

test("returns partial completion metadata when README write fails", async () => {
    const originalFetch = globalThis.fetch;
    installChromeStorage({
        token: "token",
        platformRepositories: { leetcode: ["user/solutions"] },
        defaultRepositories: { leetcode: "user/solutions" },
        lastUsedRepositories: { leetcode: "" },
        uploadHistory: [],
        reviewRecords: []
    });

    globalThis.fetch = async (url, options = {}) => {
        if (url.endsWith("/repos/user/solutions"))
            return jsonResponse(200, { full_name: "user/solutions" });

        if (url.includes("/contents/LeetCode/Two-Sum.py") && !options.method)
            return jsonResponse(404, { message: "Not Found" });

        if (url.includes("/contents/README.md") && !options.method)
            return jsonResponse(404, { message: "Not Found" });

        if (options.method === "PUT" && url.includes("README.md"))
            return jsonResponse(422, { message: "README rejected" });

        if (options.method === "PUT")
            return jsonResponse(200, { commit: { sha: "solution-sha" } });

        throw new Error(`Unexpected request: ${url}`);
    };

    try {
        await assert.rejects(
            () => uploadSolution(problem(), { repository: "user/solutions" }),
            (error) => error.partial?.completed.solution === true
                && error.partial.completed.readme === false
        );
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});