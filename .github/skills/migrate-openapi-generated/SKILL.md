# migrate-openapi-generated

OpenAPIから自動生成されたコードをプロジェクト内の適切なフォルダに移植するスキル

## 説明

`openapi/generated` ディレクトリに Orval によって自動生成されたコードを、プロジェクトの適切な場所に移植し、MSWモックファイルを `msw/utils` 内の関数を使用して簡潔に書き直します。

## 移植ルール

### 1. Models の移植

- **ソース**: `openapi/generated/models/**/*`
- **移植先**: `src/entities/apis/models/`
- **処理**: すべてのファイルをそのままコピー

### 2. API クライアントの移植

- **ソース**: `openapi/generated/todos/todos.ts` (MSWファイル以外)
- **移植先**: `src/entities/apis/todos/`
- **処理**: そのままコピー

### 3. MSW モックの移植と変換

- **ソース**: `openapi/generated/todos/todos.msw.ts`
- **移植先**: `msw/todos.msw.ts`
- **処理**:
  1. レスポンスサンプル関数（`getXxxResponseMock`）を抽出
  2. 各レスポンスサンプルを `msw/responses/{endpoint}/{method}Response{status}{variant}.ts` として定義
  3. `msw/utils` の `createMockHandlerFactory` と `createRestResourceHandlers` を使用して簡潔に書き直す

## レスポンスファイル形式

レスポンスファイルは以下の形式で作成されます：

```typescript
import type { ResponseType } from "../../../src/entities/apis/models";
import type { MockResponse } from "../types";

export const {methodName}Response{status}{variant}: MockResponse<ResponseType> = {
  body: { /* レスポンスボディ */ },
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

## 使用方法

```bash
# スキルを実行
npm run migrate-openapi
```

または

```bash
# 手動実行
npx ts-node .github/skills/migrate-openapi-generated/migrate.ts
```

## 処理フロー

1. `openapi/generated/models` → `src/entities/apis/models` にコピー
2. `openapi/generated/todos/todos.ts` → `src/entities/apis/todos/todos.ts` にコピー（インポートパス修正）
3. `openapi/generated/todos/todos.msw.ts` を解析：
   - レスポンスサンプル関数を抽出
   - `msw/responses/{endpoint}/` ディレクトリを作成
   - 各レスポンスを `MockResponse<T>` 形式で保存
   - `msw/todos.msw.ts` を `msw/utils` の関数を使用して生成
4. Prettierを実行してすべての生成ファイルをフォーマット

## 出力例

### msw/responses/listTodo/listTodoResponse200Default.ts

```typescript
import type { ListTodoResponse } from "../../../src/entities/apis/models";
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
  ],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
```

### msw/todos.msw.ts

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
  });
};
```

## 注意事項

- 自動生成されたファイルのヘッダーコメントは保持されます
- 既存のファイルは上書きされます（バックアップ推奨）
- レスポンスファイルは `Default` バリアントとして生成されます
- `msw/utils` の関数を正しく import する必要があります
