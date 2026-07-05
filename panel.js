let reloadTimer = null;
let currentEntries = [];
let clearedAt = 0;

const messages = {
  en: {
    method: "Method",
    status: "Status",
    payload: "Parameters",
    time: "Time",
    path: "Path",
    filterPlaceholder: "Filter requests",
    clearRequests: "Clear requests",
    loading: "Loading...",
    noCandidates: "No request candidates",
    noMatches: "No matching requests",
    failedLoad: "Failed to load requests",
    failedDownload: "Failed to save .req file"
  },
  ja: {
    method: "メソッド",
    status: "状態",
    payload: "パラメータ",
    time: "時刻",
    path: "パス",
    filterPlaceholder: "リクエストを検索",
    clearRequests: "リクエストをクリア",
    loading: "読み込み中...",
    noCandidates: "候補のリクエストがありません",
    noMatches: "一致するリクエストがありません",
    failedLoad: "リクエストの読み込みに失敗しました",
    failedDownload: ".req の保存に失敗しました"
  }
};

const locale = navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
const t = messages[locale];

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t[element.dataset.i18n] || "";
  });

  document.querySelectorAll("[data-i18n-title]").forEach(element => {
    const text = t[element.dataset.i18nTitle] || "";
    element.title = text;
    element.setAttribute("aria-label", text);
  });

  document.getElementById("search").placeholder = t.filterPlaceholder;
}

function getHeaderValue(headers, name) {
  return headers.find(h => h.name.toLowerCase() === name)?.value || "";
}

function getDisplayPath(urlString) {
  const url = new URL(urlString);
  return `${url.pathname || "/"}${url.search}`;
}

function getEntryTime(entry) {
  if (!entry.startedDateTime) return "-";

  const date = new Date(entry.startedDateTime);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function getEntryTimestamp(entry) {
  if (!entry.startedDateTime) return 0;

  const timestamp = new Date(entry.startedDateTime).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isAfterClear(entry) {
  if (clearedAt === 0) return true;

  const timestamp = getEntryTimestamp(entry);
  return timestamp > clearedAt;
}

function getRequestPayload(entry) {
  const payload = entry.request?.postData?.text || "";
  return payload.replace(/\s+/g, " ").trim() || "-";
}

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function isSubsequence(query, target) {
  if (query === "") return true;

  let queryIndex = 0;
  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) return true;
    }
  }

  return false;
}

function getSubsequenceHighlightIndexes(query, text) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === "") return [];

  const indexes = [];
  let queryIndex = 0;

  for (let textIndex = 0; textIndex < text.length; textIndex += 1) {
    const normalizedChar = normalizeSearchText(text[textIndex]);
    if (normalizedChar === "") continue;

    if (normalizedChar === normalizedQuery[queryIndex]) {
      indexes.push(textIndex);
      queryIndex += 1;
      if (queryIndex === normalizedQuery.length) return indexes;
    }
  }

  return [];
}

function appendHighlightedText(element, text, indexes) {
  const hitIndexes = new Set(indexes);

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (hitIndexes.has(index)) {
      const mark = document.createElement("mark");
      mark.className = "search-hit";
      mark.textContent = char;
      element.appendChild(mark);
      continue;
    }

    element.appendChild(document.createTextNode(char));
  }
}

function getCompactTokens(value) {
  const rawTokens = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const acronym = rawTokens.map(token => token[0]).join("");
  const compact = rawTokens.join("");

  return [acronym, compact];
}

function fuzzyMatch(query, value) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === "") return true;

  const normalizedValue = normalizeSearchText(value);
  if (normalizedValue.includes(normalizedQuery)) return true;
  if (isSubsequence(normalizedQuery, normalizedValue)) return true;

  return getCompactTokens(value).some(token => token.includes(normalizedQuery));
}

function getSearchText(entry) {
  const req = entry.request;
  const url = new URL(req.url);
  const status = String(entry.response?.status || "");

  return [
    req.method,
    status,
    url.hostname,
    getDisplayPath(req.url)
  ].join(" ");
}

function getStatusClass(status) {
  if (status >= 200 && status < 300) return "status-ok";
  if (status >= 300 && status < 400) return "status-redirect";
  if (status >= 400) return "status-error";
  return "";
}

