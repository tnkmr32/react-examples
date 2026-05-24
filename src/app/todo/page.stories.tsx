import { Meta, StoryObj } from "@storybook/react";
import TodoPage from "./page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getListTodoMockHandler,
  getPostTodoMockHandler,
  getPutTodoMockHandler,
  getDeleteTodoMockHandler,
} from "@/libs/api/todos/todos.msw";
import { HttpResponse, http } from "msw";
import { Todo } from "@/libs/api/model";

/**
 * TODOリストの一覧表示、検索、追加、編集、削除の機能を持つページコンポーネントです。
 * React Query を使用してAPIとの通信を行い、Ant Design のコンポーネントを使用してUIを構築しています。
 */
const meta: Meta<typeof TodoPage> = {
  title: "Pages/TodoPage",
  component: TodoPage,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/todo",
      },
    },
    msw: {
      handlers: [
        getListTodoMockHandler(),
        getPostTodoMockHandler(),
        getPutTodoMockHandler(),
        getDeleteTodoMockHandler(),
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// カスタムモックデータ
const customTodos: Todo[] = [
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
];

/**
 * 基本的なTODOリストページのサンプル。
 * Orvalで生成されたデフォルトのMSWハンドラーを使用しています。
 */
export const Default: Story = {};

/**
 * カスタムデータを表示するサンプル。
 * 日本語のタイトルと説明、担当者名を持つTODOを表示します。
 */
export const WithCustomData: Story = {
  parameters: {
    msw: {
      handlers: [
        getListTodoMockHandler(customTodos),
        getPostTodoMockHandler(async (info) => {
          const body = (await info.request.json()) as Omit<Todo, "id">;
          return {
            id: (customTodos.length + 1).toString(),
            ...body,
          };
        }),
        getPutTodoMockHandler(async (info) => {
          const body = (await info.request.json()) as Omit<Todo, "id">;
          return {
            id: info.params.todoId as string,
            ...body,
          };
        }),
        getDeleteTodoMockHandler(),
      ],
    },
  },
};

/**
 * データが空の状態のサンプル。
 * 初期状態や全てのTODOが削除された状態を確認できます。
 */
export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        getListTodoMockHandler([]),
        getPostTodoMockHandler(async (info) => {
          const body = (await info.request.json()) as Omit<Todo, "id">;
          return {
            id: "1",
            ...body,
          };
        }),
      ],
    },
  },
};

/**
 * 大量のデータが表示されている状態のサンプル。
 * スクロール動作やパフォーマンスの確認に使用します。
 */
export const LargeDataset: Story = {
  parameters: {
    msw: {
      handlers: [
        getListTodoMockHandler(() => {
          const largeTodos: Todo[] = Array.from({ length: 50 }, (_, i) => ({
            id: (i + 1).toString(),
            title: `タスク ${i + 1}`,
            description: `これはタスク${i + 1}の詳細な説明です。この説明は複数行にわたる可能性があります。`,
            assignee: ["山田太郎", "田中花子", "佐藤次郎", "鈴木一郎"][i % 4],
          }));
          return largeTodos;
        }),
        getPostTodoMockHandler(),
        getPutTodoMockHandler(),
        getDeleteTodoMockHandler(),
      ],
    },
  },
};

/**
 * 担当者検索でフィルタリングされた状態のサンプル。
 * 検索機能の動作確認に使用します。
 */
export const WithFiltering: Story = {
  parameters: {
    msw: {
      handlers: [
        getListTodoMockHandler((info) => {
          const url = new URL(info.request.url);
          const assigneeEq = url.searchParams.get("assignee_eq");

          if (assigneeEq) {
            const filtered = customTodos.filter(
              (todo) => todo.assignee === assigneeEq,
            );
            return filtered;
          }

          return customTodos;
        }),
        getPostTodoMockHandler(),
        getPutTodoMockHandler(),
        getDeleteTodoMockHandler(),
      ],
    },
  },
};

/**
 * APIエラーが発生した状態のサンプル。
 * エラーハンドリングの動作を確認できます。
 */
export const WithError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("http://localhost:8080/todos", () => {
          return new HttpResponse(
            JSON.stringify({ message: "Internal Server Error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
      ],
    },
  },
};

/**
 * ローディング状態のサンプル。
 * 長時間の読み込み動作を確認できます（10秒のディレイ）。
 */
export const WithLongLoading: Story = {
  parameters: {
    msw: {
      handlers: [
        getListTodoMockHandler(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10000));
          return customTodos;
        }),
      ],
    },
  },
};
