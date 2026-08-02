# TanStack Queryで複数画面から同一APIを呼ぶ場合のSSOT設計パターン

## 概要

このリポジトリでは `orval` が `src/entities/apis/**` にAPIクライアント（`useXxxTodo`系フック）を自動生成し、各画面のView層（例: `src/app/todo/page.view.ts`）がそれらを呼び出して業務処理（ユースケース）を実装している。

複数の画面・コンポーネントから同一の `useXxxTodo` フックを呼び出すこと自体は問題なく、むしろTanStack QueryにおけるSSOT（Single Source of Truth）を実現する標準的な方法である。ただし、それが成立するには前提条件があり、本リポジトリでは実際にその前提が崩れて型エラーとキャッシュ不整合を起こしていた（2026-08-02 に修正済み、`src/app/todo/page.view.ts` / `orval.config.ts` / `src/app/todo/layout.tsx` 参照）。

このドキュメントは、その修正を踏まえて「複数画面から同一APIをコールしてもSSOTを保つための設計パターン」を整理したものである。

## TanStack QueryにおけるSSOTの基本原理

TanStack Queryは、コンポーネント単位ではなく **`queryKey` 単位** でキャッシュを持つ。同じ `QueryClient` インスタンス配下であれば、

- 同じ `queryKey` を持つ `useQuery` 呼び出しは、呼び出し元がどのコンポーネントであっても同一キャッシュエントリを参照する
- 一方が `refetch()` / `invalidateQueries()` すれば、同じ `queryKey` を購読している他の全コンポーネントも自動的に再レンダリングされる
- 同時にマウントされた同一 `queryKey` の `useQuery` は通信が重複排除される

つまり **「`queryKey` = SSOTの単位」** であり、Reactのグローバルstore（Redux等）を持ち出さなくても、`QueryClient` のキャッシュ自体がSSOTとして機能する。これを成立させる前提条件は次の2点。

1. すべての呼び出しが **同一の `QueryClient` インスタンス** の配下にあること
2. 同じ論理的リソースを指す呼び出しは **同一の `queryKey`** を生成すること

## パターン1: QueryClientProviderを1つに統一する

### アンチパターン（修正前の本リポジトリ）

```tsx
// src/app/layout.tsx（ルート）
const queryClient = new QueryClient(); // モジュールスコープの単一インスタンス
export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// src/app/todo/layout.tsx（/todo配下だけをさらに包んでいた）
export function WithTanStackQuery({ children }) {
  const queryClient = new QueryClient(); // レンダーの度に新規生成（useState化されていない）
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

`QueryClientProvider` はネストすると内側が勝つ。`/todo` 配下のフックはルートの `queryClient` ではなく `WithTanStackQuery` が作る別インスタンスを参照していたため、

- `/todo` 以外のルートから同じ `useListTodo` を呼んでもキャッシュが共有されない（SSOTがルート単位に分断される）
- `new QueryClient()` が `useState` で固定化されていないため、このコンポーネントが再レンダリングされるたびにキャッシュが空になる

という問題があった。

### 推奨パターン

- **アプリ全体で `QueryClientProvider` は1箇所（通常はルートレイアウト）だけに置く。**
- どうしても画面/機能単位でキャッシュを分離したい特別な理由がある場合のみ、`useState(() => new QueryClient())` でインスタンスを固定化してから使う。

```tsx
// 分離が必要な場合の最低限の書き方
function ScopedQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

本リポジトリでは分離する理由がなかったため、`src/app/todo/layout.tsx` と `WithTanStackQuery.tsx` を削除し、ルートの `QueryClientProvider` 一本に統一した。

## パターン2: queryKeyを生成関数として一元管理する

`orval` は各エンドポイントごとに `getXxxQueryKey` をエクスポートする（例: `getListTodoQueryKey`, `src/entities/apis/todos/todos.ts`）。

```ts
export const getListTodoQueryKey = (params?: ListTodoParams) => {
  return [`/todos`, ...(params ? [params] : [])] as const;
};
```

複数画面から同じリソースを参照する場合は、**必ずこの生成関数を経由して `queryKey` を作る**。画面ごとに配列を手書きすると、キーの形が微妙にズレて（プロパティの順序、undefinedの有無など）同一リソースのはずが別キャッシュとして扱われてしまう。

```ts
// OK: 生成関数を使う。search画面もlist画面も同じキーになる
useListTodo(params, { query: { queryKey: getListTodoQueryKey(params) } });

// NG: 手書き。参照するたびに書き方が微妙に変わりSSOTが崩れるリスク
useListTodo(params, { query: { queryKey: ["/todos", params] } });
```

なお `params` が異なれば（例: 絞り込み検索の `assignee_eq` 有無）意図的に別キャッシュエントリになるのは正しい挙動である。「同じ `useXxxTodo` を呼ぶ」ことと「同じキャッシュを共有する」ことは、`queryKey` が一致して初めてイコールになる点に注意する。

## パターン3: 書き込み系はuseMutation + invalidateQueriesで同期する

