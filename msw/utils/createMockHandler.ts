/**
 * 共通のモックハンドラー作成関数
 */
import { HttpResponse, delay, http } from "msw";
import type { MockResponse, OverrideResponse } from "./types";

/**
 * 共通のモックハンドラー作成関数
 * @param method HTTPメソッド
 * @param url エンドポイントURL
 * @param defaultResponse デフォルトのモックレスポンス（bodyとinitを持つオブジェクト）
 * @param delayTime レスポンスの遅延時間（ミリ秒）
 * @param overrideResponse レスポンスを上書きする値または関数
 */
export const createMockHandler = <T>(
  method: "get" | "post" | "put" | "delete",
  url: string,
  defaultResponse: { body: T; init: ResponseInit },
  delayTime: number = 1000,
  overrideResponse?: OverrideResponse<T>,
) => {
  const httpMethod = http[method];
  return httpMethod(url, async (info) => {
    await delay(delayTime);

    let response: MockResponse<T>;

    if (overrideResponse !== undefined) {
      if (typeof overrideResponse === "function") {
        response = await overrideResponse(info);
      } else {
        response = overrideResponse;
      }
    } else {
      response = defaultResponse;
    }

    return new HttpResponse(JSON.stringify(response.body), response.init);
  });
};
