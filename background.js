browser.runtime.onMessage.addListener((message) => {
  if (message.type !== "download-req") {
    return undefined;
  }

  const blob = new Blob([message.content], {
    type: "text/plain"
  });

  const blobUrl = URL.createObjectURL(blob);

  return browser.downloads.download({
    url: blobUrl,
    filename: message.filename,
    saveAs: true,
    conflictAction: "uniquify"
  }).finally(() => {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  });
});