function shouldIncludeEntry(entry) {
  const req = entry.request;
  if (!req || !req.url || !req.headers) return false;

  const url = new URL(req.url);
  const path = `${url.pathname}${url.search}`.toLowerCase();
  const method = req.method.toUpperCase();
  const mimeType = (entry.response?.content?.mimeType || "").toLowerCase();
  const authorization = getHeaderValue(req.headers, "authorization");
  const cookie = getHeaderValue(req.headers, "cookie");
  const contentType = getHeaderValue(req.headers, "content-type").toLowerCase();
  const hasBody = Boolean(req.postData?.text);
  const hasQuery = url.search.length > 1;
  const isJson = contentType.includes("application/json") || mimeType.includes("application/json");
  const isMultipart = contentType.includes("multipart/form-data");
  const isStaticAsset =
    mimeType.startsWith("text/css") ||
    mimeType.includes("javascript") ||
    mimeType.startsWith("image/") ||
    mimeType.startsWith("font/") ||
    mimeType.includes("woff") ||
    mimeType.includes("favicon");
  const isAnalytics =
    path.includes("google-analytics") ||
    path.includes("/analytics") ||
    path.includes("gtm") ||
    path.includes("segment") ||
    path.includes("mixpanel") ||
    path.includes("amplitude");
  const isFavicon = path.includes("favicon");
  const isWebSocket = url.protocol === "ws:" || url.protocol === "wss:";
  const isPreflight = method === "OPTIONS";

  if (isStaticAsset || isAnalytics || isFavicon || isWebSocket || isPreflight) return false;

  return (
    method === "POST" ||
    hasBody ||
    hasQuery ||
    Boolean(authorization) ||
    Boolean(cookie) ||
    isJson ||
    isMultipart
  );
}

function renderRequest(entry) {
  const req = entry.request;
  const div = document.createElement("div");
  div.className = "item";

  const method = document.createElement("span");
  method.className = `method method-${req.method.toUpperCase()}`;
  method.textContent = req.method.toUpperCase();

  const statusCode = entry.response?.status || 0;
  const status = document.createElement("span");
  status.className = `status ${getStatusClass(statusCode)}`;
  status.textContent = statusCode || "-";

  const time = document.createElement("span");
  time.className = "time";
  time.textContent = getEntryTime(entry);

  const displayPath = getDisplayPath(req.url);
  const search = document.getElementById("search").value.trim();
  const highlightIndexes = getSubsequenceHighlightIndexes(search, displayPath);

  const path = document.createElement("span");
  path.className = "path";
  path.title = req.url;
  appendHighlightedText(path, displayPath, highlightIndexes);

  const payloadText = getRequestPayload(entry);
  const payload = document.createElement("span");
  payload.className = "payload";
  payload.title = payloadText === "-" ? "" : payloadText;
  payload.textContent = payloadText;

  div.addEventListener("click", async () => {
    try {
      await downloadReq(req);
    } catch (error) {
      console.error("Failed to download .req file", error);
      alert(`${t.failedDownload}: ${error.message}`);
    }
  });

  div.appendChild(method);
  div.appendChild(status);
  div.appendChild(path);
  div.appendChild(payload);
  div.appendChild(time);

  return div;
}

async function loadRequests() {
  const list = document.getElementById("list");
  list.textContent = t.loading;

  try {
    const har = await browser.devtools.network.getHAR();
    currentEntries = har.entries
      .filter(entry => shouldIncludeEntry(entry) && isAfterClear(entry))
      .sort((a, b) => getEntryTimestamp(b) - getEntryTimestamp(a));
    renderList();
  } catch (error) {
    console.error("Failed to load HAR", error);
    list.textContent = t.failedLoad;
  }
}

function renderList() {
  const list = document.getElementById("list");
  const search = document.getElementById("search").value.trim();
  list.textContent = "";

  const entries = search === ""
    ? currentEntries
    : currentEntries.filter(entry => fuzzyMatch(search, getSearchText(entry)));

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = currentEntries.length === 0 ? t.noCandidates : t.noMatches;
    list.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    list.appendChild(renderRequest(entry));
  }
}

function clearRequests() {
  clearedAt = Date.now();
  currentEntries = [];
  document.getElementById("search").value = "";
  renderList();
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    loadRequests().catch(error => {
      console.error("Failed to reload request list", error);
    });
  }, 250);
}

async function downloadReq(req) {
  const url = new URL(req.url);
  const path = url.pathname + url.search;

  const headers = req.headers
    .filter(h => h.name.toLowerCase() !== "host")
    .map(h => `${h.name}: ${h.value}`)
    .join("\n");

  const body = req.postData?.text || "";

  const content =
`${req.method} ${path || "/"} HTTP/1.1
Host: ${url.host}
${headers}

${body}`;

  const filename = `${req.method}_${url.hostname}${url.pathname}`
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") + ".req";

  await browser.runtime.sendMessage({
    type: "download-req",
    content,
    filename
  });
}

applyI18n();
document.getElementById("clearRequests").addEventListener("click", clearRequests);
document.getElementById("search").addEventListener("input", renderList);
browser.devtools.network.onRequestFinished.addListener(scheduleReload);
loadRequests();
