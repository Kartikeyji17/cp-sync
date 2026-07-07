export default class GitHubService {

    constructor(token) {
        this.token = token;
        this.baseUrl = "https://api.github.com";
    }

    async request(endpoint, options = {}) {

        const response = await fetch(
            this.baseUrl + endpoint,
            {
                ...options,

                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    ...(options.headers || {})
                }
            }
        );

        if (!response.ok) {

            let errorMessage = `GitHub Error ${response.status}`;

            try {
                const err = await response.json();
                errorMessage = err.message || errorMessage;
            } catch {}

            throw new Error(errorMessage);
        }

        return await response.json();
    }

    async requestMaybeEmpty(endpoint, options = {}) {

        const response = await fetch(
            this.baseUrl + endpoint,
            {
                ...options,
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                    ...(options.headers || {})
                }
            }
        );

        if (!response.ok) {

            let errorMessage = `GitHub Error ${response.status}`;

            try {
                const err = await response.json();
                errorMessage = err.message || errorMessage;
            } catch {}

            throw new Error(errorMessage);
        }

        if (response.status === 204)
            return null;

        return await response.json();
    }

    async getUser() {

        return await this.request("/user");

    }

    async getRepositories() {

        const repositories = [];
        let page = 1;

        while (true) {

            const batch = await this.request(
                `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`
            );

            repositories.push(...batch);

            if (batch.length < 100)
                break;

            page += 1;
        }

        return repositories;

    }

    async createRepository(name, options = {}) {

        return await this.request(
            "/user/repos",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    private: options.private !== false,
                    auto_init: true,
                    description: options.description || "Competitive programming solutions synced by CP Sync"
                })
            }
        );

    }

    async getFile(owner, repo, path) {

        return await this.request(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`
        );

    }

    async getFileContent(owner, repo, path) {

        const file = await this.getFile(owner, repo, path);

        return {
            sha: file.sha,
            content: decodeBase64(file.content || "")
        };

    }

    async createOrUpdateFile(owner, repo, path, content, message) {

        let sha = null;

        try {

            const existing =
                await this.getFile(
                    owner,
                    repo,
                    path
                );

            sha = existing.sha;

        }
        catch {

            sha = null;

        }

        const body = {

            message,

            content: encodeBase64(content)

        };

        if (sha)
            body.sha = sha;

        return await this.requestMaybeEmpty(

            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}`,

            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(body)
            }

        );

    }

}

function encodePath(path) {

    return path
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");

}

function encodeBase64(value) {

    const bytes = new TextEncoder().encode(value);
    let binary = "";

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary);

}

function decodeBase64(content) {

    const cleaned = content.replace(/\s/g, "");
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return new TextDecoder().decode(bytes);

}
