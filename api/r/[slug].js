const { getValue } = require("../_lib/kv");

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "");

  if (!slug) {
    res.status(400).send("Invalid slug");
    return;
  }

  const key = `qr:${slug}`;
  const raw = await getValue(key);
  if (!raw) {
    res.status(404).send("Dynamic link not found");
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    res.status(500).send("Stored link data is invalid");
    return;
  }

  const targetUrl = String(payload.targetUrl || "").trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    res.status(500).send("Target URL is invalid");
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, targetUrl);
};
