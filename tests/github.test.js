import test from "node:test";
import assert from "node:assert/strict";

import GitHubService from "../github/github.js";

function response(status, body, headers = {}) {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name) {
                return headers[name] || "";
            }
        },
        async json() {
            return body;
        }
    };
}

test("retries transient GitHub failures before succeeding", async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;

    globalThis.fetch = async () => {
        attempts += 1;

        if (attempts === 1)
            return response(503, { message: "Service unavailable" });

        return response(200, { login: "test-user" });
    };

    try {
        const github = new GitHubService("token");
        const result = await github.getUser();

        assert.deepEqual(result, { login: "test-user" });
        assert.equal(attempts, 2);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});

test("does not retry authentication failures", async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;

    globalThis.fetch = async () => {
        attempts += 1;
        return response(401, { message: "Bad credentials" });
    };

    try {
        const github = new GitHubService("token");

        await assert.rejects(
            () => github.getUser(),
            (error) => error.status === 401 && error.message === "Bad credentials"
        );
        assert.equal(attempts, 1);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});