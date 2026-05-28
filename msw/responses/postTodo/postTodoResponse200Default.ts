import { faker } from "@faker-js/faker";
import type { Todo } from "../../../src/entities/apis/models";
import type { MockResponse } from "../types";

export const postTodoResponse200Default: MockResponse<Todo> = {
  body: {
    id: faker.string.alpha({ length: { min: 10, max: 20 } }),
    title: faker.string.alpha({ length: { min: 10, max: 20 } }),
    description: faker.string.alpha({ length: { min: 10, max: 20 } }),
    assignee: faker.string.alpha({ length: { min: 10, max: 20 } }),
  },
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
