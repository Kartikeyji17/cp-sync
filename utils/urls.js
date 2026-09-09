export function safeExternalUrl(value) {
    try {
        const url = new URL(String(value || ""));

        return url.protocol === "http:" || url.protocol === "https:"
            ? url.href
            : "";
    }
    catch {
        return "";
    }
}