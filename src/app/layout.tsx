"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MSWProvider } from "@/bases/MSWProvider";
import "./globals.css";

// QueryClientのインスタンスを作成
const queryClient = new QueryClient();

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
