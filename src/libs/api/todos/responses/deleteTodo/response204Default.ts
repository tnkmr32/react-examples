import type { Todo } from "../../../model";
import { HttpResponseInit } from "msw";

type response = {
  body: Todo;
  init: HttpResponseInit;
};

export const response204Default: response = {
  body: {
    id: "id-0",
    title: "title-0",
    description: "title-0",
    assignee: "person-0",
  },
  init: { status: 204, headers: { "Content-Type": "application/json" } },
};
