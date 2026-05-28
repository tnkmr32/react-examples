# プロジェクトスキル

このディレクトリには、プロジェクトで使用する自動化スキルが格納されています。

## スキル一覧

### 1. migrate-openapi-generated

OpenAPIから自動生成されたコードをプロジェクト内の適切なフォルダに移植するスキル。

**詳細**: [migrate-openapi-generated/README.md](./migrate-openapi-generated/README.md)

**実行コマンド**:

```bash
npm run migrate-openapi
```

**主な機能**:

- `openapi/generated/models` → `src/entities/apis/models` へ移植
- `openapi/generated/todos/todos.ts` → `src/entities/apis/todos/todos.ts` へ移植
- `openapi/generated/todos/todos.msw.ts` を解析して、レスポンスサンプルを `msw/responses` に分離
- MSWモックを `msw/utils` の関数を使用して簡潔に書き直す

## スキルの追加方法

新しいスキルを追加する際は、以下の構造に従ってください：

```
.github/skills/
└── {スキル名}/
    ├── README.md      # スキルの詳細ドキュメント
    ├── SKILL.md       # スキルの概要
    └── {スクリプト}    # 実行スクリプト（TypeScript, Bash等）
```

### テンプレート

````markdown
# {スキル名}

## 説明

スキルの目的と機能の説明

## 使用方法

```bash
# 実行コマンド
```
````

## 出力

生成されるファイルや実行結果の説明

````

## 開発ガイドライン

### TypeScriptスクリプト

- ES module形式で記述
- `import.meta.url` を使用してパスを取得
- エラーハンドリングを適切に実装
- 実行前後の状態を明確に出力

### package.jsonへの登録

スキルを実行可能にするため、`package.json` の `scripts` セクションに追加してください：

```json
{
  "scripts": {
    "スキル名": "npx ts-node .github/skills/{スキル名}/{スクリプト名}.ts"
  }
}
````

## ベストプラクティス

1. **冪等性**: スキルは何度実行しても同じ結果を生成すること
2. **ドキュメント**: README.md で使用方法、出力、注意事項を明記
3. **エラーメッセージ**: わかりやすく、アクションにつながるエラーメッセージ
4. **進捗表示**: 長時間実行される場合は進捗状況を表示
5. **既存ファイルの扱い**: 上書きする場合は警告を表示するか、バックアップを推奨

## 参考

- [プロジェクトガイドライン](../copilot-instructions.md)
