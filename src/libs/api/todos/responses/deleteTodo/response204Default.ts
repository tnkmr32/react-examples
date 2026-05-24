import type { Todo } from "../../../model";
import type { MockResponse } from "../types";

export const response204Default: MockResponse<Todo> = {
  body: {
    id: "id-0",
    title: "title-0",
    description: "title-0",
    assignee: "person-0",
  },
  init: { status: 204, headers: { "Content-Type": "application/json" } },
};
