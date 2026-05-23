import { setupWorker } from "msw/browser";
import { getTodosMock } from "@/libs/generated/todos/todos.msw";

// 生成されたMSWハンドラーをインポート
const handlers = getTodosMock();

// Service Workerのセットアップ
export const worker = setupWorker(...handlers);
