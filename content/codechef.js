console.log("CP Sync: CodeChef loaded");

window.CPSyncContent.initPlatform({
    platform: "codechef",
    parse: parseCodeChef,
    findSubmitButton: findSubmitButton
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type !== "CODECHEF_PARSE")
        return;

    sendResponse(parseCodeChef());

    return true;

});

function parseCodeChef() {
    const parser = window.CPSyncParsers?.CodeChefParser;

    if (!parser)
        return { error: "CodeChef parser was not loaded." };

    return parser.parse();
}

function findSubmitButton() {
    return Array.from(document.querySelectorAll("button, input[type='submit']"))
        .find((element) => /submit/i.test(element.value || element.textContent || ""));
}
