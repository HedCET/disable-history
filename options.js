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
  updateStatus(uploadImageStatus);

  const [file] = e.target.files;
  // const [file] = uploadImage.files;

  if (file?.type.includes("image")) {
    updateStatus(uploadImageStatus, "uploading");

    const fileReader = new FileReader;
    fileReader.onerror = (e) => updateStatus(uploadImageStatus, e.message, "text-red-500");

    fileReader.onload = (e) => {
      const image = new Image();
      image.onerror = (e) => updateStatus(uploadImageStatus, e.message, "text-red-500");

      image.onload = () => {
        chrome.storage.sync.set({ [uploadType]: e.target.result });
        updateStatus(uploadImageStatus, "success", "text-green-500");
      };

      // validate image
      image.src = e.target.result;
    };

    fileReader.readAsDataURL(file);
  } else updateStatus(uploadImageStatus, "invalid image file", "text-red-500");

  uploadImage.value = "";
});

////////////////////////////////////////////////////////////


