import type { ListTodoResponse } from "../../../model";
import type { MockResponse } from "../types";

export const response200Empty: MockResponse<ListTodoResponse> = {
  body: [],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
