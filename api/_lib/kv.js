const memoryStore = globalThis.__qrDynamicStore || new Map();
globalThis.__qrDynamicStore = memoryStore;

function isProductionRuntime() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

function getKvConfig() {
  const baseUrl = process.env.KV_REST_API_URL || process.env.VERCEL_KV_REST_API_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.VERCEL_KV_REST_API_TOKEN || "";
  return { baseUrl, token };
}

async function kvRest(path) {
  const { baseUrl, token } = getKvConfig();
  if (!baseUrl || !token) {
    if (isProductionRuntime()) {
      throw new Error("KV storage is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN in Vercel.");
    }
    return null;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  return response.json();
}

async function getValue(key) {
  const rest = await kvRest(`/get/${encodeURIComponent(key)}`);
  if (rest) {
    return rest.result || null;
  }
  return memoryStore.get(key) || null;
}

async function setValue(key, value) {
  const rest = await kvRest(`/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`);
  if (rest) {
    return;
  }
  memoryStore.set(key, value);
}

module.exports = {
  getValue,
  setValue
};
