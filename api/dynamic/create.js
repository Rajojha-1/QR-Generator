const crypto = require("crypto");
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

function randomSlug() {
  return crypto.randomBytes(4).toString("hex");
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
    res.status(401).json({ error: "Authentication required. Sign in to create dynamic QR codes." });
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
  const targetUrl = normalizeUrl(body.targetUrl);
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    res.status(400).json({ error: "A valid targetUrl is required" });
    return;
  }

  let slug = normalizeSlug(body.slug);
  if (!slug) {
    slug = randomSlug();
  }

  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const shortUrl = `${proto}://${host}/r/${slug}`;
  const now = new Date().toISOString();

  const key = `qr:${slug}`;
  let existing;
  try {
    existing = await getValue(key);
  } catch (error) {
    res.status(500).json({ error: error.message || "Dynamic storage is unavailable." });
    return;
  }

  if (existing) {
    res.status(409).json({ error: "Slug already exists. Enable update or choose another slug." });
    return;
  }

  try {
    await setValue(
      key,
      JSON.stringify({
        targetUrl,
        userId: user.uid,
        createdAt: now,
        updatedAt: now
      })
    );

    await upsertUserQr(user.uid, {
      slug,
      targetUrl,
      shortUrl,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to save dynamic link." });
    return;
  }

  res.status(200).json({ slug, shortUrl, targetUrl });
};
