const status = document.getElementById("status");
const uploadButton = document.getElementById("upload");

function setStatus(text) {
    status.textContent = text;
}

chrome.storage.local.get(["token"], (data) => {
    setStatus(data.token ? "GitHub Connected" : "GitHub Not Connected");
});

document.getElementById("connect").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
});

uploadButton.addEventListener("click", () => {
    uploadButton.disabled = true;
    setStatus("Reading current problem...");

    chrome.runtime.sendMessage({ type: "GET_ACTIVE_TAB" }, (tab) => {
        if (!tab) {
            finish("No active tab found.");
            return;
        }

        const messageType = parseMessageType(tab.url || "");

        if (!messageType) {
            finish("Open a LeetCode, Codeforces, or CodeChef problem first.");
            return;
        }

        setStatus("Extracting accepted solution...");

        chrome.runtime.sendMessage(
            {
                type: "SEND_TO_TAB",
                tabId: tab.id,
                payload: { type: messageType }
            },
            (response) => {
                if (!response?.success) {
                    finish(response?.error || "Could not read this page.");
                    return;
                }

                if (response.data?.error) {
                    finish(response.data.error);
                    return;
                }

                uploadParsedSolution(response.data);
            }
        );
    });
});

function parseMessageType(url) {
    if (url.includes("leetcode.com")) return "LEETCODE_PARSE";
    if (url.includes("codeforces.com")) return "CODEFORCES_PARSE";
    if (url.includes("codechef.com")) return "CODECHEF_PARSE";

    return "";
}

function uploadParsedSolution(problem) {
    setStatus("Uploading to GitHub...");

    chrome.runtime.sendMessage(
        {
            type: "UPLOAD_SOLUTION",
            problem
        },
        (response) => {
            if (!response?.success) {
                finish(response?.error || "Upload failed.");
                return;
            }

            const result = response.data;
            finish(`Uploaded ${result.owner}/${result.repo}`);
            alert(`Uploaded to ${result.owner}/${result.repo}/${result.path}`);
        }
    );
}

function finish(message) {
    uploadButton.disabled = false;
    setStatus(message);

    if (!message.startsWith("Uploaded"))
        alert(message);
}
