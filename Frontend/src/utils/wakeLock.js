/**
 * Screen Wake Lock utility to keep device awake during gameplay
 * Uses the modern Screen Wake Lock API (supported in Chrome, Edge, Android browsers)
 * Falls back gracefully on unsupported browsers
 */

let wakeLock = null;

/**
 * Request wake lock to keep screen awake
 * Works only on HTTPS and requires prior user interaction
 */
export const enableWakeLock = async () => {
  try {
    if (!navigator.wakeLock) {
      console.warn("Wake Lock API not supported on this browser");
      return false;
    }

    wakeLock = await navigator.wakeLock.request("screen");
    console.log("✅ Screen Wake Lock active");

    wakeLock.addEventListener("release", () => {
      console.log("⚠️ Wake Lock released");
    });

    return true;
  } catch (err) {
    console.error("❌ Wake Lock error:", err);
    return false;
  }
};

/**
 * Release the wake lock
 */
export const disableWakeLock = async () => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log("✅ Wake Lock released successfully");
    } catch (err) {
      console.error("❌ Error releasing Wake Lock:", err);
    }
  }
};

/**
 * Get current wake lock status
 */
export const isWakeLockActive = () => {
  return wakeLock !== null;
};
