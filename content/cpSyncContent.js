(function () {
    const BUTTON_ID = "cp-sync-upload-button";
    const TOAST_ROOT_ID = "cp-sync-toast-root";
    const PICKER_ID = "cp-sync-repository-picker";
    const ACCEPTED_UPLOADS = new Set();

    window.CPSyncContent = {
        initPlatform
    };

    function initPlatform(config) {
        injectStyles();
        syncUploadMode(config);
        observePage(config);
        monitorAccepted(config);
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === "local" && changes.autoUploadMode)
                syncUploadMode(config);
        });
    }

    function observePage(config) {
        let lastUrl = location.href;
        let scheduled = false;

        const observer = new MutationObserver(() => {
            if (scheduled)
                return;

            scheduled = true;

            window.setTimeout(() => {
                scheduled = false;

                if (location.href !== lastUrl)
                    lastUrl = location.href;

                syncUploadMode(config);
            }, 350);
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    async function syncUploadMode(config) {
        const mode = await getUploadMode();

        if (mode !== "manual") {
            removeButton();
            return;
        }

        recreateButton(config);
    }

    function recreateButton(config) {
        if (document.getElementById(BUTTON_ID))
            return;

        const target = config.findSubmitButton?.();

        if (!target)
            return;

        const button = document.createElement("button");
        button.id = BUTTON_ID;
        button.type = "button";
        button.textContent = "Upload to GitHub";
        button.className = activeClassName(target.className || "");
        button.removeAttribute("disabled");
        button.removeAttribute("aria-disabled");
        button.addEventListener("click", () => startUpload(config, "", { force: true }));
        applyActiveButtonStyles(button, config.platform);

        target.insertAdjacentElement("afterend", button);
    }

    function removeButton() {
        document.getElementById(BUTTON_ID)?.remove();
    }

    async function startUpload(config, repositoryOverride = "", options = {}) {
        let loadingToast = null;

        try {
            const problem = await config.parse();

            if (problem?.error)
                throw new Error(problem.error);

            const repository = repositoryOverride || await chooseRepository(config.platform, {
                interactive: options.interactive !== false
            });

            if (repository === null)
                return;

            if (!repository)
                throw new Error(`No ${platformLabel(config.platform)} repository is assigned.`);

            loadingToast = showToast("Uploading...", {
                tone: "loading",
                persistent: true
            });

            const result = await sendMessage({
                type: "UPLOAD_SOLUTION",
                problem,
                repository,
                force: options.force === true
            });

            if (!result?.success)
                throw new Error(result?.error || "Upload failed.");

            if (result.data?.skipped) {
                showToast(result.data.reason || "Already uploaded", {
                    tone: "success"
                });
                return;
            }

            showToast(`Uploaded successfully \u2713 ${result.data.owner}/${result.data.repo}`, {
                tone: "success"
            });
        }
        catch (error) {
            showToast(classifyError(error.message), {
                tone: "error"
            });
        }
        finally {
            loadingToast?.remove();
        }
    }

    async function chooseRepository(platform, options = {}) {
        const response = await sendMessage({
            type: "GET_PLATFORM_REPOSITORIES",
            platform
        });

        if (!response?.success)
            throw new Error(response?.error || "Could not load repositories.");

        const repositories = response.data.repositories || [];
        const selectedRepository = response.data.selectedRepository || repositories[0] || "";

        if (repositories.length <= 1 || options.interactive === false)
            return selectedRepository;

        return showRepositoryPicker(platform, repositories, selectedRepository);
    }

    function showRepositoryPicker(platform, repositories, selectedRepository) {
        closeRepositoryPicker();

        return new Promise((resolve) => {
            const picker = document.createElement("div");
            picker.id = PICKER_ID;
            picker.innerHTML = `
                <div class="cp-sync-picker-title">${platformLabel(platform)} Repository</div>
                <select class="cp-sync-picker-select">
                    ${repositories.map((repository) => `
                        <option value="${escapeAttribute(repository)}" ${repository === selectedRepository ? "selected" : ""}>
                            ${escapeHtml(repository)}
                        </option>
                    `).join("")}
                </select>
                <div class="cp-sync-picker-actions">
                    <button type="button" data-action="cancel">Cancel</button>
                    <button type="button" data-action="upload">Upload</button>
                </div>
            `;

            picker.querySelector('[data-action="cancel"]').addEventListener("click", () => {
                closeRepositoryPicker();
                resolve(null);
            });

            picker.querySelector('[data-action="upload"]').addEventListener("click", () => {
                const value = picker.querySelector("select").value;
                closeRepositoryPicker();
                resolve(value);
            });

            document.documentElement.appendChild(picker);
        });
    }

    function closeRepositoryPicker() {
        document.getElementById(PICKER_ID)?.remove();
    }

    function monitorAccepted(config) {
        window.setInterval(async () => {
            const mode = await getUploadMode();

            if (mode === "manual")
                return;

            let problem = null;

            try {
                problem = await config.parse();
            }
            catch {
                return;
            }

            if (!problem || problem.accepted !== true)
                return;

            const key = `${config.platform}:${problem.slug}:${location.href}`;

            if (ACCEPTED_UPLOADS.has(key))
                return;

            if (mode === "auto" && !problem.code?.trim()) {
                ACCEPTED_UPLOADS.add(key);
                return;
            }

            ACCEPTED_UPLOADS.add(key);

            if (mode === "ask") {
                showAcceptedPrompt(config);
                return;
            }

            if (mode === "auto")
                await startUpload(config, "", { interactive: false, force: false });
        }, 3000);
    }

    function showAcceptedPrompt(config) {
        const toast = ensureToastRoot();
        const item = document.createElement("div");
        item.className = "cp-sync-toast cp-sync-toast-success";
        item.innerHTML = `
            <div class="cp-sync-toast-title">Accepted \u2713</div>
            <div class="cp-sync-toast-message">Upload to GitHub?</div>
            <div class="cp-sync-toast-actions">
                <button type="button" data-action="upload">Upload</button>
                <button type="button" data-action="cancel">Cancel</button>
            </div>
        `;

        item.querySelector('[data-action="upload"]').addEventListener("click", () => {
            item.remove();
            startUpload(config, "", { interactive: false, force: true });
        });

        item.querySelector('[data-action="cancel"]').addEventListener("click", () => {
            item.remove();
        });

        toast.appendChild(item);
        window.setTimeout(() => item.remove(), 15000);
    }

    function showToast(message, options = {}) {
        const root = ensureToastRoot();
        const item = document.createElement("div");
        item.className = `cp-sync-toast cp-sync-toast-${options.tone || "default"}`;
        item.textContent = message;
        root.appendChild(item);

        if (!options.persistent) {
            window.setTimeout(() => {
                item.style.opacity = "0";
                item.style.transform = "translateY(8px)";
                window.setTimeout(() => item.remove(), 180);
            }, options.tone === "loading" ? 1800 : 4200);
        }

        return item;
    }

    function ensureToastRoot() {
        let root = document.getElementById(TOAST_ROOT_ID);

        if (!root) {
            root = document.createElement("div");
            root.id = TOAST_ROOT_ID;
            document.documentElement.appendChild(root);
        }

        return root;
    }

    function sendMessage(payload) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(payload, resolve);
        });
    }

    function applyActiveButtonStyles(button, platform) {
        button.style.marginLeft = "8px";
        button.style.cursor = "pointer";
        button.style.opacity = "1";
        button.style.filter = "none";
        button.style.pointerEvents = "auto";

        if (platform === "leetcode") {
            button.style.borderRadius = "6px";
            button.style.padding = "8px 12px";
        }

        if (platform === "codeforces")
            button.style.marginRight = "6px";

        if (platform === "codechef")
            button.style.borderRadius = "4px";
    }

    function activeClassName(className) {
        return String(className)
            .split(/\s+/)
            .filter((classToken) => classToken && !/disabled|inactive|loading/i.test(classToken))
            .join(" ");
    }

    async function getUploadMode() {
        const settings = await chrome.storage.local.get(["autoUploadMode"]);

        return normalizeUploadMode(settings.autoUploadMode);
    }

    function normalizeUploadMode(value) {
        if (value === "ask" || value === "auto" || value === "manual")
            return value;

        return "manual";
    }

    function injectStyles() {
        if (document.getElementById("cp-sync-content-styles"))
            return;

        const style = document.createElement("style");
        style.id = "cp-sync-content-styles";
        style.textContent = `
            #cp-sync-toast-root {
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 2147483647;
                display: grid;
                gap: 10px;
                max-width: min(360px, calc(100vw - 36px));
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .cp-sync-toast {
                padding: 12px 14px;
                border: 1px solid rgba(23, 32, 38, 0.12);
                border-radius: 10px;
                background: #172026;
                color: #ffffff;
                box-shadow: 0 14px 40px rgba(23, 32, 38, 0.22);
                font-size: 13px;
                line-height: 18px;
                transition: opacity 180ms ease, transform 180ms ease;
            }

            .cp-sync-toast-success {
                background: #116149;
            }

            .cp-sync-toast-error {
                background: #9f2d2d;
            }

            .cp-sync-toast-loading {
                background: #33515f;
            }

            .cp-sync-toast-title {
                font-weight: 800;
            }

            .cp-sync-toast-message {
                margin-top: 4px;
            }

            .cp-sync-toast-actions,
            .cp-sync-picker-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }

            .cp-sync-toast-actions button,
            #cp-sync-repository-picker button {
                min-height: 32px;
                padding: 6px 10px;
                border: 0;
                border-radius: 7px;
                background: #ffffff;
                color: #172026;
                cursor: pointer;
                font: inherit;
                font-weight: 700;
            }

            #cp-sync-repository-picker {
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 2147483647;
                width: min(360px, calc(100vw - 36px));
                padding: 14px;
                border: 1px solid rgba(23, 32, 38, 0.12);
                border-radius: 12px;
                background: #ffffff;
                color: #172026;
                box-shadow: 0 18px 50px rgba(23, 32, 38, 0.24);
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .cp-sync-picker-title {
                margin-bottom: 8px;
                font-size: 13px;
                font-weight: 800;
            }

            .cp-sync-picker-select {
                width: 100%;
                min-height: 38px;
                padding: 8px 10px;
                border: 1px solid #d7d8d2;
                border-radius: 8px;
                background: #ffffff;
                color: #172026;
                font: inherit;
            }
        `;

        document.documentElement.appendChild(style);
    }

    function classifyError(message = "") {
        if (/already exists/i.test(message))
            return "Already Exists";

        if (/github|bad credentials|not found|resource not accessible|validation failed|rate limit/i.test(message))
            return `GitHub Error: ${message}`;

        return `Upload Failed: ${message}`;
    }

    function platformLabel(platform) {
        return {
            leetcode: "LeetCode",
            codeforces: "Codeforces",
            codechef: "CodeChef"
        }[platform] || platform;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/'/g, "&#39;");
    }
})();
