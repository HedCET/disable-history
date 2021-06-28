let history = undefined; // temporary tabs history

// update history disabled/enabled status
chrome.browserAction.onClicked.addListener(async () => {
  if (history instanceof Map) {
    for (const [tabId] of history)
      await removeFromHistory(tabId);

    history = undefined;

    chrome.browserAction.setIcon(enabledIcon);
    chrome.browserAction.setTitle({ title: "History Enabled" });
  } else {
    history = new Map();

    chrome.browserAction.setIcon(disabledIcon);
    chrome.browserAction.setTitle({ title: "History Disabled" });
  }
});

// add to tabs history
const addToHistory = (tabId, url) => {
  if (history instanceof Map && url) {
    const entries = history.get(tabId);
    if (entries instanceof Set) entries.add(url);
    else history.set(tabId, new Set([url]));
  }
}

// remove from tabs history
const removeFromHistory = async (tabId) => {
  const entries = history?.get(tabId);

  if (entries instanceof Set)
    for (const url of entries) {
      await chrome.history.deleteUrl({ url });

      if (entries.size === 1) history.delete(tabId);
      else entries.delete(url);
    }
}

chrome.tabs.onCreated.addListener(({ id, url }) => addToHistory(id, url));
chrome.tabs.onUpdated.addListener((tabId, { url }) => addToHistory(tabId, url));
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => removeFromHistory(removedTabId));
chrome.tabs.onRemoved.addListener((tabId) => removeFromHistory(tabId));

////////////////////////////////////////////////////////////////////////////////

// download history handler
chrome.downloads.onChanged.addListener(({ id, state }) => {
  if (history instanceof Map && state?.current === "complete")
    chrome.downloads.erase({ id });
});

////////////////////////////////////////////////////////////////////////////////

let disabledPattern;

// onChange handler
const _disabledPattern = (oldValue, newValue) => {
  disabledPattern = newValue ? new RegExp(newValue) : undefined;

  if (disabledPattern) {
    const _handleHistory = (from, to) => {
      const endTime = typeof to === "number" && 0 < to ? to : new Date().getTime();
      const startTime = endTime - 86400000;

      if (typeof from !== "number" || to <= from) from = endTime - 7776000000;
      if (from < 0) from = 0;
      if (startTime < from) startTime = from;

      chrome.history.search({ endTime, maxResults: 86400, startTime, text: "" },
        async (historyItems) => {
          for (const { url } of historyItems)
            if (url?.match(disabledPattern))
              await chrome.history.deleteUrl({ url });

          if (historyItems.length && from < startTime)
            _handleHistory(from, startTime);
        });
    };

    _handleHistory();
  }
};

// selectively disabled by regexp
chrome.history.onVisited.addListener(({ url }) => {
  if (disabledPattern && url?.match(disabledPattern))
    chrome.history.deleteUrl({ url });
});

////////////////////////////////////////////////////////////////////////////////

const _handleMessage = async ({ type }, sender, sendResponse) => {
  switch (type) {
    // delete tracked history
    case "deleteTrackedHistory":
      if (history instanceof Map)
        for (const [tabId] of history)
          await removeFromHistory(tabId);

      sendResponse(true);
      break;

    // undo tracked history
    case "undoTrackedHistory":
      if (history instanceof Map)
        history = new Map();

      sendResponse(true);
      break;
  }
};

// inbound messages
chrome.runtime.onMessage.addListener(_handleMessage);
// chrome.runtime.onMessageExternal.addListener(_handleMessage);

////////////////////////////////////////////////////////////////////////////////

const matchDataURL = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;

// dataURL to imageData
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

// onChange handler
const _enabledIcon = async (oldValue, newValue) => {
  enabledIcon = (newValue && `${newValue}`.match(matchDataURL))
    ? { imageData: await toImageData(newValue) }
    : { path: "enabled.png" };

  if (oldValue !== newValue && !(history instanceof Map))
    chrome.browserAction.setIcon(enabledIcon);
};

let disabledIcon;

// onChange handler
const _disabledIcon = async (oldValue, newValue) => {
  disabledIcon = (newValue && `${newValue}`.match(matchDataURL))
    ? { imageData: await toImageData(newValue) }
    : { path: "disabled.png" };

  if (oldValue !== newValue && history instanceof Map)
    chrome.browserAction.setIcon(disabledIcon);
};

////////////////////////////////////////////////////////////////////////////////

chrome.storage.sync.get(["enabledIcon", "disabledIcon", "disabledPattern"],
  ({ enabledIcon, disabledIcon, disabledPattern: dP }) => {
    _enabledIcon(undefined, enabledIcon);
    _disabledIcon(undefined, disabledIcon);
    disabledPattern = dP ? new RegExp(dP) : undefined; // to avoid initial recursion
  });

chrome.storage.onChanged.addListener(({ enabledIcon, disabledIcon, disabledPattern }) => {
  if (enabledIcon) _enabledIcon(enabledIcon.oldValue, enabledIcon.newValue);
  if (disabledIcon) _disabledIcon(disabledIcon.oldValue, disabledIcon.newValue);
  if (disabledPattern) _disabledPattern(disabledPattern.oldValue, disabledPattern.newValue);
});
