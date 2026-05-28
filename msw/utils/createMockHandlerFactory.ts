/**
 * モックハンドラー関数を生成するファクトリー
 */
import type { OverrideResponse } from "./types";
import { createMockHandler } from "./createMockHandler";

/**
 * モックハンドラー関数を生成するファクトリー
 * @param method HTTPメソッド
 * @param url エンドポイントURL
 * @param defaultResponse デフォルトのモックレスポンス
 */
export const createMockHandlerFactory = <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  defaultResponse: { body: T; init: ResponseInit },
) => {
  return (overrideResponse?: OverrideResponse<T>, delayTime: number = 1000) => {
    return createMockHandler<T>(
      method,
      url,
      defaultResponse,
      delayTime,
      overrideResponse,
    );
  };
};
