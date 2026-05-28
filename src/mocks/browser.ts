import { setupWorker } from "msw/browser";
import { getTodosMock } from "../../msw/todos.msw";

// 生成されたMSWハンドラーをインポート
const handlers = getTodosMock();

// Service Workerのセットアップ
export const worker = setupWorker(...handlers);
