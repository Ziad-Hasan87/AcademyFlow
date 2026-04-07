const { contextBridge, ipcRenderer } = require("electron");

try {
  const sendTelegram = (payload) => ipcRenderer.invoke("telegram:send-notification", payload);

  contextBridge.exposeInMainWorld("telegramNotifier", {
    send: sendTelegram
  });

  contextBridge.exposeInMainWorld("electronAPI", {
    sendTelegram
  });

  console.log("[Preload] Telegram notifier bridge exposed successfully");
} catch (error) {
  console.error("[Preload] Failed to expose telegramNotifier:", error);
}
