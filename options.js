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

const updateDisabledPattern = document.getElementById("updateDisabledPattern");
const updateDisabledPatternStatus = document.getElementById("updateDisabledPatternStatus");

chrome.storage.sync.get(["disabledPattern"], ({ disabledPattern: dP }) => {
  disabledPattern.value = dP ?? "";
});

document.getElementById("updateDisabledPattern").onclick = () => {
  try {
    new RegExp(disabledPattern.value);
    chrome.storage.sync.set({ disabledPattern: disabledPattern.value });
    updateStatus(updateDisabledPatternStatus, "success", "text-green-500");
  } catch (e) {
    updateStatus(uploadImageStatus, "invalid disabledPattern", "text-red-500");
  }
};

////////////////////////////////////////////////////////////


