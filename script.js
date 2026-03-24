// ============ Firebase Readiness Check ============
async function waitForFirebase(maxWaitTime = 15000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    if (window.firebaseServices?.initialized) {
      return true;
    }
    
    if (window.firebaseInitError) {
      console.error("Firebase init failed:", window.firebaseInitError);
      return false;
    }
    
    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.error("Firebase initialization timeout after", maxWaitTime, "ms");
  return false;
}

// ============ DOM Elements ============
// Auth & Navigation
const navSignInBtn = document.getElementById("navSignInBtn");
const navSignUpBtn = document.getElementById("navSignUpBtn");
const navSignOutBtn = document.getElementById("navSignOutBtn");
const navUserEmail = document.getElementById("navUserEmail");
const navAuth = document.getElementById("navAuth");
const navUserMenu = document.getElementById("navUserMenu");
const navFeatures = document.getElementById("navFeatures");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");
const navMobileLibrary = document.getElementById("navMobileLibrary");
const navMobileAnalytics = document.getElementById("navMobileAnalytics");

// Modal
const authModal = document.getElementById("authModal");
const modalClose = document.getElementById("modalClose");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const authToggle = document.getElementById("authToggle");
const authMessage = document.getElementById("authMessage");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const githubAuthBtn = document.getElementById("githubAuthBtn");

// App Container
const appContainer = document.getElementById("appContainer");

// Tabs
const sidebarItems = document.querySelectorAll(".sidebar-item");
const tabContents = document.querySelectorAll(".tab-content");

// Generator Controls
const typeStatic = document.getElementById("type-static");
const typeDynamic = document.getElementById("type-dynamic");
const typeIpbased = document.getElementById("type-ipbased");
const staticGroup = document.getElementById("staticGroup");
const dynamicGroup = document.getElementById("dynamicGroup");
const ipbasedGroup = document.getElementById("ipbasedGroup");

const staticContent = document.getElementById("staticContent");
const contentType = document.getElementById("contentType");
const errorLevel = document.getElementById("errorLevel");
const resolution = document.getElementById("resolution");
const quietZone = document.getElementById("quietZone");

const dynamicTarget = document.getElementById("dynamicTarget");
const dynamicSlug = document.getElementById("dynamicSlug");
const dynamicUpdate = document.getElementById("dynamicUpdate");
const dynamicLinkBox = document.getElementById("dynamicLinkBox");
const dynamicLink = document.getElementById("dynamicLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");

// IP-Based targeting (geolocation)
const ipRulesList = document.getElementById("ipRulesList");
const ipCountrySelect = document.getElementById("ipCountrySelect");
const ipCountryUrl = document.getElementById("ipCountryUrl");
const addIpRule = document.getElementById("addIpRule");
const ipDefaultUrl = document.getElementById("ipDefaultUrl");
const ipSlug = document.getElementById("ipSlug");
const ipUpdate = document.getElementById("ipUpdate");
const ipLinkBox = document.getElementById("ipLinkBox");
const ipLink = document.getElementById("ipLink");
const copyIpLinkBtn = document.getElementById("copyIpLinkBtn");

const myQrList = document.getElementById("myQrList");
const libraryStatus = document.getElementById("libraryStatus");
const libraryEmptyState = document.getElementById("libraryEmptyState");

const logoUpload = document.getElementById("logoUpload");
const removeLogo = document.getElementById("removeLogo");

const generateBtn = document.getElementById("generateBtn");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Canvas & Preview
const canvas = document.getElementById("qrCanvas");
const ctx = canvas.getContext("2d");

const metaVersion = document.getElementById("metaVersion");
const metaMatrix = document.getElementById("metaMatrix");
const metaBytes = document.getElementById("metaBytes");
const metaMode = document.getElementById("metaMode");

const statusMessage = document.getElementById("statusMessage");

// ============ State ============
let currentUser = null;
let isSignUpMode = false;
let lastGenerated = null;
let lastRenderState = null;
let logoImage = null;
let ipRules = []; // Array for IP-based geo-targeting: {type: "country", value: "US", url: "..."}  or  {type: "default", value: null, url: "..."}

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

