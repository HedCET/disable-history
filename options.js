const updateStatus = (element, innerText, className) => {
  if (element instanceof HTMLElement) {
    element.innerText = innerText ?? "";
    element.className = className ?? "";
  }
};

////////////////////////////////////////////////////////////

let uploadType;

const uploadImage = document.getElementById("uploadImage");
const uploadImageStatus = document.getElementById("uploadImageStatus");

document.getElementById("changeEnabledIcon").onclick = () => {
  uploadType = "enabledIcon";
  uploadImage.click();
};

document.getElementById("changeDisabledIcon").onclick = () => {
  uploadType = "disabledIcon";
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
      chrome.storage.sync.set({ [uploadType]: e.target.result });
      updateStatus(uploadImageStatus, "success", "text-green-500");
    };

    image.src = e.target.result; // validate image
  };

  fileReader.readAsDataURL(file);
});

////////////////////////////////////////////////////////////

const disabledPattern = document.getElementById("disabledPattern");
const disabledPatternStatus = document.getElementById("disabledPatternStatus");

chrome.storage.sync.get(["disabledPattern"],
  ({ disabledPattern: dP }) => disabledPattern.value = dP ?? "");

document.getElementById("updateDisabledPattern").onclick = () => {
  try {
    new RegExp(disabledPattern.value); // validation
    chrome.storage.sync.set({ disabledPattern: disabledPattern.value });
    updateStatus(disabledPatternStatus, "success", "text-green-500");
  } catch (e) {
    updateStatus(disabledPatternStatus, "invalid disabledPattern", "text-red-500");
  }
};

////////////////////////////////////////////////////////////

const trackedHistoryStatus = document.getElementById("trackedHistoryStatus");

document.getElementById("deleteTrackedHistory").onclick = () => {
  chrome.runtime.sendMessage(chrome.runtime.id,
    { type: "deleteTrackedHistory" },
    (status) => {
      if (status) updateStatus(trackedHistoryStatus, "success", "text-green-500");
      else updateStatus(trackedHistoryStatus, "failed", "text-red-500");
    });
};

document.getElementById("undoTrackedHistory").onclick = () => {
  chrome.runtime.sendMessage(chrome.runtime.id,
    { type: "undoTrackedHistory" },
    (status) => {
      if (status) updateStatus(trackedHistoryStatus, "success", "text-green-500");
      else updateStatus(trackedHistoryStatus, "failed", "text-red-500");
    });
};
