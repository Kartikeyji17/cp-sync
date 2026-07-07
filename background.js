import { uploadSolution } from "./uploader/githubUploader.js";

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

        uploadSolution(message.problem)
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

});
