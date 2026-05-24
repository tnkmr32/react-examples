import type { ListTodoResponse } from "../../../model";
import type { MockResponse } from "../types";

export const listTodoResponse200LargeTodos: MockResponse<ListTodoResponse> = {
  body: Array.from({ length: 50 }, (_, i) => ({
    id: (i + 1).toString(),
    title: `タスク ${i + 1}`,
    description: `これはタスク${i + 1}の詳細な説明です。この説明は複数行にわたる可能性があります。`,
    assignee: ["山田太郎", "田中花子", "佐藤次郎", "鈴木一郎"][i % 4],
  })),
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
