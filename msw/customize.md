# Orval 生成コードのカスタマイズガイド

このドキュメントは、`src/libs/generated/` から `src/libs/api/` へのカスタマイズ手順をまとめたものです。

## 概要

Orval によって OpenAPI 定義から自動生成されたコードを、プロジェクトの要件に合わせてカスタマイズしたバージョンです。主な目的は以下の通りです：

- **MSW モックの柔軟性向上**: データストアによるステートフル操作の実現
- **レスポンスデータの管理**: テストシナリオごとのモックデータの分離
- **再利用性の向上**: 汎用的なユーティリティ関数の抽出
- **ローディングUIのテスト**: 全CRUD操作に1000msの遅延を設定

## ファイル構成の変更

### 生成前（src/libs/generated）

```
src/libs/generated/
├── model/              # 型定義（15ファイル）
│   ├── index.ts
│   ├── todo.ts
│   ├── listTodoResponse.ts
│   └── ...
└── todos/              # APIクライアント
    ├── todos.ts        # TanStack Query hooks
    └── todos.msw.ts    # MSWモックハンドラー（Orval生成）
```

### カスタマイズ後（src/libs/api）

```
src/libs/api/
├── README.md           # 🆕 運用ガイド
├── model/              # 型定義（変更なし）
├── msw/                # 🆕 汎用MSWユーティリティ
│   ├── README.md
│   ├── types.ts
│   ├── createMockHandler.ts
│   ├── createMockHandlerFactory.ts
│   └── createRestResourceHandlers.ts
└── todos/
    ├── todos.ts        # APIクライアント（変更なし）
    ├── todos.msw.ts    # ✏️ 完全書き換え
    └── responses/      # 🆕 レスポンスデータ管理
        ├── types.ts
        ├── listTodo/
        │   ├── listTodoResponse200Default.ts
        │   ├── listTodoResponse200Custom.ts
        │   ├── listTodoResponse200Empty.ts
        │   └── listTodoResponse200LargeTodos.ts
        ├── postTodo/
        │   └── postTodoResponse200Default.ts
        ├── getTodo/
        │   └── getTodoResponse200Default.ts
        ├── putTodo/
        │   └── putTodoResponse200Default.ts
        └── deleteTodo/
            └── deleteTodoResponse204Default.ts
```

---

## カスタマイズの手順

### 手順1: 生成コードのコピー

```bash
# Orvalでコード生成
npm run code-gen

# 生成されたコードをapiディレクトリにコピー
cp -r src/libs/generated/* src/libs/api/
```

### 手順2: 汎用MSWユーティリティの作成

#### 2-1. `src/libs/api/msw/types.ts` を作成

MSWで使用する共通型を定義します。

```typescript
/**
 * MSW用の共通型定義
 */
import { http } from "msw";

/**
 * MSWのリクエストハンドラー情報の型
 */
type HttpMethod = (typeof http)[keyof Pick<
  typeof http,
  "get" | "post" | "put" | "delete"
>];
export type MockHandlerInfo = Parameters<Parameters<HttpMethod>[1]>[0];

/**
 * モックレスポンスの型
 * bodyとinitを持つオブジェクト形式
 */
export type MockResponse<T> = { body: T; init: ResponseInit };

/**
 * overrideResponse の型
 */
export type OverrideResponse<T> =
  | MockResponse<T>
  | ((info: MockHandlerInfo) => Promise<MockResponse<T>> | MockResponse<T>);

/**
 * RESTful APIリソース用のエンティティ型
 */
export type ResourceEntity = { id: string };
```

**目的**:

- MSWのリクエスト情報型を統一
- レスポンスの型安全性を確保
- RESTリソースの共通インターフェース定義

#### 2-2. `src/libs/api/msw/createMockHandler.ts` を作成

個別のモックハンドラーを作成する関数です。

```typescript
/**
 * 共通のモックハンドラー作成関数
 */
import { HttpResponse, delay, http } from "msw";
import type { MockResponse, OverrideResponse } from "./types";

/**
 * @param method HTTPメソッド
 * @param url エンドポイントURL
 * @param defaultResponse デフォルトのモックレスポンス
 * @param delayTime レスポンスの遅延時間（ミリ秒）
 * @param overrideResponse レスポンスを上書きする値または関数
 */
export const createMockHandler = <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  defaultResponse: { body: T; init: ResponseInit },
  delayTime: number = 1000,
  overrideResponse?: OverrideResponse<T>,
) => {
  const httpMethod = http[method];
  return httpMethod(url, async (info) => {
    await delay(delayTime);

    let response: MockResponse<T>;

    if (overrideResponse !== undefined) {
      if (typeof overrideResponse === "function") {
        response = await overrideResponse(info);
      } else {
        response = overrideResponse;
      }
    } else {
      response = defaultResponse;
    }

    return new HttpResponse(JSON.stringify(response.body), response.init);
  });
};
```