function normalizeDynamicTarget(value) {
  const normalized = normalizeUrl(value);
  if (!/^https?:\/\//i.test(normalized)) {
    return "";
  }
  return normalized;
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
  metaVersion.textContent = "-";
  metaMatrix.textContent = "-";
  metaBytes.textContent = "-";
  metaMode.textContent = "-";
}

function setQRMode(mode) {
  const isStatic = mode === "static";
  const isDynamic = mode === "dynamic";
  const isIpbased = mode === "ipbased";

  staticGroup.classList.toggle("hidden", !isStatic);
  dynamicGroup.classList.toggle("hidden", !isDynamic);
  ipbasedGroup.classList.toggle("hidden", !isIpbased);

  staticContent.disabled = !isStatic;
  contentType.disabled = !isStatic;

  if (isStatic) {
    generateBtn.textContent = "Generate QR";
  } else if (isDynamic) {
    generateBtn.textContent = "Generate Dynamic";
    dynamicLinkBox.classList.add("hidden");
  } else if (isIpbased) {
    generateBtn.textContent = "Generate IP-Based";
    ipLinkBox.classList.add("hidden");
  }
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
  statusMessage.classList.add("show");
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
  if (!logoImage) {
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

async function createOrUpdateDynamicLink() {
  if (!currentUser) {
    throw new Error("Sign in required for dynamic QR codes.");
  }

  const targetUrl = normalizeUrl(dynamicTarget.value.trim());
  if (!targetUrl) {
    throw new Error("Enter a valid destination URL for dynamic QR.");
  }

  const slug = dynamicSlug.value.trim();
  const shouldUpdate = dynamicUpdate.checked;
  const endpoint = shouldUpdate ? "/api/dynamic/update" : "/api/dynamic/create";

  // Get Firebase ID token
  const idToken = await currentUser.getIdToken();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({ targetUrl, slug })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Dynamic API failed.");
  }

  const shortUrl = data.shortUrl || `${window.location.origin}/r/${data.slug}`;
  dynamicLink.textContent = shortUrl;
  dynamicLink.href = shortUrl;
  dynamicLinkBox.classList.remove("hidden");

  return shortUrl;
}

async function createOrUpdateIpBasedLink() {
  if (!currentUser) {
    throw new Error("Sign in required for IP-based QR codes.");
  }

  // Validate location rules
  if (ipRules.length === 0) {
    throw new Error("Please add at least one country rule.");
  }

  const defaultUrl = normalizeUrl(ipDefaultUrl.value.trim());
  if (!defaultUrl) {
    throw new Error("Please set a default URL for other countries.");
  }

  // Create rules array with default
  const locationRules = [
    ...ipRules.map(rule => ({
      type: rule.type,
      value: rule.value,
      url: rule.url
    })),
    { type: "default", value: null, url: defaultUrl }
  ];

  const slug = ipSlug.value.trim();
  const shouldUpdate = ipUpdate.checked;
  const endpoint = shouldUpdate ? "/api/dynamic/update" : "/api/dynamic/create";

  // Get Firebase ID token
  const idToken = await currentUser.getIdToken();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`
    },
    body: JSON.stringify({ locationRules, slug })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "IP-based API failed.");
  }

  const shortUrl = data.shortUrl || `${window.location.origin}/r/${data.slug}`;
  ipLink.textContent = shortUrl;
  ipLink.href = shortUrl;
  ipLinkBox.classList.remove("hidden");

  return shortUrl;
}

// Render geolocation rules list
function renderIpRules() {
  if (!ipRulesList) return;

  if (ipRules.length === 0) {
    ipRulesList.innerHTML = "<p style='font-size:0.8rem;color:var(--ink-muted);'>No country rules added yet.</p>";
    return;
  }

  ipRulesList.innerHTML = ipRules.map((rule, idx) => {
    const countryName = rule.type === "default" ? "Default" : rule.value;
    const countryFlag = getCountryFlag(rule.value);
    return `
      <div class="geo-rule-item">
        <span class="geo-rule-flag">${countryFlag}</span>
        <span class="geo-rule-country">${countryName}</span>
        <span class="geo-rule-url">${rule.url}</span>
        <button class="geo-rule-remove" data-index="${idx}" title="Remove">✕</button>
      </div>
    `;
  }).join("");

  // Add event listeners to remove buttons
  ipRulesList.querySelectorAll(".geo-rule-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index);
      ipRules.splice(idx, 1);
      renderIpRules();
    });
  });
}

// Get country flag emoji
function getCountryFlag(countryCode) {
  const flags = {
    US: "🇺🇸", IN: "🇮🇳", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", 
    CA: "🇨🇦", AU: "🇦🇺", JP: "🇯🇵", SG: "🇸🇬", BR: "🇧🇷",
    MX: "🇲🇽", NL: "🇳🇱", ZA: "🇿🇦"
  };
  return flags[countryCode] || "🌍";
}

// Add IP-based rule
function handleAddIpRule() {
  const countryCode = ipCountrySelect?.value;
  const url = ipCountryUrl?.value.trim();

  if (!countryCode || !url) {
    alert("Please select a country and enter a URL");
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    alert("Please enter a valid URL (starting with http:// or https://)");
    return;
  }

  // Check if country already exists
  if (ipRules.some(r => r.type === "country" && r.value === countryCode)) {
    alert("This country is already configured");
    return;
  }

  ipRules.push({ type: "country", value: countryCode, url });
  ipCountrySelect.value = "";
  ipCountryUrl.value = "";
  renderIpRules();
}

// Clear IP-based rules
function clearIpRules() {
  ipRules = [];
  ipDefaultUrl.value = "";
  ipCountryUrl.value = "";
  ipCountrySelect.value = "";
  renderIpRules();
}

function setLibraryStatus(message, isError = false) {
  if (!libraryStatus) return;
  if (!message) {
    libraryStatus.textContent = "";
    libraryStatus.classList.remove("show", "error", "success");
    return;
  }
  libraryStatus.textContent = message;
  libraryStatus.classList.add("show");
  libraryStatus.classList.toggle("error", isError);
  libraryStatus.classList.toggle("success", !isError);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMyQRCodes(items) {
  if (!myQrList || !libraryEmptyState) return;

  if (!Array.isArray(items) || items.length === 0) {
    myQrList.innerHTML = "";
    libraryEmptyState.classList.remove("hidden");
    return;
  }

  libraryEmptyState.classList.add("hidden");
  myQrList.innerHTML = items
    .map((item) => {
      const shortUrl = item.shortUrl || `${window.location.origin}/r/${item.slug}`;
      const targetUrl = item.targetUrl || "";
      const updated = formatDate(item.updatedAt);
      const safeSlug = escapeHtml(item.slug);
      const safeShortUrl = escapeHtml(shortUrl);
      const safeTargetUrl = escapeHtml(targetUrl);
      const shortEncoded = encodeURIComponent(shortUrl);
      const targetEncoded = encodeURIComponent(targetUrl);
      return `
        <article class="my-qr-item">
          <div class="my-qr-top">
            <span class="my-qr-slug">/${safeSlug}</span>
            <span class="my-qr-date">${updated ? `Updated ${escapeHtml(updated)}` : ""}</span>
          </div>
          <a class="my-qr-link" href="${safeShortUrl}" target="_blank" rel="noreferrer">${safeShortUrl}</a>
          <a class="my-qr-target" href="${safeTargetUrl}" target="_blank" rel="noreferrer">${safeTargetUrl}</a>
          <div class="my-qr-actions">
            <button class="btn btn-secondary btn-sm" data-copy-short="${shortEncoded}">Copy short link</button>
            <button class="btn btn-outline btn-sm" data-fill-slug="${safeSlug}" data-fill-target="${targetEncoded}">Edit in Generator</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function fetchMyQRCodes() {
  if (!currentUser) {
    renderMyQRCodes([]);
    return;
  }

  setLibraryStatus("Loading your dynamic QR codes...");

  try {
    const idToken = await currentUser.getIdToken();
    const response = await fetch("/api/dynamic/list", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Failed to load your QR codes.");
    }

    renderMyQRCodes(data.items || []);
    setLibraryStatus("");
  } catch (error) {
    renderMyQRCodes([]);
    setLibraryStatus(error.message || "Failed to load your QR codes.", true);
  }
}

async function generateQR() {
  const mode = typeStatic.checked ? "static" : typeIpbased.checked ? "ipbased" : "dynamic";
  const rawText = staticContent.value;
  const type = contentType.value;
  const errorLvl = errorLevel.value;
  const quietZn = Number(quietZone.value) || 4;
  const targetSize = parseInt(resolution.value, 10) || 640;

  let payload = "";
  let modeDisplay = "";

  if (mode === "dynamic" || mode === "ipbased") {
    if (!currentUser) {
      const msg = mode === "dynamic" ? "dynamic QR codes" : "IP-based QR codes";
      setStatus(`👉 Sign in required for ${msg}. Click 'Sign In' at the top right.`, true);
      showAuthModal(false); // Show sign-in modal automatically
      clearMeta();
      downloadBtn.disabled = true;
      return;
    }
    try {
      if (mode === "dynamic") {
        payload = await createOrUpdateDynamicLink();
        modeDisplay = "Dynamic URL";
      } else {
        payload = await createOrUpdateIpBasedLink();
        modeDisplay = "IP-Based (Geo-targeting)";
      }
      fetchMyQRCodes();
    } catch (error) {
      setStatus(error.message, true);
      clearMeta();
      downloadBtn.disabled = true;
      return;
    }
  } else {
    const formatted = formatPayload(rawText, type);
    payload = formatted.payload;
    modeDisplay = formatted.mode;
  }

  if (!payload) {
    setStatus(mode === "dynamic" ? "Enter destination URL for dynamic QR." : "Enter content first.", true);
    clearMeta();
    downloadBtn.disabled = true;
    return;
  }

  try {
    const qrCode = qrcode(0, errorLvl);
    qrCode.addData(payload, "Byte");
    qrCode.make();

    renderToCanvas(qrCode, quietZn, targetSize);
    drawLogoOverlay(targetSize);

    lastRenderState = { qrCode, quietZone: quietZn, targetSize };

    const bytes = utf8ByteLength(payload);
    const matrix = qrCode.getModuleCount();
    const version = qrCode.typeNumber;

    metaVersion.textContent = `v${version}`;
    metaMatrix.textContent = `${matrix} x ${matrix}`;
    metaBytes.textContent = String(bytes);
    metaMode.textContent = modeDisplay;

    lastGenerated = { payload, errorLevel: errorLvl, version, bytes };
    downloadBtn.disabled = false;

    setStatus(
      mode === "dynamic"
        ? `Dynamic QR generated. Auto-selected version: v${version}.`
        : mode === "ipbased"
        ? `IP-based QR generated. Auto-selected version: v${version}.`
        : `Generated successfully. Auto-selected version: v${version}.`
    );
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
  staticContent.value = "";
  dynamicTarget.value = "";
  dynamicSlug.value = "";
  dynamicUpdate.checked = false;
  dynamicLinkBox.classList.add("hidden");
  
  // Clear IP-based targeting
  clearIpRules();
  ipLinkBox.classList.add("hidden");
  
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
      removeLogo.classList.remove("hidden");
      redrawFromLast();
      setStatus("Logo loaded. Generate or re-generate QR to apply.");
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function onRemoveLogo() {
  logoImage = null;
  logoUpload.value = "";
  removeLogo.classList.add("hidden");
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

// ============ Auth & UI Management ============
function showAuthModal(isSignUp = false) {
  isSignUpMode = isSignUp;
  authTitle.textContent = isSignUp ? "Create Account" : "Sign In";
  authSubtitle.textContent = isSignUp ? "Join QR Pro today" : "Access your QR codes";
  authSubmitBtn.textContent = isSignUp ? "Sign Up" : "Sign In";
  authToggle.innerHTML = isSignUp 
    ? "Already have an account? <a href=\"#\">Sign in</a>"
    : "Don't have an account? <a href=\"#\">Sign up</a>";
  authMessage.classList.remove("show", "error", "success");
  authEmail.value = "";
  authPassword.value = "";
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
  authMessage.classList.remove("show");
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  showAuthModal(isSignUpMode);
}

function updateAuthUI(user) {
  currentUser = user;
  const freeQRSection = document.getElementById("freeQRSection");
  
  if (user) {
    navAuth.classList.add("hidden");
    navUserMenu.classList.remove("hidden");
    navMobileLibrary?.classList.remove("hidden");
    navMobileAnalytics?.classList.remove("hidden");
    navUserEmail.textContent = user.email;
    // Show app, hide free section
    appContainer.classList.remove("hidden");
    if (freeQRSection) freeQRSection.classList.add("hidden");
    console.log("✅ User authenticated:", user.email);
    // Close modal immediately and scroll to app
    closeAuthModal();
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    fetchMyQRCodes();
  } else {
    navAuth.classList.remove("hidden");
    navUserMenu.classList.add("hidden");
    navMobileLibrary?.classList.add("hidden");
    navMobileAnalytics?.classList.add("hidden");
    // Show free section, hide app
    appContainer.classList.add("hidden");
    if (freeQRSection) freeQRSection.classList.remove("hidden");
    console.log("❌ User signed out");
    renderMyQRCodes([]);
    setLibraryStatus("");
  }
  
  // Update dynamic option availability
  updateDynamicLockStatus();
}

function updateDynamicLockStatus() {
  const dynamicLabel = document.querySelector("label[for='type-dynamic']");
  const dynamicLockIcon = document.getElementById("dynamicLockIcon");
  const ipbasedLabel = document.querySelector("label[for='type-ipbased']");
  const ipbasedLockIcon = document.getElementById("ipbasedLockIcon");
  
  if (currentUser) {
    // User is logged in, enable dynamic and IP-based QR
    typeDynamic.disabled = false;
    if (dynamicLabel) {
      dynamicLabel.classList.remove("locked");
      dynamicLabel.title = "";
      dynamicLabel.style.pointerEvents = "auto";
      dynamicLabel.style.opacity = "1";
    }
    if (dynamicLockIcon) dynamicLockIcon.style.display = "none";
    
    typeIpbased.disabled = false;
    if (ipbasedLabel) {
      ipbasedLabel.classList.remove("locked");
      ipbasedLabel.title = "";
      ipbasedLabel.style.pointerEvents = "auto";
      ipbasedLabel.style.opacity = "1";
    }
    if (ipbasedLockIcon) ipbasedLockIcon.style.display = "none";
    console.log("✓ Dynamic & IP-based QR unlocked for user:", currentUser.email);
  } else {
    // User is logged out, disable dynamic and IP-based QR
    typeDynamic.disabled = true;
    if (dynamicLabel) {
      dynamicLabel.classList.add("locked");
      dynamicLabel.title = "Sign in required for dynamic QR codes";
      dynamicLabel.style.pointerEvents = "none";
      dynamicLabel.style.opacity = "0.5";
    }
    if (dynamicLockIcon) dynamicLockIcon.style.display = "inline";
    
    typeIpbased.disabled = true;
    if (ipbasedLabel) {
      ipbasedLabel.classList.add("locked");
      ipbasedLabel.title = "Sign in required for IP-based QR codes";
      ipbasedLabel.style.pointerEvents = "none";
      ipbasedLabel.style.opacity = "0.5";
    }
    if (ipbasedLockIcon) ipbasedLockIcon.style.display = "inline";
    console.log("🔒 Dynamic & IP-based QR locked - sign in required");
    
    // If dynamic or ipbased is selected, switch back to static
    if (typeDynamic.checked || typeIpbased.checked) {
      typeStatic.checked = true;
      setQRMode("static");
    }
  }
}

async function handleGoogleAuth() {
  authSubmitBtn.disabled = true;
  showAuthMessage("🔄 Initializing Firebase...", false);

  try {
    const ready = await waitForFirebase(15000);
    
    if (!ready) {
      if (window.firebaseInitError) {
        showAuthMessage("❌ Firebase failed to initialize. Refresh page and try again.", true);
      } else {
        showAuthMessage("❌ Firebase initialization timeout. Check your internet connection.", true);
      }
      return;
    }

    const provider = new window.firebase.auth.GoogleAuthProvider();
    await window.firebaseServices.auth.signInWithPopup(provider);
    showAuthMessage("✅ Signed in with Google!", false);
  } catch (error) {
    console.error("Google auth error:", error);
    if (error.code === "auth/operation-not-supported-in-this-environment") {
      showAuthMessage("❌ Google Sign-In not enabled in Firebase console. Enable it: Firebase Console > Authentication > Sign-in method > Google > Enable", true);
    } else {
      const errorMsg = error.code === "auth/popup-closed-by-user"
        ? "Sign in cancelled."
        : error.code === "auth/popup-blocked"
        ? "Popup was blocked. Please allow popups."
        : error.message;
      showAuthMessage(errorMsg, true);
    }
  } finally {
    authSubmitBtn.disabled = false;
  }
}

async function handleGitHubAuth() {
  authSubmitBtn.disabled = true;
  showAuthMessage("🔄 Initializing Firebase...", false);

  try {
    const ready = await waitForFirebase(15000);
    
    if (!ready) {
      if (window.firebaseInitError) {
        showAuthMessage("❌ Firebase failed to initialize. Refresh page and try again.", true);
      } else {
        showAuthMessage("❌ Firebase initialization timeout. Check your internet connection.", true);
      }
      return;
    }

    const provider = new window.firebase.auth.GithubAuthProvider();
    await window.firebaseServices.auth.signInWithPopup(provider);
    showAuthMessage("✅ Signed in with GitHub!", false);
  } catch (error) {
    console.error("GitHub auth error:", error);
    if (error.code === "auth/operation-not-supported-in-this-environment") {
      showAuthMessage("❌ GitHub Sign-In not enabled in Firebase console. Enable it: Firebase Console > Authentication > Sign-in method > GitHub > Enable", true);
    } else {
      const errorMsg = error.code === "auth/popup-closed-by-user"
        ? "Sign in cancelled."
        : error.code === "auth/popup-blocked"
        ? "Popup was blocked. Please allow popups."
        : error.message;
      showAuthMessage(errorMsg, true);
    }
  } finally {
    authSubmitBtn.disabled = false;
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    showAuthMessage("Please fill in all fields.", true);
    return;
  }

  authSubmitBtn.disabled = true;
  showAuthMessage("🔄 Initializing Firebase...", false);

  try {
    // Wait for Firebase to be ready (up to 15 seconds)
    const ready = await waitForFirebase(15000);
    
    if (!ready) {
      if (window.firebaseInitError) {
        showAuthMessage("❌ Firebase failed to initialize. Refresh page and try again.", true);
      } else {
        showAuthMessage("❌ Firebase initialization timeout. Check your internet connection.", true);
      }
      return;
    }

    if (isSignUpMode) {
      await window.firebaseServices.auth.createUserWithEmailAndPassword(email, password);
      showAuthMessage("✅ Account created! Configuring your dashboard...", false);
      console.log("✅ Sign-up successful");
    } else {
      await window.firebaseServices.auth.signInWithEmailAndPassword(email, password);
      showAuthMessage("✅ Signed in successfully!", false);
      console.log("✅ Sign-in successful");
    }
    // Wait for auth state listener to update UI
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error("Auth error:", error);
    const errorMsg = error.code === "auth/email-already-in-use" 
      ? "Email already in use."
      : error.code === "auth/weak-password"
      ? "Password must be at least 6 characters."
      : error.code === "auth/user-not-found"
      ? "Email not found."
      : error.code === "auth/wrong-password"
      ? "Incorrect password."
      : error.message;
    showAuthMessage(errorMsg, true);
  } finally {
    authSubmitBtn.disabled = false;
  }
}

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
  authMessage.classList.toggle("success", !isError);
  authMessage.classList.add("show");
}

function switchTab(tabName) {
  sidebarItems.forEach(item => {
    item.classList.toggle("active", item.dataset.tab === tabName);
  });
  tabContents.forEach(content => {
    content.classList.toggle("active", content.id === `tab-${tabName}`);
  });

  if (tabName === "library" && currentUser) {
    fetchMyQRCodes();
  }
}

// ============ Free QR Generator ============
const freeContent = document.getElementById("freeContent");
const freeContentType = document.getElementById("freeContentType");
const freeErrorLevel = document.getElementById("freeErrorLevel");
const freeResolution = document.getElementById("freeResolution");
const freeQuietZone = document.getElementById("freeQuietZone");
const freeGenerateBtn = document.getElementById("freeGenerateBtn");
const freeClearBtn = document.getElementById("freeClearBtn");
const freeDownloadBtn = document.getElementById("freeDownloadBtn");
const freeQRCanvas = document.getElementById("freeQRCanvas");
const freeStatus = document.getElementById("freeStatus");
let freeLastGenerated = null;
let freeCtx = null;

if (freeQRCanvas) {
  freeCtx = freeQRCanvas.getContext("2d");
}

function freeSetStatus(message, isError = false) {
  if (freeStatus) {
    freeStatus.textContent = message;
    freeStatus.classList.toggle("error", isError);
    freeStatus.classList.toggle("success", !isError && message);
  }
}

function freeGenerateQR() {
  const rawText = freeContent.value.trim();
  const type = freeContentType.value;
  const errorLvl = freeErrorLevel.value;
  const quietZn = Number(freeQuietZone.value) || 4;
  const targetSize = parseInt(freeResolution.value, 10) || 640;

  if (!rawText) {
    freeSetStatus("Enter content to generate QR code.", true);
    return;
  }

  try {
    const formatted = formatPayload(rawText, type);
    const payload = formatted.payload;

    if (!payload) {
      freeSetStatus("Invalid content format.", true);
      return;
    }

    const qrCode = qrcode(0, errorLvl);
    qrCode.addData(payload, "Byte");
    qrCode.make();

    // Render to canvas
    const moduleCount = qrCode.getModuleCount();
    const cellSize = Math.ceil(targetSize / (moduleCount + 2 * quietZn));
    const newSize = cellSize * (moduleCount + 2 * quietZn);

    freeQRCanvas.width = newSize;
    freeQRCanvas.height = newSize;

    freeCtx.fillStyle = "#ffffff";
    freeCtx.fillRect(0, 0, freeQRCanvas.width, freeQRCanvas.height);

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qrCode.isDark(row, col)) {
          freeCtx.fillStyle = "#000000";
          freeCtx.fillRect(
            (col + quietZn) * cellSize,
            (row + quietZn) * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }

    freeLastGenerated = {
      payload,
      errorLevel: errorLvl,
      version: qrCode.typeNumber,
      bytes: utf8ByteLength(payload)
    };

    freeDownloadBtn.disabled = false;
    freeSetStatus(`✓ QR Code generated (v${qrCode.typeNumber}, ${freeLastGenerated.bytes} bytes)`, false);
  } catch (error) {
    console.error("QR generation error:", error);
    freeSetStatus("Content too large for QR capacity. Try lower correction level or shorter content.", true);
  }
}

function freeClearQR() {
  freeContent.value = "";
  freeCtx.fillStyle = "#ffffff";
  freeCtx.fillRect(0, 0, freeQRCanvas.width, freeQRCanvas.height);
  freeLastGenerated = null;
  freeDownloadBtn.disabled = true;
  freeSetStatus("Cleared.");
}

function freeDownloadQR() {
  if (!freeLastGenerated) {
    freeSetStatus("Generate a QR code first.", true);
    return;
  }

  const a = document.createElement("a");
  a.href = freeQRCanvas.toDataURL("image/png");
  a.download = `qr-code-${Date.now()}.png`;
  a.click();
  freeSetStatus("✓ Downloaded!", false);
}

// ============ Event Listeners ============
// Auth & Navigation
navSignInBtn?.addEventListener("click", () => showAuthModal(false));
navSignUpBtn?.addEventListener("click", () => showAuthModal(true));
navSignOutBtn?.addEventListener("click", async () => {
  await window.firebaseServices?.auth.signOut();
});
modalClose?.addEventListener("click", closeAuthModal);
authToggle?.addEventListener("click", (e) => {
  e.preventDefault();
  toggleAuthMode();
});
authForm?.addEventListener("submit", handleAuthSubmit);
authSubmitBtn?.addEventListener("click", handleAuthSubmit);
googleAuthBtn?.addEventListener("click", handleGoogleAuth);
githubAuthBtn?.addEventListener("click", handleGitHubAuth);

// Hamburger Menu
hamburger?.addEventListener("click", () => {
  if (!navMenu) return;
  const isOpen = navMenu.classList.toggle("mobile-open");
  hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

navMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("mobile-open");
    hamburger?.setAttribute("aria-expanded", "false");
  });
});

// Tabs
sidebarItems.forEach(item => {
  item.addEventListener("click", () => {
    switchTab(item.dataset.tab);
  });
});

// Nav Mobile Buttons (My QR Codes, Analytics) - Hamburger menu
navMobileLibrary?.addEventListener("click", () => {
  switchTab("library");
  navMenu.classList.remove("mobile-open");
  hamburger?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

navMobileAnalytics?.addEventListener("click", () => {
  switchTab("analytics");
  navMenu.classList.remove("mobile-open");
  hamburger?.setAttribute("aria-expanded", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Generator Type
typeStatic?.addEventListener("change", () => setQRMode("static"));
typeDynamic?.addEventListener("change", () => setQRMode("dynamic"));
typeIpbased?.addEventListener("change", () => setQRMode("ipbased"));

// IP-Based Targeting
addIpRule?.addEventListener("click", handleAddIpRule);

ipCountryUrl?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleAddIpRule();
  }
});

copyIpLinkBtn?.addEventListener("click", () => {
  if (ipLink.href) {
    navigator.clipboard.writeText(ipLink.href);
    setStatus("Link copied to clipboard!");
  }
});

// Generate & Controls
generateBtn?.addEventListener("click", generateQR);
clearBtn?.addEventListener("click", clearAll);
downloadBtn?.addEventListener("click", downloadQR);

// Free QR Generator
freeGenerateBtn?.addEventListener("click", freeGenerateQR);
freeClearBtn?.addEventListener("click", freeClearQR);
freeDownloadBtn?.addEventListener("click", freeDownloadQR);

// Logo Upload
logoUpload?.addEventListener("change", onLogoUpload);
removeLogo?.addEventListener("click", onRemoveLogo);

// Copy Link
copyLinkBtn?.addEventListener("click", () => {
  if (dynamicLink.href) {
    navigator.clipboard.writeText(dynamicLink.href);
    setStatus("Link copied to clipboard!");
  }
});

myQrList?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const shortToCopy = target.getAttribute("data-copy-short");
  if (shortToCopy) {
    navigator.clipboard.writeText(decodeURIComponent(shortToCopy));
    setLibraryStatus("Short link copied.");
    return;
  }

  const slugToFill = target.getAttribute("data-fill-slug");
  const targetToFill = target.getAttribute("data-fill-target");
  if (slugToFill) {
    typeDynamic.checked = true;
    setQRMode("dynamic");
    dynamicSlug.value = slugToFill;
    dynamicTarget.value = targetToFill ? decodeURIComponent(targetToFill) : "";
    dynamicUpdate.checked = true;
    switchTab("generator");
    setStatus("Loaded selected dynamic QR into generator.");
  }
});

// Keyboard Shortcut
staticContent?.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "enter") {
    generateQR();
  }
});

// ============ Firebase Auth State ============
function initFirebaseAuthListener() {
  if (!window.firebaseServices || !window.firebaseServices.auth) {
    console.warn("⚠️ Firebase not ready yet, retrying in 500ms...");
    setTimeout(initFirebaseAuthListener, 500);
    return;
  }

  console.log("✅ Setting up Firebase auth listener...");
  window.firebaseServices.auth.onAuthStateChanged((user) => {
    console.log("Auth state changed:", user ? user.email : "signed out");
    updateAuthUI(user);
  });
}

// Try to initialize immediately, or wait for firebase-ready event
if (window.firebaseServices && window.firebaseServices.auth) {
  initFirebaseAuthListener();
} else {
  window.addEventListener("firebase-ready", () => {
    console.log("🔥 Firebase ready event received");
    initFirebaseAuthListener();
  });
}

// ============ Initialize ============
// Ensure free section shows by default and app is hidden
const freeQRSection = document.getElementById("freeQRSection");
if (freeQRSection) freeQRSection.classList.remove("hidden");
appContainer.classList.add("hidden");

setStatus("Ready to generate QR codes.");
clearMeta();
setQRMode("static");
updateDynamicLockStatus(); // Lock dynamic QR until user signs in