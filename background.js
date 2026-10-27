// The conversion happens on the VPS; this worker only forwards the request.
// Doing the fetch here (instead of in the popup) means it is not aborted if
// the popup closes while the request is in flight.
//
// Debug: open about:debugging#/runtime/this-firefox -> Inspect next to the
// extension to see the console.log output from this script.
const API_BASE = "https://yt.eijiens.ing";
const API_KEY = "test123";
// fetch() has no built-in timeout; without this a server that never replies
// would hang the request forever.
const EXISTS_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 60_000;

// All endpoints expect the API key as a header and the video metadata
// supplied by the extension under `youtube_data`.
async function post(path, payload, timeoutMs) {
  const url = API_BASE + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  console.log("[yt-mp3] POST", url, payload.youtube_data);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // Always read the body so we can log how much the server actually sent.
    const text = await response.text();
    console.log(
      "[yt-mp3] response",
      response.status,
      "bytes:",
      text.length,
      "body:",
      text.slice(0, 500),
    );

    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text };
      }
    }

    return { ok: response.ok, status: response.status, body };
  } catch (err) {
    console.error("[yt-mp3] fetch failed:", err);
    if (err.name === "AbortError") {
      throw new Error(
        `No response from server within ${timeoutMs / 1000}s. ` +
          "The server accepted the request but never replied. " +
          "Check the server logs / curl the endpoint directly.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function exists(youtubeData) {
  return post("/exists", { youtube_data: youtubeData }, EXISTS_TIMEOUT_MS);
}

function download({ cookies, youtubeData }) {
  return post(
    "/download",
    { cookies, youtube_data: youtubeData },
    DOWNLOAD_TIMEOUT_MS,
  );
}

browser.runtime.onMessage.addListener((message) => {
  if (!message) return undefined;

  // Returning a promise keeps the message channel open for the response.
  if (message.type === "exists") {
    return exists(message.youtubeData);
  }
  if (message.type === "download") {
    return download(message);
  }
  return undefined;
});
