const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");
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

function extractCloudNameFromUrl(url) {
  if (!url || typeof url !== "string") return null;

  const match = url.match(/res\.cloudinary\.com\/([^/]+)/i);
  return match?.[1] || null;
}

ipcMain.handle("cloudinary:upload-profile-image", async (_event, payload) => {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    extractCloudNameFromUrl(payload?.currentImageUrl) ||
    payload?.cloudName ||
    null;

  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      error: "Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET in root .env",
    };
  }

  if (!cloudName) {
    return {
      ok: false,
      error:
        "Missing Cloudinary cloud name. Set CLOUDINARY_CLOUD_NAME in root .env.",
    };
  }

  const base64Data = payload?.base64Data;
  const mimeType = payload?.mimeType;

  if (!base64Data || !mimeType) {
    return {
      ok: false,
      error: "Invalid payload: base64Data and mimeType are required.",
    };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "academyflow/profiles";

  const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

  const formData = new URLSearchParams();
  formData.append("file", `data:${mimeType};base64,${base64Data}`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result?.secure_url) {
      return {
        ok: false,
        error: result?.error?.message || `Cloudinary upload failed (${response.status})`,
      };
    }

    return {
      ok: true,
      secureUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Cloudinary upload failed",
    };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
