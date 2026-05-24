import type { ListTodoResponse } from "../../../model";
import type { MockResponse } from "../types";

export const listTodoResponse200Empty: MockResponse<ListTodoResponse> = {
  body: [],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
