const { contextBridge, ipcRenderer } = require("electron");

try {
  const sendTelegram = (payload) => ipcRenderer.invoke("telegram:send-notification", payload);
  const uploadProfileImage = (payload) =>
    ipcRenderer.invoke("cloudinary:upload-profile-image", payload);
  const markAppReady = () => ipcRenderer.send("app:renderer-ready");

  contextBridge.exposeInMainWorld("telegramNotifier", {
    send: sendTelegram
  });

  contextBridge.exposeInMainWorld("electronAPI", {
    sendTelegram,
    uploadProfileImage,
    markAppReady,
  });

  console.log("[Preload] Telegram notifier bridge exposed successfully");
} catch (error) {
  console.error("[Preload] Failed to expose telegramNotifier:", error);
}
