console.log("CP Sync: Codeforces loaded");

window.CPSyncContent.initPlatform({
    platform: "codeforces",
    parse: parseCodeforces,
    findSubmitButton: findSubmitButton
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type !== "CODEFORCES_PARSE")
        return;

    sendResponse(parseCodeforces());

    return true;

});

function parseCodeforces() {
    const parser = window.CPSyncParsers?.CodeforcesParser;

    if (!parser)
        return { error: "Codeforces parser was not loaded." };

    return parser.parse();
}

function findSubmitButton() {
    return Array.from(document.querySelectorAll("input[type='submit'], button"))
        .find((element) => /submit/i.test(element.value || element.textContent || ""));
}
