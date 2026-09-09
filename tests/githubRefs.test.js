import test from "node:test";
import assert from "node:assert/strict";

import { parseRepositoryRef } from "../utils/githubRefs.js";

test("parses a valid GitHub owner and repository reference", () => {
    assert.deepEqual(parseRepositoryRef("user/solutions"), {
        owner: "user",
        repo: "solutions"
    });
});

test("rejects malformed repository references", () => {
    assert.throws(() => parseRepositoryRef("user"), /invalid/);
    assert.throws(() => parseRepositoryRef("user/solutions/extra"), /invalid/);
    assert.throws(() => parseRepositoryRef("user name/solutions"), /invalid/);
});