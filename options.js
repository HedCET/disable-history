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

////////////////////////////////////////////////////////////////////////////////

const activeHistoryStatus = document.getElementById("activeHistoryStatus");

document.getElementById("clearActiveHistory").onclick = () => {
  chrome.runtime.sendMessage(chrome.runtime.id,
    { type: "clearActiveHistory" },
    (status) => {
      if (status) updateStatus(activeHistoryStatus, "success", "text-green-500");
      else updateStatus(activeHistoryStatus, "failed", "text-red-500");
    });
};
