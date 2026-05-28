import type { Todo } from "../../../src/entities/apis/models";
import type { MockResponse } from "../types";

export const postTodoResponse200Default: MockResponse<Todo> = {
  body: {
    assignee: "sample-value",
    description: "sample-value",
    id: "sample-value",
    title: "sample-value",
  },
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
