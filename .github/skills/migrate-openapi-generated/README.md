# OpenAPI自動生成コードの移植スキル

このスキルは、Orval によって `openapi/generated` ディレクトリに自動生成されたコードを、プロジェクトの適切な場所に移植し、MSWモックを `msw/utils` の関数を使用して簡潔に書き直します。

## 目的

1. **コードの整理**: 自動生成されたコードを適切なディレクトリ構造に配置
2. **MSWモックの最適化**: レスポンスサンプルを分離し、再利用可能なパターンで実装
3. **メンテナンス性の向上**: `msw/utils` の汎用関数を使用した統一的な実装

## 移植ルール

### 1. Models の移植

- **ソース**: `openapi/generated/models/**/*`
- **移植先**: `src/entities/apis/models/`
- **処理**: すべての型定義ファイルをそのままコピー

### 2. API クライアントの移植

- **ソース**: `openapi/generated/todos/todos.ts`
- **移植先**: `src/entities/apis/todos/todos.ts`
- **処理**: TanStack Query フック付きAPIクライアントをコピー

### 3. MSW モックの移植と変換

- **ソース**: `openapi/generated/todos/todos.msw.ts`
- **移植先**: `msw/todos.msw.ts`
- **処理**:
  1. レスポンスサンプル関数（`getXxxResponseMock`）を抽出
  2. 各レスポンスを `msw/responses/{endpoint}/{method}Response{status}Default.ts` として定義
  3. `createMockHandlerFactory` と `createRestResourceHandlers` を使用して簡潔に書き直す

## 使用方法

### 基本的なワークフロー

```bash
# 1. OpenAPI定義から自動生成
npm run code-gen

# 2. 生成されたコードを移植
npm run migrate-openapi
```

### 手動実行

```bash
npx ts-node .github/skills/migrate-openapi-generated/migrate.ts
```

## 生成されるファイル構造

```
src/entities/apis/
├── models/                           # 型定義
│   ├── todo.ts
│   ├── listTodoResponse.ts
│   └── ...
└── todos/                            # APIクライアント
    └── todos.ts

msw/
├── todos.msw.ts                      # モックハンドラー
└── responses/                        # レスポンスサンプル
    ├── listTodo/
    │   └── listTodoResponse200Default.ts
    ├── postTodo/
    │   └── postTodoResponse200Default.ts
    ├── getTodo/
    │   └── getTodoResponse200Default.ts
    ├── putTodo/
    │   └── putTodoResponse200Default.ts
    └── deleteTodo/
        └── deleteTodoResponse204Default.ts
```

## レスポンスファイルの形式

各レスポンスファイルは `MockResponse<T>` 形式で定義されます：

```typescript
import type { Todo } from "../../../src/entities/apis/models";
import type { MockResponse } from "../types";

export const getTodoResponse200Default: MockResponse<Todo> = {
  body: {
    id: "id-0",
    title: "title-0",
    description: "title-0",
    assignee: "person-0",
  },
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

## MSWハンドラーの形式

移植後の `msw/todos.msw.ts` は以下のようになります：

```typescript
import type { ListTodoResponse, Todo } from "../src/entities/apis/models";
import { listTodoResponse200Default } from "./responses/listTodo/listTodoResponse200Default";
import { createMockHandlerFactory } from "./utils/createMockHandlerFactory";
import { createRestResourceHandlers } from "./utils/createRestResourceHandlers";

export const getListTodoMockHandler =
  createMockHandlerFactory<ListTodoResponse>(
    "get",
    "http://localhost:8080/todos",
    listTodoResponse200Default,
  );

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

## 利点

### 1. レスポンスサンプルの再利用

レスポンスサンプルを独立したファイルとして管理することで：

- 複数のテストで同じレスポンスを再利用できる
- レスポンスのバリエーション（空配列、エラーケースなど）を簡単に追加できる

### 2. 統一的なモックパターン

`createRestResourceHandlers` を使用することで：

- RESTful APIの標準的なCRUD操作が自動的に実装される
- データストアが共有され、一貫性のある動作を保証
- フィルタリング、ソート、ページネーションの追加が容易

### 3. メンテナンス性の向上

- `msw/utils` の汎用関数を使用しているため、モックハンドラーの記述が簡潔
- OpenAPI定義を変更してコードを再生成した際も、再度このスキルを実行するだけで移植完了
- 生成されたすべてのファイルは自動的にPrettierでフォーマットされ、コードスタイルが統一される

## 注意事項

- **既存ファイルの上書き**: このスキルを実行すると、移植先のファイルは上書きされます。変更を保存したい場合は、事前にバックアップを取ってください。
- **faker使用時**: 元のコードで `faker` を使用している場合、自動的に静的なサンプル値（`"sample-value"`）に置き換えられます。必要に応じて手動で調整してください。
- **レスポンスバリアント**: 自動生成されるレスポンスは `Default` バリアントとして生成されます。追加のバリアント（例: `Empty`, `Error`）は手動で作成してください。

## カスタマイズ

### レスポンスバリアントの追加

```typescript
// msw/responses/listTodo/listTodoResponse200Empty.ts
export const listTodoResponse200Empty: MockResponse<ListTodoResponse> = {
  body: [],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

### フィルター処理のカスタマイズ

`filterFn` を編集して、クエリパラメータに応じたフィルタリングを追加できます：

```typescript
filterFn: (data, searchParams) => {
  const assigneeEq = searchParams.get("assignee_eq");
  const status = searchParams.get("status");

  let filtered = data;

  if (assigneeEq) {
    filtered = filtered.filter((todo) => todo.assignee === assigneeEq);
  }

  if (status) {
    filtered = filtered.filter((todo) => todo.status === status);
  }

  return filtered;
};
```

## トラブルシューティング

### エラー: `__dirname is not defined`

Node.js の ES module として実行される際に発生します。スクリプト内で `import.meta.url` を使用しているため、問題は自動的に解決されています。

### 警告: `Module type not specified`

package.json に `"type": "module"` を追加することで警告を抑制できます。ただし、機能には影響しません。

## 参考リソース

- [MSW公式ドキュメント](https://mswjs.io/)
- [Orval公式ドキュメント](https://orval.dev/)
- [プロジェクトのMSWカスタマイズガイド](/msw/customize.md)
