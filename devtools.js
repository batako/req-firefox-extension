if (browser.devtools && browser.devtools.panels) {
  browser.devtools.panels.create(
    "Req",
    "icons/panel.png",
    "panel.html"
  );
} else {
  browser.runtime.onMessage.addListener((message) => {
    if (message.type !== "download-req") {
      return undefined;
    }

    const blob = new Blob([message.content], {
      type: "text/plain"
    });

    const blobUrl = URL.createObjectURL(blob);
    if (typeof blobUrl !== "string") {
      throw new Error(`URL.createObjectURL() returned ${String(blobUrl)}`);
    }

    return browser.downloads.download({
      url: blobUrl,
      filename: message.filename,
      saveAs: true,
      conflictAction: "uniquify"
    }).finally(() => {
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    });
  });
}
