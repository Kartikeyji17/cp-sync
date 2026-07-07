console.log("Injected into page");

window.addEventListener("message", (event) => {

    if (event.source !== window)
        return;

    if (event.data.type !== "CP_SYNC_GET_EDITOR")
        return;

    let code = "";
    let language = "";

    try {

        if (
            window.monaco &&
            window.monaco.editor &&
            window.monaco.editor.getModels().length
        ) {

            code = window.monaco
                .editor
                .getModels()[0]
                .getValue();

            language = window.monaco
                .editor
                .getModels()[0]
                .getLanguageId();

        }

    }
    catch (e) {

        console.error(e);

    }

    window.postMessage({

        type: "CP_SYNC_RESULT",

        payload: {

            code,
            language

        }

    });

});
