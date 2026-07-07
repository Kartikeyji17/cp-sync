console.log("CP Sync: LeetCode loaded");

function inject() {

    const script = document.createElement("script");

    script.src = chrome.runtime.getURL("inject/leetcodeInject.js");

    script.onload = () => script.remove();

    (document.head || document.documentElement).appendChild(script);

}

inject();

window.CPSyncContent.initPlatform({
    platform: "leetcode",
    parse: parseLeetCode,
    findSubmitButton: findSubmitButton
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type !== "LEETCODE_PARSE")
        return;

    parseLeetCode()
        .then((editorData) => {
            sendResponse(editorData);
        })
        .catch((error) => {
            sendResponse({
                error: error.message
            });
        });

    return true;

});

async function parseLeetCode() {
    const parser = window.CPSyncParsers?.LeetCodeParser;

    if (!parser)
        return { error: "LeetCode parser was not loaded." };

    const editorData = await getEditorData();

    return parser.parse(editorData);
}

function findSubmitButton() {
    return Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent.trim() === "Submit");
}

function getEditorData() {

    return new Promise((resolve) => {
        const timeout = window.setTimeout(() => {
            window.removeEventListener("message", listener);
            resolve({});
        }, 800);

        const listener = (event) => {
            if (event.source !== window || event.data?.type !== "CP_SYNC_RESULT")
                return;

            window.clearTimeout(timeout);
            window.removeEventListener("message", listener);
            resolve(event.data.payload || {});
        };

        window.addEventListener("message", listener);
        window.postMessage({ type: "CP_SYNC_GET_EDITOR" }, "*");
    });

}
