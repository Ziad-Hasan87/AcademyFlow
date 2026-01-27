// Toast notification utility
let toastCallback = null;

export const setToastCallback = (callback) => {
  toastCallback = callback;
};

export const showToast = (message, type = 'success') => {
  if (toastCallback) {
    toastCallback(message, type);
  }
};
