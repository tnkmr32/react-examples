let isInitialized = false;

export async function initMocks() {
  if (typeof window === "undefined") {
    // サーバーサイドでは何もしない
    return;
  }

  if (process.env.NODE_ENV === "development" && !isInitialized) {
    isInitialized = true;
    const { worker } = await import("./browser");
    await worker.start({
      onUnhandledRequest: "bypass", // モックされていないリクエストは通過させる
    });
    console.log("[MSW] Mocking enabled");
  }
}
