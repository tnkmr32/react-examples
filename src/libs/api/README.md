# API ライブラリ

このディレクトリには、OpenAPI 定義から自動生成されたコードをコピーして編集したものを設置しています。

## ディレクトリ構成

```
src/libs/
├── generated/  # Orval による自動生成の出力先（編集禁止）
└── api/        # 実装で使用するコード（編集可能）
```

## 運用方法

### 1. コードの自動生成

OpenAPI 定義ファイルを更新した場合、以下のコマンドで `src/libs/generated/` にコードを自動生成します：

```bash
npm run generate:api
```

### 2. 生成コードのコピー

自動生成されたコードを `src/libs/api/` にコピーします：

```bash
cp -r src/libs/generated/* src/libs/api/
```

### 3. 必要に応じて編集

`src/libs/api/` 配下のファイルは、プロジェクトの要件に応じて自由に編集できます：

- 型定義のカスタマイズ
- API クライアントの拡張
- モックハンドラーの調整

## 注意事項

- **`src/libs/generated/` は編集しないでください**
  - このディレクトリは Orval によって自動生成されるため、手動での変更は上書きされます
- **実装では `@/libs/api` をインポートしてください**
  - ❌ `import { Todo } from "@/libs/generated/model"`
  - ✅ `import { Todo } from "@/libs/api/model"`

- **API 定義が更新された場合は再コピーを検討してください**
  - 自動生成後、必要な変更を `src/libs/api/` に反映させる必要があります
