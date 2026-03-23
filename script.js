const canvas = document.getElementById("qrCanvas");
const ctx = canvas.getContext("2d");

const inputEl = document.getElementById("qrInput");
const contentTypeEl = document.getElementById("contentType");
const errorLevelEl = document.getElementById("errorLevel");
const canvasSizeEl = document.getElementById("canvasSize");
const marginEl = document.getElementById("margin");
const logoUploadEl = document.getElementById("logoUpload");
const logoToggleEl = document.getElementById("logoToggle");
const removeLogoBtn = document.getElementById("removeLogoBtn");

const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

const statusEl = document.getElementById("status");
const metaVersionEl = document.getElementById("metaVersion");
const metaMatrixEl = document.getElementById("metaMatrix");
const metaBytesEl = document.getElementById("metaBytes");
const metaModeEl = document.getElementById("metaMode");

let lastGenerated = null;
let lastRenderState = null;
let logoImage = null;

function utf8ByteLength(value) {
  return new TextEncoder().encode(value).length;
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function formatPayload(rawText, type) {
  const text = rawText.trim();
  if (!text) {
    return { payload: "", mode: "Empty" };
  }

  if (type === "text") {
    return { payload: text, mode: "Text" };
  }
  if (type === "url") {
    return { payload: normalizeUrl(text), mode: "URL" };
  }
  if (type === "email") {
    return { payload: `mailto:${text}`, mode: "Email" };
  }
  if (type === "phone") {
    return { payload: `tel:${text}`, mode: "Phone" };
  }
  if (type === "sms") {
    const [number, ...messageParts] = text.split("|");
    const message = messageParts.join("|").trim();
    const payload = message ? `SMSTO:${number.trim()}:${message}` : `SMSTO:${number.trim()}`;
    return { payload, mode: "SMS" };
  }
  if (type === "json") {
    try {
      const minified = JSON.stringify(JSON.parse(text));
      return { payload: minified, mode: "JSON" };
    } catch (error) {
      return { payload: text, mode: "JSON (raw)" };
    }
  }

  if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
    return { payload: normalizeUrl(text), mode: "URL (auto)" };
  }
  if (/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(text)) {
    return { payload: `mailto:${text}`, mode: "Email (auto)" };
  }
  if (/^\+?[\d\s()-]{7,}$/.test(text)) {
    return { payload: `tel:${text}`, mode: "Phone (auto)" };
  }
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      const minified = JSON.stringify(JSON.parse(text));
      return { payload: minified, mode: "JSON (auto)" };
    } catch (error) {
      return { payload: text, mode: "Text" };
    }
  }

  return { payload: text, mode: "Text" };
}

function clearMeta() {
  metaVersionEl.textContent = "-";
  metaMatrixEl.textContent = "-";
  metaBytesEl.textContent = "-";
  metaModeEl.textContent = "-";
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderToCanvas(qrCode, quietZoneModules, requestedSize) {
  const matrixSize = qrCode.getModuleCount();
  const drawModules = matrixSize + quietZoneModules * 2;

  let targetSize = requestedSize;
  if (targetSize < drawModules) {
    targetSize = drawModules;
  }

  canvas.width = targetSize;
  canvas.height = targetSize;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetSize, targetSize);

  const modulePixelSize = Math.floor(targetSize / drawModules);
  const qrPixelSize = modulePixelSize * drawModules;
  const offset = Math.floor((targetSize - qrPixelSize) / 2);

  ctx.fillStyle = "#111111";
  for (let row = 0; row < matrixSize; row++) {
    for (let col = 0; col < matrixSize; col++) {
      if (!qrCode.isDark(row, col)) {
        continue;
      }

      const x = offset + (col + quietZoneModules) * modulePixelSize;
      const y = offset + (row + quietZoneModules) * modulePixelSize;
      ctx.fillRect(x, y, modulePixelSize, modulePixelSize);
    }
  }
}

function drawLogoOverlay(targetSize) {
  if (!logoImage || !logoToggleEl.checked) {
    return;
  }

  const logoSize = Math.max(26, Math.floor(targetSize * 0.18));
  const x = Math.floor((targetSize - logoSize) / 2);
  const y = Math.floor((targetSize - logoSize) / 2);
  const pad = Math.floor(logoSize * 0.16);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
  ctx.drawImage(logoImage, x, y, logoSize, logoSize);
}

function redrawFromLast() {
  if (!lastRenderState) {
    return;
  }
  renderToCanvas(lastRenderState.qrCode, lastRenderState.quietZone, lastRenderState.targetSize);
  drawLogoOverlay(lastRenderState.targetSize);
}

function generateQR() {
  const rawText = inputEl.value;
  const type = contentTypeEl.value;
  const errorLevel = errorLevelEl.value;
  const quietZone = Number(marginEl.value) || 4;
  const targetSize = parseInt(canvasSizeEl.value, 10) || 640;

  const { payload, mode } = formatPayload(rawText, type);
  if (!payload) {
    setStatus("Enter content first.", true);
    clearMeta();
    downloadBtn.disabled = true;
    return;
  }

  try {
    const qrCode = qrcode(0, errorLevel);
    qrCode.addData(payload, "Byte");
    qrCode.make();

    renderToCanvas(qrCode, quietZone, targetSize);
    drawLogoOverlay(targetSize);

    lastRenderState = { qrCode, quietZone, targetSize };

    const bytes = utf8ByteLength(payload);
    const matrix = qrCode.getModuleCount();
    const version = qrCode.typeNumber;

    metaVersionEl.textContent = `v${version}`;
    metaMatrixEl.textContent = `${matrix} x ${matrix}`;
    metaBytesEl.textContent = String(bytes);
    metaModeEl.textContent = mode;

    lastGenerated = { payload, errorLevel, version, bytes };
    downloadBtn.disabled = false;

    setStatus(`Generated successfully. Auto-selected version: v${version}.`);
  } catch (error) {
    clearMeta();
    downloadBtn.disabled = true;
    setStatus(
      "Content is too large for QR capacity at this error level. Try lower correction (L/M) or shorter content.",
      true
    );
  }
}

function clearAll() {
  inputEl.value = "";
  clearMeta();
  setStatus("Cleared.");
  lastGenerated = null;
  lastRenderState = null;
  downloadBtn.disabled = true;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function onLogoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      logoToggleEl.checked = true;
      redrawFromLast();
      setStatus("Logo loaded. Generate or re-generate QR to apply.");
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  logoImage = null;
  logoUploadEl.value = "";
  logoToggleEl.checked = false;
  redrawFromLast();
  setStatus("Logo removed.");
}

function downloadQR() {
  if (!lastGenerated) {
    setStatus("Generate a QR first.", true);
    return;
  }

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `qr-v${lastGenerated.version}-${Date.now()}.png`;
  a.click();
}

generateBtn.addEventListener("click", generateQR);
clearBtn.addEventListener("click", clearAll);
downloadBtn.addEventListener("click", downloadQR);
logoUploadEl.addEventListener("change", onLogoUpload);
logoToggleEl.addEventListener("change", redrawFromLast);
removeLogoBtn.addEventListener("click", removeLogo);

inputEl.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
    generateQR();
  }
});

setStatus("Paste content and click Generate.");
clearMeta();