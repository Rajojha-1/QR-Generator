const { verifyIdToken } = require("../_lib/auth");
const { getUserQrs } = require("../_lib/library");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  let user;
  try {
    user = await verifyIdToken(idToken);
  } catch (error) {
    res.status(401).json({ error: error.message || "Invalid or expired token" });
    return;
  }

  try {
    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const list = await getUserQrs(user.uid);

    const items = list
      .map((item) => ({
        slug: item.slug,
        targetUrl: item.targetUrl,
        shortUrl: item.shortUrl || `${proto}://${host}/r/${item.slug}`,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null
      }))
      .filter((item) => item.slug && item.targetUrl);

    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load dynamic links." });
  }
};
