import { cp, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const manifestPath = join(root, "manifest.json");
const packagePath = join(root, "package.json");
const outputDirectory = join(root, "dist");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const packageMetadata = JSON.parse(await readFile(packagePath, "utf8"));

if (!manifest.version || manifest.version !== packageMetadata.version)
    throw new Error(`manifest.json and package.json must use the same version (found ${manifest.version} and ${packageMetadata.version})`);

const stage = await mkdtemp(join(tmpdir(), "cp-sync-release-"));
const archivePath = join(outputDirectory, `cp-sync-v${manifest.version}.zip`);

const releasePaths = [
    "manifest.json",
    "background.js",
    "popup.css",
    "popup.html",
    "popup.js",
    "content",
    "github",
    "icons",
    "inject",
    "options",
    "platforms",
    "uploader",
    "utils"
];

try {
    await mkdir(outputDirectory, { recursive: true });
    await rm(archivePath, { force: true });

    for (const releasePath of releasePaths) {
        const source = join(root, releasePath);
        const target = join(stage, releasePath);
        await cp(source, target, { recursive: true });
    }

    if (process.platform === "win32") {
        await execFileAsync(
            "powershell.exe",
            [
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Compress-Archive -Path (Join-Path $env:CP_SYNC_STAGE '*') -DestinationPath $env:CP_SYNC_ARCHIVE -CompressionLevel Optimal"
            ],
            {
                cwd: root,
                env: {
                    ...process.env,
                    CP_SYNC_STAGE: stage,
                    CP_SYNC_ARCHIVE: archivePath
                }
            }
        );
    } else {
        await execFileAsync("zip", ["-qr", archivePath, "."], {
            cwd: stage,
            env: process.env
        });
    }

    console.log(`Packaged ${relative(root, archivePath)}`);
} finally {
    await rm(stage, { recursive: true, force: true });
}
