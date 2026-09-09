import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const ignored = new Set(["node_modules", ".git"]);
const files = [];

async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (ignored.has(entry.name))
            continue;

        const path = join(directory, entry.name);

        if (entry.isDirectory())
            await collect(path);
        else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs"))
            files.push(path);
    }
}

await collect(root);

for (const file of files) {
    await check(file);
    console.log(`Checked ${relative(root, file)}`);
}

function check(file) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["--check", file], { stdio: "inherit" });

        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0)
                resolve();
            else
                reject(new Error(`Syntax check failed for ${relative(root, file)}`));
        });
    });
}