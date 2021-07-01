const matchDataURL = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;

// convert dataURL to imageData
const toImageData = (dataURL) => {
  return new Promise((resolve, reject) => {
    if (!dataURL) return reject();

    const image = new Image();
    image.onerror = () => reject(new Error("invalid image"));

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.height = image.height;
      canvas.width = image.width;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      if (imageData instanceof ImageData) resolve(imageData);
      else reject(new Error("invalid imageData"))
    };

    image.src = dataURL; // validation
  });
};

let enabledIcon;
const _enabledIcon = async (oldValue, newValue) => {
  enabledIcon = (newValue && `${newValue}`.match(matchDataURL))
    ? { imageData: await toImageData(newValue) }
    : { path: "enabled.png" };

  if (oldValue !== newValue && !historyDisabled)
    chrome.browserAction.setIcon(enabledIcon);
};

let disabledIcon;
const _disabledIcon = async (oldValue, newValue) => {
  disabledIcon = (newValue && `${newValue}`.match(matchDataURL))
    ? { imageData: await toImageData(newValue) }
    : { path: "disabled.png" };

  if (oldValue !== newValue && historyDisabled)
    chrome.browserAction.setIcon(disabledIcon);
};

////////////////////////////////////////////////////////////////////////////////

let blockedPattern;
const _blockedPattern = (oldValue, newValue) =>
  blockedPattern = newValue ? new RegExp(newValue) : undefined;

////////////////////////////////////////////////////////////////////////////////

let history = new Map();
let historyDisabled = false;

// update history disabled/enabled status
chrome.browserAction.onClicked.addListener(async () => {
  if (historyDisabled) {
    for (const [tabId] of history)
      await removeFromHistory(tabId);

    chrome.browserAction.setIcon(enabledIcon);
    chrome.browserAction.setTitle({ title: "History Enabled" });
  } else {
    history = new Map();

    chrome.browserAction.setIcon(disabledIcon);
    chrome.browserAction.setTitle({ title: "History Disabled" });
  }

  historyDisabled = !historyDisabled;
});

const addToHistory = (tabId, url) => {
  if (url) {
    const entries = history.get(tabId);
    if (entries instanceof Set) entries.add(url);
    else history.set(tabId, new Set([url]));
  }
};

const removeFromHistory = async (tabId) => {
  const entries = history?.get(tabId);

  if (entries instanceof Set)
    for (const url of entries) {
      if (historyDisabled) await chrome.history.deleteUrl({ url });
      else if (blockedPattern && url?.match(blockedPattern))
        await chrome.history.deleteUrl({ url });

      if (entries.size === 1) history.delete(tabId);
      else entries.delete(url);
    }
};

// add to tabs history
chrome.tabs.onCreated.addListener(({ id, url }) => addToHistory(id, url));
chrome.tabs.onUpdated.addListener((tabId, { url }) => addToHistory(tabId, url));

// remove from tabs history
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => removeFromHistory(removedTabId));
chrome.tabs.onRemoved.addListener((tabId) => removeFromHistory(tabId));

////////////////////////////////////////////////////////////////////////////////

// download history handler
chrome.downloads.onChanged.addListener(({ id, state }) => {
  if (["interrupted", "complete"].includes(state?.current))
    if (historyDisabled) chrome.downloads.erase({ id });
    else if (blockedPattern)
      chrome.downloads.search({ id }, ([{ url }]) => {
        if (url?.match(blockedPattern))
          chrome.downloads.erase({ id });
      });
});

////////////////////////////////////////////////////////////////////////////////

chrome.storage.sync.get(["enabledIcon", "disabledIcon", "blockedPattern"],
  ({ enabledIcon, disabledIcon, blockedPattern }) => {
    _enabledIcon(undefined, enabledIcon);
    _disabledIcon(undefined, disabledIcon);
    _blockedPattern(undefined, blockedPattern);
  });

chrome.storage.onChanged.addListener(({ enabledIcon, disabledIcon, blockedPattern }) => {
  if (enabledIcon) _enabledIcon(enabledIcon.oldValue, enabledIcon.newValue);
  if (disabledIcon) _disabledIcon(disabledIcon.oldValue, disabledIcon.newValue);
  if (blockedPattern) _blockedPattern(blockedPattern.oldValue, blockedPattern.newValue);
});

////////////////////////////////////////////////////////////////////////////////

const _handleMessage = async ({ action }, sender, sendResponse) => {
  switch (action) {
    // ignore active tabs history
    case "ignoreActiveHistory":
      history = new Map();
      sendResponse(true);
      break;
  }
};

// inbound messages
chrome.runtime.onMessage.addListener(_handleMessage);
// chrome.runtime.onMessageExternal.addListener(_handleMessage);
