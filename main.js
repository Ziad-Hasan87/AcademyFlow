const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
require("dotenv").config();

let mainWindow;
let splashWindow;

function buildSplashHtml() {
  const splashPath = path.join(__dirname, "Assets", "Splash.png");
  let splashUrl = "";

  try {
    const imageBuffer = fs.readFileSync(splashPath);
    const base64 = imageBuffer.toString("base64");
    splashUrl = `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("[Main] Failed to read splash image:", error?.message || error);
    splashUrl = "";
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' file: data:; img-src file: data:;" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #05080d;
      }
      .stage {
        width: 100%;
        height: 100%;
        position: relative;
      }
      .splash-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transform-origin: center center;
        animation: gentleZoom 2.6s ease-in-out infinite alternate;
        filter: saturate(1.03);
      }
      .shine {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(120deg, rgba(255,255,255,0.04) 8%, rgba(255,255,255,0.14) 18%, rgba(255,255,255,0.04) 28%);
        transform: translateX(-120%);
        animation: glide 2.9s ease-in-out infinite;
      }
      @keyframes gentleZoom {
        from { transform: scale(1.01); }
        to { transform: scale(1.04); }
      }
      @keyframes glide {
        0% { transform: translateX(-120%); opacity: 0; }
        25% { opacity: 1; }
        70% { opacity: 0.85; }
        100% { transform: translateX(120%); opacity: 0; }
      }
    </style>
  </head>
  <body>
    <div class="stage">
      ${splashUrl
        ? `<img class="splash-image" src="${splashUrl}" alt="Splash" />`
        : `<div class="splash-image" style="display:flex;align-items:center;justify-content:center;color:#dbeafe;font:600 20px Segoe UI, sans-serif;">AcademyFlow</div>`}
      <div class="shine"></div>
    </div>
  </body>
</html>`;
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    resizable: false,
    movable: true,
    show: true,
    center: true,
    alwaysOnTop: true,
    backgroundColor: "#05080d",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSplashHtml())}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
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

  // Fallback in case renderer signal never arrives.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  }, 15000);

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

ipcMain.on("app:renderer-ready", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
});

app.whenReady().then(() => {
  createSplashWindow();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
