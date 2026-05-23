"use client";

import { useEffect } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./globals.css";

// QueryClientのインスタンスを作成
const queryClient = new QueryClient();

// MSWプロバイダーコンポーネント
function MSWProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("@/mocks/init").then(({ initMocks }) => {
        initMocks();
      });
    }
  }, []);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <MSWProvider>
          <QueryClientProvider client={queryClient}>
            <AntdRegistry>{children}</AntdRegistry>
          </QueryClientProvider>
        </MSWProvider>
      </body>
    </html>
  );
}
