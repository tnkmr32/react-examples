import type { ListTodoResponse } from "../../../model";
import { HttpResponseInit } from "msw";

type response = {
  body: ListTodoResponse;
  init: HttpResponseInit;
};

export const response200Empty: response = {
  body: [],
  init: { status: 200, headers: { "Content-Type": "application/json" } },
};
