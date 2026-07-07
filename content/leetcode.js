console.log("CP Sync: LeetCode loaded");

function inject() {

    const script = document.createElement("script");

    script.src = chrome.runtime.getURL("inject/leetcodeInject.js");

    script.onload = () => script.remove();

    (document.head || document.documentElement).appendChild(script);

}

inject();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type !== "LEETCODE_PARSE")
        return;

    getEditorData()
        .then((editorData) => {
            const parser = window.CPSyncParsers?.LeetCodeParser;

            if (!parser) {
                sendResponse({ error: "LeetCode parser was not loaded." });
                return;
            }

            sendResponse(parser.parse(editorData));
        })
        .catch((error) => {
            sendResponse({
                error: error.message
            });
        });

    return true;

});

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
