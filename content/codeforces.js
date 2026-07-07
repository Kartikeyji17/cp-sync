console.log("CP Sync: Codeforces loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type !== "CODEFORCES_PARSE")
        return;

    const parser = window.CPSyncParsers?.CodeforcesParser;

    if (!parser) {
        sendResponse({ error: "Codeforces parser was not loaded." });
        return true;
    }

    sendResponse(parser.parse());

    return true;

});
