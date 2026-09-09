import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

test("manifest declares the extension entry points and required permissions", async () => {
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));

    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.background.service_worker, "background.js");
    assert.equal(manifest.action.default_popup, "popup.html");
    assert.equal(manifest.options_page, "options/options.html");
    assert.ok(manifest.permissions.includes("storage"));
    assert.ok(manifest.permissions.includes("alarms"));

    await access(join(root, manifest.background.service_worker));
    await access(join(root, manifest.action.default_popup));
    await access(join(root, manifest.options_page));
});

test("manifest content scripts reference existing parser and adapter files", async () => {
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));

    for (const contentScript of manifest.content_scripts) {
        assert.ok(contentScript.matches.length > 0);

        for (const script of contentScript.js)
            await access(join(root, script));
    }
});