import { HttpResponseInit } from "msw";

/**
 * MSWレスポンスの共通型定義
 * @template T - レスポンスボディの型
 */
export type MockResponse<T> = {
  body: T;
  init: HttpResponseInit;
};
