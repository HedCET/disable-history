const updateStatus = (element, innerText, className) => {
  if (element instanceof HTMLElement) {
    element.innerText = innerText ?? "";
    element.className = className ?? "";
  }
};

////////////////////////////////////////////////////////////////////////////////

let iconType;

const uploadImage = document.getElementById("uploadImage");
const uploadImageStatus = document.getElementById("uploadImageStatus");

document.getElementById("changeEnabledIcon").onclick = () => {
  iconType = "enabledIcon";
  uploadImage.click();
};

document.getElementById("changeDisabledIcon").onclick = () => {
  iconType = "disabledIcon";
  uploadImage.click();
};

uploadImage.addEventListener("change", (e) => {
  const [file] = e.target.files;

  const fileReader = new FileReader;
  fileReader.onerror = () => updateStatus(uploadImageStatus, "invalid file", "text-red-500");

  fileReader.onload = (e) => {
    const image = new Image();
    image.onerror = () => updateStatus(uploadImageStatus, "invalid image", "text-red-500");

    image.onload = () => {
      chrome.storage.sync.set({ [iconType]: e.target.result });
      updateStatus(uploadImageStatus, "success", "text-green-500");
    };

    image.src = e.target.result; // validation
  };

  fileReader.readAsDataURL(file);
});

////////////////////////////////////////////////////////////////////////////////

const blockedPattern = document.getElementById("blockedPattern");
const blockedPatternStatus = document.getElementById("blockedPatternStatus");

chrome.storage.sync.get(["blockedPattern"],
  ({ blockedPattern: bP }) => blockedPattern.value = bP ?? "");

document.getElementById("applyAndUpdateBlockedPattern").onclick = () => {
  try {
    const bP = new RegExp(blockedPattern.value); // validation
    applyBlockedPattern(bP);

    // apply in downloads
    chrome.downloads.search({ limit: 0, urlRegex: blockedPattern.value },
      (downloadItems) => {
        for (const { id, state } of downloadItems)
          if (['interrupted', 'complete'].includes(state))
            chrome.downloads.erase({ id });
      });

    chrome.storage.sync.set({ blockedPattern: blockedPattern.value });

    updateStatus(blockedPatternStatus, "success", "text-green-500");
  } catch (e) {
    updateStatus(blockedPatternStatus, "invalid blockedPattern", "text-red-500");
  }
};

const applyBlockedPattern = (bP, from, to) => {
  if (bP instanceof RegExp) {
    const endTime = typeof to === "number" && 0 < to ? to : new Date().getTime();
    const startTime = endTime - 86400000;

    if (typeof from !== "number" || to <= from) from = endTime - 7776000000;
    if (from < 0) from = 0;
    if (startTime < from) startTime = from;

    chrome.history.search({ endTime, maxResults: 86400, startTime, text: "" },
      async (historyItems) => {
        for (const { url } of historyItems)
          if (url?.match(bP)) await chrome.history.deleteUrl({ url });

        if (historyItems.length && from < startTime)
          applyBlockedPattern(bP, from, startTime);
      });
  }
};

////////////////////////////////////////////////////////////////////////////////

const activeHistoryStatus = document.getElementById("activeHistoryStatus");

document.getElementById("ignoreActiveHistory").onclick = () => {
  chrome.runtime.sendMessage(chrome.runtime.id,
    { type: "ignoreActiveHistory" },
    (status) => {
      if (status) updateStatus(activeHistoryStatus, "success", "text-green-500");
      else updateStatus(activeHistoryStatus, "failed", "text-red-500");
    });
};
