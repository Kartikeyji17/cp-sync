import { uploadSolution } from "./uploader/githubUploader.js";
import { detectPlatformFromUrl } from "./utils/platform.js";
import { getRepositoriesForPlatform } from "./utils/repositories.js";
import { initializeStorage } from "./utils/storage.js";
import {
    cancelUploadJob,
    createUploadJob,
    getUploadJobs,
    saveUploadJob,
    transitionUploadJob
} from "./utils/uploadJobs.js";

const storageReady = initializeStorage().catch((error) => {
    console.error("CP Sync storage initialization failed", error);
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith("cp-sync-retry:"))
        return;

    const jobId = alarm.name.slice("cp-sync-retry:".length);

    storageReady
        .then(() => retryStoredJob(jobId))
        .catch((error) => console.error("CP Sync retry failed", error));
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("CP Sync Loaded");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "GET_ACTIVE_TAB") {

        chrome.tabs.query(
            {
                active: true,
                currentWindow: true
            },
            (tabs) => {

                if (!tabs.length) {

                    sendResponse(null);
                    return;

                }

                sendResponse({

                    id: tabs[0].id,
                    url: tabs[0].url,
                    title: tabs[0].title

                });

            }
        );

        return true;
    }

    if (message.type === "SEND_TO_TAB") {

        chrome.tabs.sendMessage(

            message.tabId,

            message.payload,

            (response) => {

                if (chrome.runtime.lastError) {

                    sendResponse({

                        success: false,
                        error: chrome.runtime.lastError.message

                    });

                    return;

                }

                sendResponse({

                    success: true,
                    data: response

                });

            }

        );

        return true;
    }

    if (message.type === "UPLOAD_SOLUTION") {

        storageReady
            .then(() => runUploadJob(message.problem, {
                repository: message.repository,
                force: message.force === true,
                resumeCompleted: message.resumeCompleted,
                resumeCommits: message.resumeCommits
            }))
            .then((result) => {
                sendResponse({
                    success: true,
                    data: result
                });
            })
            .catch((error) => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });

        return true;
    }

    if (message.type === "CANCEL_UPLOAD_JOB") {
        storageReady
            .then(() => cancelUploadJob(message.jobId))
            .then((job) => sendResponse({ success: true, data: job }))
            .catch((error) => sendResponse({ success: false, error: error.message }));

        return true;
    }

    if (message.type === "RETRY_UPLOAD_JOB") {
        storageReady
            .then(() => retryStoredJob(message.jobId))
            .then((result) => sendResponse({ success: true, data: result }))
            .catch((error) => sendResponse({ success: false, error: error.message }));

        return true;
    }

    if (message.type === "GET_PLATFORM_REPOSITORIES") {

        const platform = message.platform || detectPlatformFromUrl(message.url || sender.tab?.url || "");

        storageReady
            .then(() => getRepositoriesForPlatform(platform))
            .then((result) => {
                sendResponse({
                    success: true,
                    data: {
                        platform,
                        ...result
                    }
                });
            })
            .catch((error) => {
                sendResponse({
                    success: false,
                    error: error.message
                });
            });

        return true;
    }

});

async function runUploadJob(problem, options) {
    let job = createUploadJob(problem, options.repository);
    await saveUploadJob(job);

    job = transitionUploadJob(job, "uploading");
    await saveUploadJob(job);

    try {
        const result = await uploadSolution(problem, options);
        const terminalState = result?.skipped ? "skipped" : "succeeded";

        job = transitionUploadJob(job, terminalState, {
            result,
            idempotencyKey: result?.idempotencyKey || job.idempotencyKey,
            error: ""
        });
        await saveUploadJob(job);

        return {
            ...result,
            jobId: job.id
        };
    }
    catch (error) {
        const nextState = error.status === 409 ? "conflict" : "failed";

        job = transitionUploadJob(job, nextState, {
            error: error.message,
            result: error.partial || null,
            idempotencyKey: error.partial?.idempotencyKey || job.idempotencyKey,
            retryable: isRetryableUploadError(error),
            nextRetryAt: ""
        });
        await saveUploadJob(job);

        scheduleRetry(job, error);
        throw error;
    }
}

async function retryStoredJob(jobId) {
    const jobs = await getUploadJobs();
    const job = jobs.find((item) => item.id === jobId);

    if (!job)
        throw new Error("Upload job not found.");

    const isConflict = job.state === "conflict";

    if ((!isConflict && job.state !== "failed") || job.attempts >= 3 || (!isConflict && job.retryable !== true))
        throw new Error("This upload job is not eligible for retry.");

    const retrying = isConflict
        ? job
        : transitionUploadJob(job, "retrying", {
            error: "",
            nextRetryAt: ""
        });
    const uploading = transitionUploadJob(retrying, "uploading", {
        error: "",
        nextRetryAt: ""
    });
    await saveUploadJob(uploading);

    try {
        const result = await uploadSolution(job.problem, {
            repository: job.repository,
            force: true,
            resumeCompleted: job.result?.completed,
            resumeCommits: job.result?.commits
        });
        const completed = transitionUploadJob(uploading, result?.skipped ? "skipped" : "succeeded", {
            result,
            error: "",
            retryable: false
        });

        await saveUploadJob(completed);
        return result;
    }
    catch (error) {
        const failed = transitionUploadJob(uploading, error.status === 409 ? "conflict" : "failed", {
            error: error.message,
            result: error.partial || null,
            retryable: isRetryableUploadError(error)
        });

        await saveUploadJob(failed);
        scheduleRetry(failed, error);
        throw error;
    }
}

function scheduleRetry(job, error) {
    if (job.state !== "failed" || !isRetryableUploadError(error) || job.attempts >= 3)
        return;

    const delayMinutes = Math.min(2 ** Math.max(job.attempts - 1, 0), 15);
    const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    chrome.alarms.create(`cp-sync-retry:${job.id}`, {
        when: Date.parse(nextRetryAt)
    });

    saveUploadJob({
        ...job,
        nextRetryAt
    }).catch((saveError) => console.error("CP Sync retry schedule save failed", saveError));
}

function isRetryableUploadError(error) {
    return !error.status || [408, 429, 500, 502, 503, 504].includes(error.status);
}
