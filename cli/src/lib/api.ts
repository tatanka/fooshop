import { getApiKey, getBaseUrl } from "./config.js";

function ensureAuth(): string {
  const key = getApiKey();
  if (!key) {
    console.error("Not logged in. Run `fooshop login` first.");
    process.exit(1);
  }
  return key;
}

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const key = ensureAuth();
  const baseUrl = getBaseUrl();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
  };

  const init: RequestInit = { method, headers };

  if (body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch {
    console.error("Connection failed. Check your internet or try again.");
    process.exit(1);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    console.error(data.error || `Request failed: ${res.status}`);
    process.exit(1);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: object) => request<T>("POST", path, body),
  put: <T>(path: string, body: object) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
