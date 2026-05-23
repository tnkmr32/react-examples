# MSW導入計画書

## 概要

Orvalで生成したコードとMSW（Mock Service Worker）を統合し、フロントエンド開発時にバックエンドAPIをモックする環境を構築する。

## 目的

- バックエンドAPIに依存せずフロントエンド開発を進められるようにする
- OpenAPI仕様からMSWハンドラーを自動生成し、メンテナンス性を向上させる
- `npm run dev`での開発時に自動的にMSWが有効になるようにする

## 使用するOpenAPI仕様

- ファイル: `openapi/openapi_todo.yaml`
- API: Todo CRUD操作（GET, POST, PUT, DELETE）

## 導入手順

### 1. パッケージのインストール

以下のパッケージをインストールする：

```bash
npm install -D msw@latest orval-msw
```

- `msw`: Mock Service Worker本体
- `orval-msw`: OrvalでMSWハンドラーを生成するためのプラグイン

### 2. Orval設定の更新

`orval.config.ts`を更新し、MSWハンドラーを自動生成できるように設定する。

```typescript
import { defineConfig } from "orval";

export default defineConfig({
  sampleFront: {
    output: {
      mode: "tags-split",
      clean: true,
      target: "src/libs/generated/api.ts",
      schemas: "src/libs/generated/model",
      client: "react-query",
      tsconfig: "tsconfig.json",
      override: {
        query: {
          useQuery: true,
        },
        mutator: {
          path: "src/libs/backend/customInstance.ts",
          name: "backendCustomInstance",
        },
        mock: {
          type: "msw",
          baseUrl: "http://localhost:8080",
        },
      },
    },
    input: {
      target: "./openapi/openapi_todo.yaml",
    },
  },
});
```

**変更の目的：**

OpenAPI仕様からMSWのモックハンドラーを自動生成し、開発環境でバックエンドAPIをモックできるようにする。これにより、バックエンドの実装を待たずにフロントエンド開発を進められる。

**変更点：**

- `override.mock`セクションを追加
- `type: "msw"`でMSWハンドラーを生成
- `baseUrl`をOpenAPI仕様のサーバーURLと一致させる

### 3. コード生成の実行

Orvalを実行してMSWハンドラーを生成する：

```bash
npm run code-gen
```

生成されるファイル：

- `src/libs/generated/api.msw.ts` - MSWハンドラー
- `src/libs/generated/model/*.ts` - 型定義（既存）
- `src/libs/generated/api.ts` - React Queryフック（既存）

### 4. MSW初期化ファイルの作成

#### 4.1. ブラウザ用MSW設定

`src/mocks/browser.ts`を作成：

```typescript
import { setupWorker } from "msw/browser";
import { getTodosMSW } from "@/libs/generated/todos/todos.msw";

// 生成されたMSWハンドラーをインポート
const handlers = getTodosMSW();

// Service Workerのセットアップ
export const worker = setupWorker(...handlers);
```

#### 4.2. MSW初期化スクリプト

`src/mocks/init.ts`を作成：

```typescript
export async function initMocks() {
  if (typeof window === "undefined") {
    // サーバーサイドでは何もしない
    return;
  }

  if (process.env.NODE_ENV === "development") {
    const { worker } = await import("./browser");
    await worker.start({
      onUnhandledRequest: "bypass", // モックされていないリクエストは通過させる
    });
    console.log("[MSW] Mocking enabled");
  }
}
```

### 5. Next.jsアプリへの統合

#### 5.1. MSW Service Workerの公開

次のコマンドでService Workerファイルを`public`ディレクトリにコピーする：

```bash
npx msw init public/ --save
```

これにより`public/mockServiceWorker.js`が作成される。

#### 5.2. ルートレイアウトでの初期化

`src/app/layout.tsx`を更新し、MSWを初期化する。

既存のレイアウトファイルを読み込んで、以下のように修正する：

```typescript
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
```

**ポイント：**

- `"use client"`ディレクティブを追加（useEffectを使うため）
- `MSWProvider`コンポーネントで全体をラップ
- 開発環境（`NODE_ENV === "development"`）でのみMSWを初期化
- 環境変数の設定は不要（Next.jsが自動的に設定）

### 6. package.jsonスクリプトの更新
MSW初期化を自動化するためのスクリプトを追加：
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "code-gen": "npx orval --config ./orval.config.ts",
    "msw:init": "npx msw init public/ --save",
    "mockoon": "mockoon-cli start --data ./mockoon/mockoon_todo.json"
  }
}
```

## 動作確認手順

### 1. コード生成

```bash
npm run code-gen
```

### 2. MSW Service Workerの初期化

```bash
npm run msw:init
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

### 4. ブラウザでの確認

1. ブラウザで `http://localhost:3000/todo` にアクセス
2. DevToolsのコンソールを開く
3. `[MSW] Mocking enabled` というメッセージが表示されることを確認
4. Networkタブで、APIリクエストがMSWによってインターセプトされていることを確認
   - リクエストに `(from service worker)` のラベルが付く
5. Todo一覧が表示されることを確認（OpenAPIのexampleデータが返される）

### 5. MSWハンドラーのカスタマイズ（オプション）

`src/mocks/browser.ts`でハンドラーをカスタマイズできる：

```typescript
import { setupWorker, http } from "msw/browser";
import { getTodosMSW } from "@/libs/generated/todos/todos.msw";

const handlers = [
  ...getTodosMSW(),
  // カスタムハンドラーを追加
  http.get("http://localhost:8080/todos", () => {
    return HttpResponse.json([
      {
        id: "custom-1",
        title: "カスタムTodo",
        description: "MSWでモックされたデータ",
        assignee: "テストユーザー",
      },
    ]);
  }),
];

export const worker = setupWorker(...handlers);
```

## トラブルシューティング

### MSWが起動しない

- `public/mockServiceWorker.js`が存在するか確認
- ブラウザのキャッシュをクリアして再読み込み
- DevToolsのConsoleでエラーメッセージを確認

### モックデータが返されない

- Networkタブでリクエストが Service Worker を通過しているか確認
- `baseUrl`がOpenAPI仕様と一致しているか確認
- ハンドラーのURLパターンが正しいか確認

### 本番環境でMSWが動作する

- `process.env.NODE_ENV === "development"` のチェックが正しく機能しているか確認
- 本番ビルド前に条件分岐が適切に行われているか確認

## 参考資料

- [MSW公式ドキュメント](https://mswjs.io/)
- [Orval MSWインテグレーション](https://orval.dev/guides/msw)
- [Next.jsでのMSW設定](https://mswjs.io/docs/integrations/next-js)

## まとめ

この計画に従うことで：

- ✅ OpenAPIからMSWハンドラーを自動生成
- ✅ 開発環境で自動的にMSWが有効化
- ✅ バックエンド不要でフロントエンド開発が可能
- ✅ OpenAPI仕様の変更に追従しやすい
