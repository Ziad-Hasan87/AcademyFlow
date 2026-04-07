const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("dotenv").config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js")
    }
  });

  mainWindow.loadURL("http://localhost:5173");
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("[Main] Failed to load:", errorCode, errorDescription);
  });
  console.log("[Main] BrowserWindow created with preload:", path.join(__dirname, "preload.js"));

}

console.log("[Main] Registering IPC handler for telegram:send-notification");

ipcMain.handle("telegram:send-notification", async (_event, payload) => {
  console.log("[IPC] Received telegram:send-notification request");
  const token = payload?.botId || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = payload?.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("[IPC] Missing token or chatId in .env");
    return {
      ok: false,
      error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in root .env"
    };
  }

  if (!payload || typeof payload.message !== "string" || !payload.message.trim()) {
    return { ok: false, error: "Invalid payload: message is required" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: payload.message,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      return {
        ok: false,
        error: result.description || `Telegram API error (${response.status})`
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unknown error" };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
