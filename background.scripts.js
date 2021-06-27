let settings; // global settings

// initialize
chrome.storage.sync.get(['options'], ({ options }) => {
  settings = Object.assign({}, options);
});

// sync
chrome.storage.onChanged.addListener(({ options }) => {
  if (options?.newValue)
    settings = Object.assign({}, settings, options.newValue);
});

////////////////////////////////////////////////////////////

let history = undefined; // temporary tabs history

// update history disabled/enabled status
chrome.browserAction.onClicked.addListener(async () => {
  if (history instanceof Map) {
    for (const [tabId] of history) // remove all
      await removeFromHistory(tabId);

    history = undefined; // disable extension

    await chrome.browserAction.setIcon({ path: "enabled.png" });
    await chrome.browserAction.setTitle({ title: "History Enabled" });
  } else {
    history = new Map();

    await chrome.browserAction.setIcon({ path: "disabled.png" });
    await chrome.browserAction.setTitle({ title: "History Disabled" });
  }
});

// add to tabs history
const addToHistory = (tabId, url) => {
  if (history instanceof Map && url) {
    const entries = history.get(tabId);
    if (entries instanceof Set) entries.add(url); // unique entries
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

// triggers
chrome.tabs.onCreated.addListener(({ id, url }) => addToHistory(id, url));
chrome.tabs.onUpdated.addListener((tabId, { url }) => addToHistory(tabId, url));
chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => removeFromHistory(removedTabId));
chrome.tabs.onRemoved.addListener((tabId) => removeFromHistory(tabId));

////////////////////////////////////////////////////////////

// disabled by regexp
chrome.history.onVisited.addListener(({ url }) => {
  if (url?.match(new RegExp(settings?.disabledPatterns ?? "chrome://new-tab-page")))
    chrome.history.deleteUrl({ url });
});

////////////////////////////////////////////////////////////