**目的**:

- HTTPメソッドごとのハンドラー作成を抽象化
- レスポンスの上書き機能（静的データまたは関数）
- 遅延時間のカスタマイズ

#### 2-3. `src/libs/api/msw/createMockHandlerFactory.ts` を作成

ハンドラーファクトリーを生成する関数です。

```typescript
/**
 * モックハンドラー関数を生成するファクトリー
 */
import type { OverrideResponse } from "./types";
import { createMockHandler } from "./createMockHandler";

/**
 * @param method HTTPメソッド
 * @param url エンドポイントURL
 * @param defaultResponse デフォルトのモックレスポンス
 */
export const createMockHandlerFactory = <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  defaultResponse: { body: T; init: ResponseInit },
) => {
  return (overrideResponse?: OverrideResponse<T>, delayTime: number = 1000) => {
    return createMockHandler<T>(
      method,
      url,
      defaultResponse,
      delayTime,
      overrideResponse,
    );
  };
};
```

**目的**:

- エンドポイントごとのハンドラーファクトリーを生成
- テストケースごとに異なるレスポンスを注入可能

#### 2-4. `src/libs/api/msw/createRestResourceHandlers.ts` を作成

RESTful APIのCRUD操作を一括生成する関数です（長いため、重要部分のみ抜粋）。

```typescript
/**
 * RESTful APIリソースのハンドラーを生成するファクトリー
 */
import type { ResourceEntity } from "./types";
import type { createMockHandlerFactory } from "./createMockHandlerFactory";

interface RestResourceStore<T extends ResourceEntity> {
  data: T[];
  nextId: number;
}

export function createRestResourceHandlers<
  TEntity extends ResourceEntity,
  TListResponse,
>(options: {
  basePath: string;
  idParam: string;
  initialData: TEntity[];
  handlers: {
    list: ReturnType<typeof createMockHandlerFactory<TListResponse>>;
    create: ReturnType<typeof createMockHandlerFactory<TEntity>>;
    get: ReturnType<typeof createMockHandlerFactory<TEntity>>;
    update: ReturnType<typeof createMockHandlerFactory<TEntity>>;
    delete: ReturnType<typeof createMockHandlerFactory<TEntity>>;
  };
  filterFn?: (
    data: TEntity[],
    searchParams: URLSearchParams,
  ) => TEntity[] | TListResponse;
}) {
  // リソースごとのデータストア（クロージャで保持）
  const store: RestResourceStore<TEntity> = {
    data: [...options.initialData],
    nextId: options.initialData.length + 1,
  };

  return [
    // GET /resource - 一覧取得
    options.handlers.list((info) => {
      const url = new URL(info.request.url);
      const result = options.filterFn
        ? options.filterFn(store.data, url.searchParams)
        : store.data;

      return {
        body: result as TListResponse,
        init: { status: 200, headers: { "Content-Type": "application/json" } },
      };
    }, 1000), // 遅延時間: 1000ms

    // POST /resource - 新規作成
    options.handlers.create(async (info) => {
      const requestBody = (await info.request.json()) as Omit<TEntity, "id">;
      const newEntity: TEntity = {
        id: `id-${store.nextId++}`,
        ...requestBody,
      } as TEntity;
      store.data.push(newEntity);

      return {
        body: newEntity,
        init: { status: 200, headers: { "Content-Type": "application/json" } },
      };
    }, 1000), // 遅延時間: 1000ms

    // GET /resource/:id - 詳細取得 (遅延時間: 1000ms)
    // PUT /resource/:id - 更新 (遅延時間: 1000ms)
    // DELETE /resource/:id - 削除 (遅延時間: 1000ms)
    // ... (実装省略)
  ];
}
```

**目的**:

- RESTful APIの標準CRUD操作を自動生成
- クロージャによるステートフルなデータストア
- クエリパラメータによるフィルタリング機能
- **全ハンドラーに1000msの遅延を設定（ローディング状態のテストを容易化）**

#### 2-5. `src/libs/api/msw/README.md` を作成

MSWユーティリティの使用方法を説明するドキュメントを追加します。

---

### 手順3: レスポンスデータファイルの作成

#### 3-1. `src/libs/api/todos/responses/types.ts` を作成

