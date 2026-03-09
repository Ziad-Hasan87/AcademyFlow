const { contextBridge, ipcRenderer } = require("electron");

try {
  contextBridge.exposeInMainWorld("telegramNotifier", {
    send: (payload) => ipcRenderer.invoke("telegram:send-notification", payload)
  });
  console.log("[Preload] Telegram notifier bridge exposed successfully");
} catch (error) {
  console.error("[Preload] Failed to expose telegramNotifier:", error);
}
