// Firebase ID Token Verification
const AUTH_ENDPOINT = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";

async function verifyIdToken(idToken) {
  if (!idToken) {
    throw new Error("No token provided");
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FIREBASE_API_KEY for token verification");
  }

  try {
    const response = await fetch(`${AUTH_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        idToken: idToken
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Token verification failed");
    }

    if (!data.users || data.users.length === 0) {
      throw new Error("Invalid token");
    }

    const user = data.users[0];
    return {
      uid: user.localId,
      email: user.email,
      emailVerified: user.emailVerified || false
    };
  } catch (error) {
    throw new Error(`Auth verification failed: ${error.message}`);
  }
}

module.exports = { verifyIdToken };
