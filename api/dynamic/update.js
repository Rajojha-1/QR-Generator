const { getValue, setValue } = require("../_lib/kv");
const { verifyIdToken } = require("../_lib/auth");
const { upsertUserQr } = require("../_lib/library");

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body;
}

function normalizeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 32);
}

function normalizeUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Verify Firebase ID Token
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    res.status(401).json({ error: "Authentication required. Sign in to update dynamic QR codes." });
    return;
  }

  let user;
  try {
    user = await verifyIdToken(idToken);
  } catch (error) {
    res.status(401).json({ error: error.message || "Invalid or expired token" });
    return;
  }

  const body = parseBody(req);
  const slug = normalizeSlug(body.slug);

  if (!slug) {
    res.status(400).json({ error: "slug is required for update" });
    return;
  }

  // Support both simple targetUrl and location-based rules
  let locationRules = null;
  let primaryTargetUrl = null;

  if (body.locationRules && Array.isArray(body.locationRules) && body.locationRules.length > 0) {
    // Validate location rules
    locationRules = body.locationRules.map(rule => ({
      type: rule.type, // "country" or "default"
      value: rule.value, // country code or null for default
      url: normalizeUrl(rule.url)
    }));

    // Ensure all URLs are valid
    if (locationRules.some(r => !r.url || !/^https?:\/\//i.test(r.url))) {
      res.status(400).json({ error: "All location rule URLs must be valid" });
      return;
    }

    // Get default URL for response
    primaryTargetUrl = (locationRules.find(r => r.type === "default")?.url) || locationRules[0]?.url || "";
  } else {
    const targetUrl = normalizeUrl(body.targetUrl);
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.status(400).json({ error: "A valid targetUrl or location rules are required" });
      return;
    }
    primaryTargetUrl = targetUrl;
  }

  const key = `qr:${slug}`;
  let existing;
  try {
    existing = await getValue(key);
  } catch (error) {
    res.status(500).json({ error: error.message || "Dynamic storage is unavailable." });
    return;
  }

  if (!existing) {
    res.status(404).json({ error: "Slug not found. Create it first." });
    return;
  }

  // Verify ownership
  let existingData;
  try {
    existingData = JSON.parse(existing);
  } catch (error) {
    existingData = {};
  }

  if (existingData.userId && existingData.userId !== user.uid) {
    res.status(403).json({ error: "You do not have permission to update this QR code." });
    return;
  }

  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const shortUrl = `${proto}://${host}/r/${slug}`;
  const createdAt = existingData.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();

  const payload = {
    userId: user.uid,
    createdAt,
    updatedAt
  };

  // Save location rules if provided, otherwise use single targetUrl
  if (locationRules) {
    payload.locationRules = locationRules;
  } else {
    payload.targetUrl = primaryTargetUrl;
  }

  try {
    await setValue(key, JSON.stringify(payload));

    await upsertUserQr(user.uid, {
      slug,
      targetUrl: primaryTargetUrl,
      shortUrl,
      createdAt,
      updatedAt,
      isGeoTargeted: !!locationRules
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update dynamic link." });
    return;
  }

  res.status(200).json({ 
    slug, 
    shortUrl, 
    targetUrl: primaryTargetUrl,
    isGeoTargeted: !!locationRules
  });
};
