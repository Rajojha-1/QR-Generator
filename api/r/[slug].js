const { getValue } = require("../_lib/kv");

// Get IP address from request
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "0.0.0.0"
  );
}

// Get geolocation from IP using ip-api.com (free, no API key needed)
async function getGeolocation(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,region,regionName`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      country: data.country,
      countryCode: data.countryCode?.toUpperCase(),
      region: data.region,
      regionName: data.regionName
    };
  } catch (error) {
    console.error("Geolocation lookup failed:", error.message);
    return null;
  }
}

// Find the best matching redirect URL based on location
function getRedirectUrl(payload, geolocation) {
  // If simple targetUrl (backward compatibility)
  if (payload.targetUrl && !payload.locationRules) {
    return payload.targetUrl;
  }

  // If location-based rules exist
  if (payload.locationRules && Array.isArray(payload.locationRules)) {
    if (geolocation) {
      // Try to match by country code
      for (const rule of payload.locationRules) {
        if (rule.type === "country" && rule.value?.toUpperCase() === geolocation.countryCode) {
          return rule.url;
        }
      }
    }
    
    // Fallback to default URL
    const defaultRule = payload.locationRules.find(r => r.type === "default");
    if (defaultRule) {
      return defaultRule.url;
    }
  }

  // Last resort: use targetUrl if available
  return payload.targetUrl;
}

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
  let raw;
  try {
    raw = await getValue(key);
  } catch (error) {
    res.status(500).send(error.message || "Dynamic storage is unavailable");
    return;
  }

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

  // Get IP and geolocation
  const clientIp = getClientIp(req);
  const geolocation = await getGeolocation(clientIp);

  // Determine which URL to redirect to
  const targetUrl = getRedirectUrl(payload, geolocation);

  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    res.status(500).send("Target URL is invalid or not configured");
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.redirect(302, targetUrl);
};
