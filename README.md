# YouTube to MP3

Firefox extension that downloads the current YouTube video as an MP3 **on your
VPS**. The extension itself only makes the request: it reads your YouTube
cookies (including `httpOnly` ones) and posts them together with the video
metadata to `https://yt.eijiens.ing/download`, where the download and conversion
happen server-side.

Unlike the Tampermonkey script it replaces, this extension does not rely on
YouTube's page UI: it reads the video's metadata from a few stable meta tags
and injects a small function into the page on demand (via `scripting`), so a
YouTube redesign does not break it.

## How it works

1. Click the extension's toolbar icon → the popup shows the current tab's video
   and a **Download MP3** button.
2. The popup reads the active tab's URL (`tabs` permission) and injects a small
   function into the tab (`scripting` permission) to read the video title,
   channel/artist and duration. Title falls back to the tab title if the page is
   still loading.
3. The popup formats the metadata as `youtube_data`
   (`{ youtube_slug, title, artist, duration_seconds }`) and asks the background
   script to call `POST https://yt.eijiens.ing/exists` with the `x-api-key`
   header. `youtube_slug` is just the bare video id (`?v=abc123def45` →
   `abc123def45`), not a full URL; Shorts/Live/Embed URLs yield the same id.
   Pages that are not a single video (channels, playlists) keep the button
   disabled.
   - If the response's `matches` contains `song_exact`, the video was already
     downloaded: the button is disabled and the popup says so.
   - Any other non-zero verdict / non-empty `matches` shows a warning, but the
     download stays enabled.
4. On click, the popup reads the active tab's YouTube cookies with
   `browser.cookies.getAll({ url: "https://www.youtube.com/" })` — including
   httpOnly ones, which page JavaScript cannot see but privileged extension
   code can — formats them as a Netscape `cookies.txt`, and sends
   `{ cookies, youtube_data }` to `POST https://yt.eijiens.ing/download`.
   (Doing the fetch in the background means the request is not aborted if the
   popup closes while it's in flight.)

   Firefox's MV3 uses `background.scripts` (an event page) rather than
   `background.service_worker`; the latter is only supported from Firefox 121.
5. The VPS downloads and converts the video and records it in its metadata
   database for future `/exists` checks. The popup shows
   `Success! MP3 conversion started.`, or the server's error response. If the
   server reports that the audio was already downloaded, the popup shows a
   warning instead.

## Permissions used

| Permission | Why |
|-----------|-----|
| `cookies` | Read YouTube cookies (incl. httpOnly) |
| `tabs` | Read the active tab's URL and title |
| `scripting` | Inject the metadata reader into the active YouTube tab |
| `host_permissions: *://*.youtube.com/*` | Gate which domains the cookies API may read and where scripts may be injected |
| `host_permissions: https://yt.eijiens.ing/*` | Allow requests to `/exists` and `/download` |

## Configuration

`API_BASE` (server origin) and `API_KEY` (sent as `x-api-key`) are hardcoded at
the top of `background.js`.

## Install (temporary, for development)

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json` from this folder.
3. Or, with `web-ext` installed: `npx web-ext run --start-url https://www.youtube.com/`

## Optional toolbar icon

The extension works without icons (Firefox shows a generic button). If you want
a proper icon, generate it and uncomment the `action.default_icon` / `icons`
keys in `manifest.json`:

```bash
python3 scripts/make-icons.py
```
