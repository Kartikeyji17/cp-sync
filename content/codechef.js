console.log("CP Sync: CodeChef loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type !== "CODECHEF_PARSE")
        return;

    const parser = window.CPSyncParsers?.CodeChefParser;

    if (!parser) {
        sendResponse({ error: "CodeChef parser was not loaded." });
        return true;
    }

    sendResponse(parser.parse());

    return true;

});