### アンチパターン（修正前の本リポジトリ）

`orval.config.ts` の `override.query.useQuery: true` により、POST/PUT/DELETEまで含めた全エンドポイントが `useQuery` ベースで生成されていた。

```ts
// 修正前: usePostTodo が useMutation ではなく useQuery として生成されていた
export const getPostTodoQueryKey = (todoRegistration?: TodoRegistration) => {
  return ["POST", `/todos`, todoRegistration] as const; // リクエストボディがキーに含まれる
};
```

この構成には2つの問題があった。

1. リクエストボディが `queryKey` に含まれるため、送信するたびに**別のキャッシュエントリが増え続ける**（メモリ増加、意味のあるキャッシュにならない）
2. 書き込みが成功しても `useListTodo` の `queryKey`（`/todos`）とは無関係のキーなので、**一覧側は自動的には更新されない**。本リポジトリでは各モーダルに `reload` propsを手動で配線し、成功コールバックで明示的に `todoListView.loadTodo.reload()` を呼ぶことでこれを人力で再現していた（`src/app/todo/page.tsx` / `TodoCreateModal.tsx` 等）。この方式は、新しい画面が同じ `useListTodo` を使っても、その `reload` チェーンに組み込まれていなければ古いデータのまま表示され続けるという弱点を持つ。

### 推奨パターン

orvalの標準構成に戻し（`override.query.useQuery` を外す）、POST/PUT/DELETEは `useMutation` として生成する。呼び出し側で `onSuccess` に `invalidateQueries` を配線し、書き込みの成功を「読み取り系キャッシュの失効」として伝播させる。

```ts
// src/app/todo/page.view.ts
export const useTodoCreateView = (): TodoCreateView => {
  const queryClient = useQueryClient();
  return useCsView({
    // ...
    createButton: useCsRqAdvancedMutateButtonClickEvent(
      usePostTodo({
        mutation: {
          onSuccess: () =>
            queryClient.invalidateQueries({
              queryKey: getListTodoQueryKey(),
            }),
        },
      }),
    ),
  });
};
```

こうすると、`useListTodo()` を購読しているコンポーネントは **どの画面から作成・更新・削除が行われたかを一切知らなくても** 自動的に最新化される。手動の `reload` prop配線（UI都合のモーダルクローズやフィルターリセットなど）は残してよいが、**データ整合性そのものをそれだけに依存しない**のがポイントである。

## パターン4: 更新の伝え方は用途に応じて使い分ける

`onSuccess` での同期には主に2つの手段があり、用途で使い分ける。

| 手段 | 挙動 | 向いているケース |
|---|---|---|
| `invalidateQueries({ queryKey })` | 該当キーを「古い」とマークし、次の購読時（または即時、`refetchType` 次第）にサーバーへ再取得する | サーバー側で他の値も変わりうる操作（作成・更新・削除全般）。実装がシンプルで安全 |
| `setQueryData(queryKey, updater)` | サーバーに問い合わせず、レスポンスの内容でクライアント側キャッシュを直接書き換える | 一覧の1件だけをその場で差し替えたい、通信回数を減らしたい場合。楽観的更新にも使う |

本リポジトリのTodo一覧のように、一覧全体を再取得しても問題ないコストなら `invalidateQueries` で十分であり、まず第一選択とする。`setQueryData` は最適化が必要になった時点で導入すればよい。

## 設計チェックリスト

複数画面から同一APIフックを呼び出す機能を追加・レビューする際は、以下を確認する。

- [ ] `QueryClientProvider` はアプリ全体で1つに統一されているか（ルートを跨いで別インスタンスになっていないか）
- [ ] 画面/機能単位で `QueryClientProvider` を分離する場合、`useState(() => new QueryClient())` で固定化しているか
- [ ] 同じリソースを参照する呼び出しは、すべて `getXxxQueryKey` のような生成関数経由で `queryKey` を作っているか
- [ ] 書き込み系（POST/PUT/DELETE）は `useMutation` として実装されているか（`useQuery` の流用になっていないか）
- [ ] 書き込み成功時に、関連する読み取り系 `queryKey` へ `invalidateQueries`（または `setQueryData`）が配線されているか
- [ ] データ整合性を「手動のコールバックチェーン」だけに依存していないか（UI都合の後処理と、データ同期の責務を分離できているか）

## 参考: 本リポジトリでの適用例

- `src/app/layout.tsx` — アプリ全体で唯一の `QueryClientProvider`
- `src/entities/apis/todos/todos.ts` — `orval` 生成のAPIクライアント。`useListTodo`/`useGetTodo` は `useQuery`、`usePostTodo`/`usePutTodo`/`useDeleteTodo` は `useMutation`
- `src/app/todo/page.view.ts` — 各Viewでの `useQueryClient()` + `invalidateQueries` の配線例
- `orval.config.ts` — `override.query.useQuery` を指定しない標準構成

## 参考資料

- [TanStack Query公式: Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [TanStack Query公式: Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Orval公式: React Query統合](https://orval.dev/guides/react-query)
