"use client";

import { useEffect } from "react";

/**
 * MSW（Mock Service Worker）プロバイダーコンポーネント
 * 開発環境でAPIモックを初期化します
 */
export function MSWProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("@/mocks/init").then(({ initMocks }) => {
        initMocks();
      });
    }
  }, []);

  return <>{children}</>;
}