レスポンスファイル用の型定義です。

```typescript
import { HttpResponseInit } from "msw";

/**
 * MSWレスポンスの共通型定義
 * @template T - レスポンスボディの型
 */
export type MockResponse<T> = {
  body: T;
  init: HttpResponseInit;
};
```

#### 3-2. 各エンドポイント・レスポンスごとにファイルを作成

**命名規則**:

- **ファイル名**: `{operationId}Response{statusCode}{バリエーション}.ts`
- **変数名**: ファイル名から `.ts` を除いた名前（例: `listTodoResponse200Default`）
- **目的**: インポート時に `as` を使わず、変数名とファイル名を一致させて可読性を向上

**基本パターン**: `src/libs/api/todos/responses/{operationId}/{operationId}Response{statusCode}{バリエーション}.ts`

**例: `src/libs/api/todos/responses/listTodo/listTodoResponse200Default.ts`**

```typescript
import type { ListTodoResponse } from "../../../model";
import type { MockResponse } from "../types";

export const listTodoResponse200Default: MockResponse<ListTodoResponse> = {
  body: [
    {
      id: "id-0",
      title: "title-0",
      description: "title-0",
      assignee: "person-0",
    },
    {
      id: "id-1",
      title: "title-1",
      description: "title-1",
      assignee: "person-1",
    },
    {
      id: "id-2",
      title: "title-2",
      description: "title-2",
      assignee: "person-2",
    },
  ],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

**例: `src/libs/api/todos/responses/listTodo/listTodoResponse200Empty.ts`**

```typescript
import type { ListTodoResponse } from "../../../model";
import type { MockResponse } from "../types";

