(async function initFirebaseFromEnv() {
  const maxAttempts = 3;
  let attempt = 0;

  async function tryInit() {
    attempt++;
    console.log(`🔄 Firebase init attempt ${attempt}/${maxAttempts}...`);

    try {
      // Load Firebase config with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch("/api/config/firebase", {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.error || `HTTP ${response.status}`);
      }

      const firebaseConfig = await response.json();
      console.log("✅ Firebase config loaded");

      if (typeof window.firebase === "undefined") {
        throw new Error("Firebase SDK not loaded");
      }

      // Initialize Firebase
      const app = window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(firebaseConfig);

      const auth = window.firebase.auth(app);
      console.log("✅ Firebase auth initialized");

      // Make globally available
      window.firebaseServices = {
        app,
        auth,
        config: firebaseConfig,
        GoogleAuthProvider: window.firebase.auth.GoogleAuthProvider,
        GithubAuthProvider: window.firebase.auth.GithubAuthProvider,
        initialized: true
      };

      console.log("✅ Firebase services ready");

      // Dispatch ready event
      window.dispatchEvent(
        new CustomEvent("firebase-ready", {
          detail: { app, auth, config: firebaseConfig }
        })
      );

      return true; // Success
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxAttempts) {
        console.log(`⏳ Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return tryInit(); // Retry
      }

      // All attempts failed
      throw error;
    }
  }

  try {
    await tryInit();
  } catch (error) {
    window.firebaseInitError = error;
    console.error("❌ Firebase init failed after all attempts:", error.message);
    console.error(
      "🔍 Debugging info:",
      "\n• Check if /api/config/firebase endpoint is responding",
      "\n• Verify Firebase credentials in .env file",
      "\n• Check browser Properties > Network tab for endpoint response",
      "\n• Restart dev server if needed"
    );

    // Try to show error in UI
    setTimeout(() => {
      const authMessage = document.getElementById("authMessage");
      if (authMessage) {
        authMessage.textContent = "⚠️ Firebase init failed. Check console for details.";
        authMessage.classList.add("show", "error");
      }
    }, 500);
  }
})();
