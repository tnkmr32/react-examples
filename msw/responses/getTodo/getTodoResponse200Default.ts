import type { Todo } from "../../../src/entities/apis/models";
import type { MockResponse } from "../types";

export const getTodoResponse200Default: MockResponse<Todo> = {
  body: {
    id: "id-0",
    title: "title-0",
    description: "description-0",
    assignee: "person-0",
  },
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
