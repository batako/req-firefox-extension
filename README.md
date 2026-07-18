# Req Firefox Extension

Firefox DevTools extension for exporting Network requests as `.req` files.

## Install

Install from Firefox Add-ons:

- https://addons.mozilla.org/en-US/firefox/addon/req-export/

## What It Does

- Adds a **Req** panel to Firefox DevTools
- Lists request candidates that are likely worth exporting, such as requests with a body, query string, authorization, cookies, JSON, or multipart form data
- Exports a selected request as a `.req` file through Firefox's download flow

## Development

1. Open `about:debugging`
2. Select **This Firefox**
3. Click **Load Temporary Add-on**
4. Select `manifest.json`

Open DevTools and use the **Req** panel.

## Packaging

To create a submission ZIP:

```sh
sh package-extension.sh
```

The archive is generated under `dist/` as `req-export-<version>.zip`.
