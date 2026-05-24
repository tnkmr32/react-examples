/**
 * RESTful APIリソースのハンドラーを生成するファクトリー
 */
import type { ResourceEntity } from "./types";
import type { createMockHandlerFactory } from "./createMockHandlerFactory";

/**
 * RESTful APIリソース用のデータストア
 * 同じパスに対して同じストアを使用し、メソッドごとに操作を行う
 */
interface RestResourceStore<T extends ResourceEntity> {
  data: T[];
  nextId: number;
}

/**
 * RESTful APIリソースのハンドラーを生成するファクトリー
 *
 * @param options.basePath ベースパス（例: "/todos"）
 * @param options.idParam IDパラメータ名（例: "todoId"）
 * @param options.initialData 初期データ
 * @param options.handlers 各メソッドのハンドラーファクトリー
 * @param options.filterFn リスト取得時のフィルター関数（オプション）
 *
 * @example
 * ```typescript
 * const handlers = createRestResourceHandlers<Todo, ListTodoResponse>({
 *   basePath: "/todos",
 *   idParam: "todoId",
 *   initialData: [...],
 *   handlers: {
 *     list: getListTodoMockHandler,
 *     create: getPostTodoMockHandler,
 *     get: getGetTodoMockHandler,
 *     update: getPutTodoMockHandler,
 *     delete: getDeleteTodoMockHandler,
 *   },
 *   filterFn: (data, searchParams) => {
 *     const name = searchParams.get("name");
 *     return name ? data.filter(item => item.name === name) : data;
 *   },
 * });
 * ```
 */
export function createRestResourceHandlers<
  TEntity extends ResourceEntity,
  TListResponse,
>(options: {
  basePath: string;
  idParam: string;
  initialData: TEntity[];
  handlers: {
    list: ReturnType<typeof createMockHandlerFactory<TListResponse>>;
    create: ReturnType<typeof createMockHandlerFactory<TEntity>>;
    get: ReturnType<typeof createMockHandlerFactory<TEntity>>;
    update: ReturnType<typeof createMockHandlerFactory<TEntity>>;
    delete: ReturnType<typeof createMockHandlerFactory<TEntity>>;
  };
  filterFn?: (
    data: TEntity[],
    searchParams: URLSearchParams,
  ) => TEntity[] | TListResponse;
}) {
  // リソースごとのデータストア（クロージャで保持）
  const store: RestResourceStore<TEntity> = {
    data: [...options.initialData],
    nextId: options.initialData.length + 1,
  };

  return [
    // GET /resource - 一覧取得
    options.handlers.list((info) => {
      const url = new URL(info.request.url);
      const result = options.filterFn
        ? options.filterFn(store.data, url.searchParams)
        : store.data;

      return {
        body: result as TListResponse,
        init: { status: 200, headers: { "Content-Type": "application/json" } },
      };
    }, 0),

    // POST /resource - 新規作成
    options.handlers.create(async (info) => {
      const requestBody = (await info.request.json()) as Omit<TEntity, "id">;
      const newEntity: TEntity = {
        id: `id-${store.nextId++}`,
        ...requestBody,
      } as TEntity;
      store.data.push(newEntity);

      return {
        body: newEntity,
        init: { status: 200, headers: { "Content-Type": "application/json" } },
      };
    }, 0),

    // GET /resource/:id - 詳細取得
    options.handlers.get((info) => {
      const id = info.params[options.idParam] as string;
      const entity = store.data.find((item) => item.id === id);

      if (!entity) {
        return {
          body: {
            message: `${options.basePath} not found`,
          } as unknown as TEntity,
          init: {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        };
      }

      return {
        body: entity,
        init: { status: 200, headers: { "Content-Type": "application/json" } },
      };
    }, 0),

    // PUT /resource/:id - 更新
    options.handlers.update(async (info) => {
      const id = info.params[options.idParam] as string;
      const requestBody = (await info.request.json()) as Omit<TEntity, "id">;
      const index = store.data.findIndex((item) => item.id === id);

      if (index === -1) {
        return {
          body: {
            message: `${options.basePath} not found`,
          } as unknown as TEntity,
          init: {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        };
      }

      const updatedEntity: TEntity = {
        id,
        ...requestBody,
      } as TEntity;
      store.data[index] = updatedEntity;

      return {
        body: updatedEntity,
        init: { status: 200, headers: { "Content-Type": "application/json" } },
      };
    }, 0),

    // DELETE /resource/:id - 削除
    options.handlers.delete((info) => {
      const id = info.params[options.idParam] as string;
      const index = store.data.findIndex((item) => item.id === id);

      if (index === -1) {
        return {
          body: {
            message: `${options.basePath} not found`,
          } as unknown as TEntity,
          init: {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        };
      }

      store.data.splice(index, 1);

      return {
        body: {} as TEntity,
        init: { status: 204, headers: { "Content-Type": "application/json" } },
      };
    }, 0),
  ];
}
