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
    {
      id: "3",
      title: "テストコードの作成",
      description: "ユニットテストとE2Eテストを作成する",
      assignee: "山田太郎",
    },
    {
      id: "4",
      title: "デザインレビュー",
      description: "UIデザインのレビューを実施する",
      assignee: "佐藤次郎",
    },
    {
      id: "5",
      title: "データベース設計",
      description: "テーブル設計とER図を作成する",
      assignee: "田中花子",
    },
  ],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
