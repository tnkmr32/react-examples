import type { ListTodoResponse } from "../../../model";
import { HttpResponseInit } from "msw";

type response = {
  body: ListTodoResponse;
  init: HttpResponseInit;
};

export const response200Default: response = {
  body: [
    {
      id: "id-0",
      title: "title-0",
      description: "title-0",
      assignee: "person-0",
    },
    {
      id: "id-1",
      title: "title-1",
      description: "title-1",
      assignee: "person-1",
    },
    {
      id: "id-2",
      title: "title-2",
      description: "title-2",
      assignee: "person-2",
    },
  ],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
