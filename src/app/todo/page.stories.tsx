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
import { listTodoResponse200Default } from "@/libs/api/todos/responses/listTodo/listTodoResponse200Default";
import { listTodoResponse200Custom } from "@/libs/api/todos/responses/listTodo/listTodoResponse200Custom";
import { listTodoResponse200Empty } from "@/libs/api/todos/responses/listTodo/listTodoResponse200Empty";
import { listTodoResponse200LargeTodos } from "@/libs/api/todos/responses/listTodo/listTodoResponse200LargeTodos";
import { postTodoResponse200Default } from "@/libs/api/todos/responses/postTodo/postTodoResponse200Default";
import { putTodoResponse200Default } from "@/libs/api/todos/responses/putTodo/putTodoResponse200Default";
import { deleteTodoResponse204Default } from "@/libs/api/todos/responses/deleteTodo/deleteTodoResponse204Default";

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
        getListTodoMockHandler(listTodoResponse200Default, 0),
        getPostTodoMockHandler(postTodoResponse200Default, 0),
        getPutTodoMockHandler(putTodoResponse200Default, 0),
        getDeleteTodoMockHandler(deleteTodoResponse204Default, 0),
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

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
        getListTodoMockHandler(listTodoResponse200Custom, 0),
        getPostTodoMockHandler(async (info) => {
          const requestBody = (await info.request.json()) as Omit<Todo, "id">;
          return {
            body: {
              id: (listTodoResponse200Custom.body.length + 1).toString(),
              ...requestBody,
            },
            init: {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          };
        }, 0),
        getPutTodoMockHandler(async (info) => {
          const requestBody = (await info.request.json()) as Omit<Todo, "id">;
          return {
            body: {
              id: info.params.todoId as string,
              ...requestBody,
            },
            init: {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          };
        }, 0),
        getDeleteTodoMockHandler(deleteTodoResponse204Default, 0),
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
        getListTodoMockHandler(listTodoResponse200Empty, 0),
        getPostTodoMockHandler(async (info) => {
          const requestBody = (await info.request.json()) as Omit<Todo, "id">;
          return {
            body: {
              id: "1",
              ...requestBody,
            },
            init: {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          };
        }, 0),
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
        getListTodoMockHandler(listTodoResponse200LargeTodos, 0),
        getPostTodoMockHandler(postTodoResponse200Default, 0),
        getPutTodoMockHandler(putTodoResponse200Default, 0),
        getDeleteTodoMockHandler(deleteTodoResponse204Default, 0),
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
            const filtered = listTodoResponse200Custom.body.filter(
              (todo) => todo.assignee === assigneeEq,
            );
            return {
              body: filtered,
              init: {
                status: 200,
                headers: { "Content-Type": "application/json" },
              },
            };
          }

          return {
            body: listTodoResponse200Custom.body,
            init: {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          };
        }, 0),
        getPostTodoMockHandler(postTodoResponse200Default, 0),
        getPutTodoMockHandler(putTodoResponse200Default, 0),
        getDeleteTodoMockHandler(deleteTodoResponse204Default, 0),
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
          return {
            body: listTodoResponse200Custom.body,
            init: {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          };
        }),
      ],
    },
  },
};
