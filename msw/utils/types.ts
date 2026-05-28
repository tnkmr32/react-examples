/**
 * MSW用の共通型定義
 */
import { http } from "msw";

/**
 * MSWのリクエストハンドラー情報の型
 * 全てのHTTPメソッド（get、post、put、delete）で共通の型
 */
type HttpMethod = (typeof http)[keyof Pick<
  typeof http,
  "get" | "post" | "put" | "delete"
>];
export type MockHandlerInfo = Parameters<Parameters<HttpMethod>[1]>[0];

/**
 * モックレスポンスの型
 * bodyとinitを持つオブジェクト形式のみ受け付ける
 */
export type MockResponse<T> = { body: T; init: ResponseInit };

/**
 * overrideResponse の型
 */
export type OverrideResponse<T> =
  | MockResponse<T>
  | ((info: MockHandlerInfo) => Promise<MockResponse<T>> | MockResponse<T>);

/**
 * RESTful APIリソース用のエンティティ型
 * IDフィールドを持つオブジェクト
 */
export type ResourceEntity = { id: string };