export const listTodoResponse200Empty: MockResponse<ListTodoResponse> = {
  body: [],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

**例: `src/libs/api/todos/responses/listTodo/listTodoResponse200Custom.ts`**

```typescript
import type { ListTodoResponse } from "../../../model";
import type { MockResponse } from "../types";

export const listTodoResponse200Custom: MockResponse<ListTodoResponse> = {
  body: [
    {
      id: "1",
      title: "プロジェクト仕様書の作成",
      description: "新規プロジェクトの仕様書を作成する",
      assignee: "山田太郎",
    },
    {
      id: "2",
      title: "APIの実装",
      description: "ユーザー登録APIを実装する",
      assignee: "田中花子",
    },
    // ...
  ],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

**目的**:

- テストシナリオごとにモックデータを分離
- 再利用可能なレスポンスパターンの管理
- エッジケース（空データ、大量データなど）のテスト容易性

---

### 手順4: MSWハンドラーファイルの書き換え

#### 4-1. `src/libs/api/todos/todos.msw.ts` を書き換え

**変更前（Orval生成版）**:

```typescript
// 長大なハンドラー関数が直接定義されている
export const getListTodoMockHandler = (overrideResponse?: ...) => {
  return http.get('http://localhost:8080/todos', async (info) => {
    await delay(1000);
    return new HttpResponse(JSON.stringify(...), { status: 200 });
  });
};
// ... 各エンドポイントごとに同様のコードが続く
```

**変更後（カスタマイズ版）**:

```typescript
/**
 * Generated by orval v7.1.1 🍺
 * Do not edit manually.
 * React CS Example
 * OpenAPI for example of React Cost Savings Component
 * OpenAPI spec version: 1.0.0
 */
import type { ListTodoResponse, Todo } from ".././model";
import { listTodoResponse200Default } from "./responses/listTodo/listTodoResponse200Default";
import { postTodoResponse200Default } from "./responses/postTodo/postTodoResponse200Default";
import { putTodoResponse200Default } from "./responses/putTodo/putTodoResponse200Default";
import { deleteTodoResponse204Default } from "./responses/deleteTodo/deleteTodoResponse204Default";
import { getTodoResponse200Default } from "./responses/getTodo/getTodoResponse200Default";
import { createMockHandlerFactory } from "@/libs/api/msw/createMockHandlerFactory";
import { createRestResourceHandlers } from "@/libs/api/msw/createRestResourceHandlers";

// ハンドラーファクトリーの定義
export const getListTodoMockHandler =
  createMockHandlerFactory<ListTodoResponse>(
    "get",
    "http://localhost:8080/todos",
    listTodoResponse200Default,
  );

export const getPostTodoMockHandler = createMockHandlerFactory<Todo>(
  "post",
  "http://localhost:8080/todos",
  postTodoResponse200Default,
);

export const getGetTodoMockHandler = createMockHandlerFactory<Todo>(
  "get",
  "http://localhost:8080/todos/:todoId",
  getTodoResponse200Default,
);

export const getPutTodoMockHandler = createMockHandlerFactory<Todo>(
  "put",
  "http://localhost:8080/todos/:todoId",
  putTodoResponse200Default,
);

export const getDeleteTodoMockHandler = createMockHandlerFactory<Todo>(
  "delete",
  "http://localhost:8080/todos/:todoId",
  deleteTodoResponse204Default,
);

/**
 * Todoリソースのモックハンドラーを生成
 * RESTful APIパターンを使用し、/todosパスに対して統一されたデータストアを使用
 */
export const getTodosMock = () => {
  return createRestResourceHandlers<Todo, ListTodoResponse>({
    basePath: "/todos",
    idParam: "todoId",
    initialData: listTodoResponse200Default.body,
    handlers: {
      list: getListTodoMockHandler,
      create: getPostTodoMockHandler,
      get: getGetTodoMockHandler,
      update: getPutTodoMockHandler,
      delete: getDeleteTodoMockHandler,
    },
    // オプション: リスト取得時のフィルター処理
    filterFn: (data, searchParams) => {
      const assigneeEq = searchParams.get("assignee_eq");
      if (assigneeEq) {
        return data.filter((todo) => todo.assignee === assigneeEq);
      }
      return data;
    },
  });
};
```

**主な変更点**:

1. ハンドラーファクトリーを使用した簡潔な定義
2. レスポンスデータの外部ファイル化
3. `getTodosMock()` 関数の追加（RESTful APIパターン）
4. データストアによるステートフル操作のサポート
5. クエリパラメータによるフィルタリング機能
6. **全CRUD操作に1000msの遅延を設定（ローディングUIのテストを容易化）**

---

### 手順5: ドキュメントの作成

#### 5-1. `src/libs/api/README.md` を作成

運用方法と注意事項を記載したドキュメントを作成します。

```markdown
# API ライブラリ

このディレクトリには、OpenAPI 定義から自動生成されたコードをコピーして編集したものを設置しています。

## ディレクトリ構成

\`\`\`
src/libs/
├── generated/ # Orval による自動生成の出力先（編集禁止）
└── api/ # 実装で使用するコード（編集可能）
\`\`\`

## 運用方法

### 1. コードの自動生成

\`\`\`bash
npm run code-gen
\`\`\`

### 2. 生成コードのコピー

\`\`\`bash
cp -r src/libs/generated/\* src/libs/api/
\`\`\`

### 3. 必要に応じて編集

`src/libs/api/` 配下のファイルは自由に編集できます。

## 注意事項

- **`src/libs/generated/` は編集しないでください**
- **実装では `@/libs/api` をインポートしてください**
```

---

## カスタマイズのメリット

### 1. テストの柔軟性向上

**変更前**:

```typescript
// 単一のモックレスポンスのみ
const handlers = [getListTodoMockHandler()];
```

**変更後**:

```typescript
// テストシナリオごとに異なるレスポンスを使用可能
import { listTodoResponse200Empty } from "@/libs/api/todos/responses/listTodo/listTodoResponse200Empty";
import { listTodoResponse200Custom } from "@/libs/api/todos/responses/listTodo/listTodoResponse200Custom";

// 空のリストをテスト
const emptyHandlers = [getListTodoMockHandler(listTodoResponse200Empty)];

// カスタムデータをテスト
const customHandlers = [getListTodoMockHandler(listTodoResponse200Custom)];
```

### 2. ステートフル操作のサポート

**変更前**:

```typescript
// 各ハンドラーが独立しており、データの整合性がない
const handlers = [
  getListTodoMockHandler(), // 常に同じデータを返す
  getPostTodoMockHandler(), // 追加してもリストに反映されない
];
```

**変更後**:

```typescript
// RESTful APIパターンで統一されたデータストアを使用
const handlers = getTodosMock();
// POSTで追加 → GETで取得できる
// PUTで更新 → GETで最新データが取得できる
// DELETEで削除 → GETで取得できなくなる
```

### 3. コードの再利用性向上

- 汎用的なMSWユーティリティを他のリソースでも使用可能
- レスポンスデータを複数のテストケースで共有可能
- ハンドラーファクトリーパターンによるボイラープレート削減

### 4. ローディング状態のテスト容易性

- **全CRUD操作に1000msの遅延を統一的に設定**
- ローディングスピナーやスケルトンUIの表示確認が容易
- 必要に応じてハンドラーごとに遅延時間をカスタマイズ可能

```typescript
// 遅延なしでテストする場合
const fastHandlers = getTodosMock();
// または個別にカスタマイズ
const customHandler = getListTodoMockHandler(undefined, 0); // 遅延なし
```

### 5. メンテナンス性の向上

- レスポンスデータとロジックの分離
- テストシナリオごとのファイル管理
- 型安全性の確保

---

## 他のプロジェクトへの適用手順

このカスタマイズパターンを他のプロジェクトに適用する際の手順です。

### ステップ1: ディレクトリ構造の準備

```bash
# 生成先とは別に、編集可能なapiディレクトリを作成
mkdir -p src/libs/api
```

### ステップ2: 汎用ユーティリティのコピー

```bash
# MSWユーティリティをコピー（プロジェクト間で再利用可能）
cp -r src/libs/api/msw /path/to/new-project/src/libs/api/
```

### ステップ3: コード生成とコピー

```bash
# 新しいプロジェクトでOrval実行
npm run code-gen

# 生成コードをコピー
cp -r src/libs/generated/* src/libs/api/
```

### ステップ4: レスポンスファイルの作成

各リソースごとに `responses/` ディレクトリを作成し、デフォルトレスポンスを分離します。

```bash
mkdir -p src/libs/api/{resource}/responses/{operationId}
```

例:

```
src/libs/api/users/responses/
├── types.ts
├── listUser/
│   └── listUserResponse200Default.ts
├── getUser/
│   └── getUserResponse200Default.ts
└── ...
```

### ステップ5: MSWハンドラーの書き換え

生成された `*.msw.ts` ファイルを、ファクトリーパターンを使用して書き換えます。

**テンプレート**:

```typescript
import { createMockHandlerFactory } from "@/libs/api/msw/createMockHandlerFactory";
import { createRestResourceHandlers } from "@/libs/api/msw/createRestResourceHandlers";
import { listResourceResponse200Default } from "./responses/listResource/listResourceResponse200Default";
// ... 他のレスポンスをインポート

export const getListResourceMockHandler =
  createMockHandlerFactory<ListResourceResponse>(
    "get",
    "http://localhost:8080/resources",
    listResourceResponse200Default,
  );

// ... 他のハンドラー

export const getResourcesMock = () => {
  return createRestResourceHandlers<Resource, ListResourceResponse>({
    basePath: "/resources",
    idParam: "resourceId",
    initialData: listResourceResponse200Default.body,
    handlers: {
      list: getListResourceMockHandler,
      create: getPostResourceMockHandler,
      get: getGetResourceMockHandler,
      update: getPutResourceMockHandler,
      delete: getDeleteResourceMockHandler,
    },
  });
};
```

### ステップ6: インポートパスの変更

プロジェクト全体で `@/libs/generated` から `@/libs/api` へのインポートパスを変更します。

```bash
# 一括置換（macOS/Linux）
find src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/libs/generated|@/libs/api|g'
```

---

## まとめ

このカスタマイズにより、以下が実現できました：

1. **Orval生成コードの柔軟な拡張**: 自動生成の恩恵を受けつつ、独自のカスタマイズを追加
2. **テスト容易性の向上**: シナリオごとのモックデータ管理とステートフル操作
3. **保守性の向上**: データとロジックの分離、汎用ユーティリティの活用
4. **再利用性**: 汎用MSWユーティリティは他のプロジェクトでも使用可能
5. **ローディング状態のテスト**: 全CRUD操作に1000msの遅延を設定し、UIのローディング状態を確認可能
6. **命名規則の統一**: ファイル名と変数名を一致させることで、インポート時の `as` を不要にし、コードの可読性を向上

### 命名規則のベストプラクティス

レスポンスファイルでは以下の命名規則を採用しています：

- **ファイル名**: `{operationId}Response{statusCode}{バリエーション}.ts`
  - 例: `listTodoResponse200Default.ts`
- **変数名**: ファイル名から `.ts` を除いた名前
  - 例: `listTodoResponse200Default`

この規則により、以下のメリットがあります：

```typescript
// ❌ 非推奨: インポート時に as を使用
import { response200Default as listTodoResponse200Default } from "./responses/listTodo/response200Default";

// ✅ 推奨: ファイル名と変数名が一致しているため、as が不要
import { listTodoResponse200Default } from "./responses/listTodo/listTodoResponse200Default";
```

- 変数名から対応するファイルが明確
- インポート文がシンプルで可読性が高い
- エディタの自動補完やリファクタリングツールとの相性が良い

別のプロジェクトでも同様の手順を適用することで、一貫したモック管理とテスト戦略を実現できます。
