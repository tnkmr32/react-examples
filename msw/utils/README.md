# MSW汎用ユーティリティ

業務ロジックに依存しない、RESTful APIモック作成用の汎用関数群です。

## 提供されるファイル

### `types.ts`

MSW用の共通型定義。

- `MockHandlerInfo` - リクエストハンドラー情報の型
- `MockResponse` - モックレスポンスの型
- `OverrideResponse` - レスポンス上書き用の型
- `ResourceEntity` - RESTリソースエンティティの型

### `createMockHandler.ts`

個別のHTTPメソッドに対するモックハンドラーを作成する関数。

### `createMockHandlerFactory.ts`

モックハンドラーを生成するファクトリー関数。

### `createRestResourceHandlers.ts`

RESTful APIリソースのCRUD操作を一括で生成する関数。
同じパスに対して統一されたデータストアを使用し、メソッドごとに適切な操作を行います。

## 使用例

```typescript
import { createMockHandlerFactory } from "@/libs/api/msw/createMockHandlerFactory";
import { createRestResourceHandlers } from "@/libs/api/msw/createRestResourceHandlers";

// 個別ハンドラーの定義
const getListHandler = createMockHandlerFactory<Todo[]>(
  "get",
  "http://localhost:8080/todos",
  { body: [], init: { status: 200 } }
);

// RESTリソースハンドラーの一括生成
const handlers = createRestResourceHandlers({
  basePath: "/todos",
  idParam: "todoId",
  initialData: [...],
  handlers: {
    list: getListHandler,
    create: postHandler,
    get: getHandler,
    update: putHandler,
    delete: deleteHandler,
  },
  // オプション: フィルター関数
  filterFn: (data, searchParams) => {
    const name = searchParams.get("name");
    return name ? data.filter(item => item.name === name) : data;
  },
});
```

## ファイル構成

```
src/libs/api/msw/
├── types.ts                          # 共通型定義
├── createMockHandler.ts              # モックハンドラー作成関数
├── createMockHandlerFactory.ts       # ファクトリー関数
├── createRestResourceHandlers.ts     # RESTリソース一括生成関数
└── README.md                         # このファイル
```

## 特徴

- ✅ **型安全** - TypeScriptで完全に型付け
- ✅ **再利用可能** - 任意のリソースに適用可能
- ✅ **データ整合性** - 同じパスは常に同じストアを参照
- ✅ **RESTful** - 標準的なREST APIパターンに準拠
- ✅ **拡張可能** - フィルター関数などでカスタマイズ可能
- ✅ **モジュラー** - 関数ごとに独立したファイル
