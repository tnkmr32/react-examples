#!/usr/bin/env ts-node
/**
 * OpenAPI自動生成コードの移植スクリプト
 *
 * このスクリプトは openapi/generated 配下のコードを
 * プロジェクトの適切な場所に移植し、MSWモックを書き直します。
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { execSync } from "child_process";

// プロジェクトルート
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../..");

// パス定義
const PATHS = {
  generatedModels: path.join(ROOT_DIR, "openapi/generated/models"),
  generatedTodos: path.join(ROOT_DIR, "openapi/generated/todos"),
  targetModels: path.join(ROOT_DIR, "src/entities/apis/models"),
  targetTodos: path.join(ROOT_DIR, "src/entities/apis/todos"),
  targetMsw: path.join(ROOT_DIR, "msw/todos.msw.ts"),
  mswResponses: path.join(ROOT_DIR, "msw/responses"),
};

/**
 * ディレクトリを再帰的にコピー
 */
function copyDirectory(src: string, dest: string): void {
  // 移植先ディレクトリを作成
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Copied: ${path.relative(ROOT_DIR, destPath)}`);
    }
  }
}

/**
 * レスポンスサンプル情報
 */
interface ResponseSample {
  functionName: string; // e.g., "getListTodoResponseMock"
  exportName: string; // e.g., "listTodoResponse200Default"
  endpoint: string; // e.g., "listTodo"
  method: string; // e.g., "get"
  responseType: string; // e.g., "ListTodoResponse"
  body: string; // レスポンスボディのコード
  statusCode: number;
}

/**
 * todos.msw.ts からレスポンスサンプルを抽出
 */
function extractResponseSamples(mswContent: string): ResponseSample[] {
  const samples: ResponseSample[] = [];

  // レスポンスサンプル関数を抽出
  // パターン: export const getXxxResponseMock = (...): Type => {...} or [...]
  // 複数行のパラメータに対応
  const responseMockRegex =
    /export const (get(\w+)ResponseMock)\s*=\s*\([\s\S]*?\):\s*(\w+)\s*=>\s*(\(?\{[\s\S]*?\}\)?|\[[\s\S]*?\]);/g;

  let match;
  while ((match = responseMockRegex.exec(mswContent)) !== null) {
    const functionName = match[1];
    const endpoint = match[2]; // e.g., "ListTodo", "PostTodo"
    const responseType = match[3];
    let body = match[4].trim();

    // 括弧で囲まれている場合は削除
    if (body.startsWith("(") && body.endsWith(")")) {
      body = body.slice(1, -1).trim();
    }

    // 末尾のセミコロンを削除
    if (body.endsWith(";")) {
      body = body.slice(0, -1).trim();
    }

    // faker を使っている場合は、静的なデフォルト値に置き換え
    if (body.includes("faker.")) {
      // オブジェクトの場合、fakerを静的な値に置き換える
      body = body.replace(/faker\.\w+\.\w+\(\)/g, '"sample-value"');
      // 不要な overrideResponse の展開を削除
      body = body.replace(/,?\s*\.\.\.overrideResponse,?\s*/g, "");
      // 末尾のカンマを削除
      body = body.replace(/,(\s*})$/, "$1");
    }

    // エンドポイント名から method を推測
    let method = "get";
    if (endpoint.startsWith("Post")) method = "post";
    else if (endpoint.startsWith("Put")) method = "put";
    else if (endpoint.startsWith("Delete")) method = "delete";
    else if (endpoint.startsWith("Get")) method = "get";
    else if (endpoint.startsWith("List")) method = "get";

    // エンドポイント名を camelCase に変換（例: ListTodo -> listTodo）
    const endpointCamel = endpoint.charAt(0).toLowerCase() + endpoint.slice(1);

    // ステータスコードを推測（deleteは204、それ以外は200）
    const statusCode = method === "delete" ? 204 : 200;

    samples.push({
      functionName,
      exportName: `${endpointCamel}Response${statusCode}Default`,
      endpoint: endpointCamel,
      method,
      responseType,
      body: body,
      statusCode,
    });
  }

  return samples;
}

/**
 * レスポンスファイルを生成
 */
function generateResponseFile(sample: ResponseSample): string {
  // bodyのフォーマットを整える
  let formattedBody = sample.body;

  // 複数行の場合、適切にインデントを調整
  if (formattedBody.includes("\n")) {
    const lines = formattedBody.split("\n");
    // 各行のインデントを調整（先頭と末尾を除く）
    formattedBody = lines
      .map((line, index) => {
        if (index === 0) return line; // 最初の行はそのまま
        if (index === lines.length - 1) return line; // 最後の行もそのまま
        // 既存のインデントを削除して、4スペースで再インデント
        const trimmedLine = line.trim();
        return trimmedLine ? "    " + trimmedLine : "";
      })
      .join("\n");
  }

  return `import type { ${sample.responseType} } from "../../../src/entities/apis/models";
import type { MockResponse } from "../types";

export const ${sample.exportName}: MockResponse<${sample.responseType}> = {
  body: ${formattedBody},
  init: { status: ${sample.statusCode}, headers: { "Content-Type": "application/json" } },
};
`;
}

/**
 * msw/todos.msw.ts を生成
 */
function generateMswFile(samples: ResponseSample[]): string {
  // importステートメントを生成
  const imports = samples
    .map((sample) => {
      return `import { ${sample.exportName} } from "./responses/${sample.endpoint}/${sample.exportName}";`;
    })
    .join("\n");

  // 型のimport（重複を除去）
  const types = Array.from(new Set(samples.map((s) => s.responseType)));
  // Todoは常に必要
  if (!types.includes("Todo")) {
    types.push("Todo");
  }
  const typeImports = `import type { ${types.join(", ")} } from "../src/entities/apis/models";`;

  // ハンドラーファクトリーを生成
  const handlers = samples
    .map((sample) => {
      const handlerName = `get${sample.endpoint.charAt(0).toUpperCase() + sample.endpoint.slice(1)}MockHandler`;
      const url =
        sample.endpoint === "listTodo" || sample.endpoint === "postTodo"
          ? `"http://localhost:8080/todos"`
          : `"http://localhost:8080/todos/:todoId"`;

      return `export const ${handlerName} =
  createMockHandlerFactory<${sample.responseType}>(
    "${sample.method}",
    ${url},
    ${sample.exportName},
  );`;
    })
    .join("\n\n");

  // getTodosMock 関数を生成
  const listSample = samples.find((s) => s.endpoint === "listTodo");
  const listResponseType = listSample?.responseType || "ListTodoResponse";

  const handlerMapping = `{
      list: getListTodoMockHandler,
      create: getPostTodoMockHandler,
      get: getGetTodoMockHandler,
      update: getPutTodoMockHandler,
      delete: getDeleteTodoMockHandler,
    }`;

  return `/**
 * Generated by orval v7.1.1 🍺
 * Do not edit manually.
 * React CS Example
 * OpenAPI for example of React Cost Savings Component
 * OpenAPI spec version: 1.0.0
 */
${typeImports}
${imports}
import { createMockHandlerFactory } from "./utils/createMockHandlerFactory";
import { createRestResourceHandlers } from "./utils/createRestResourceHandlers";

${handlers}

/**
 * Todoリソースのモックハンドラーを生成
 * RESTful APIパターンを使用し、/todosパスに対して統一されたデータストアを使用
 */
export const getTodosMock = () => {
  return createRestResourceHandlers<Todo, ${listResponseType}>({
    basePath: "/todos",
    idParam: "todoId",
    initialData: listTodoResponse200Default.body,
    handlers: ${handlerMapping},
    // オプション: リスト取得時のフィルター処理
    filterFn: (data, searchParams) => {
      const assigneeEq = searchParams.get("assignee_eq");
      if (assigneeEq) {
        return data.filter((todo) => todo.assignee === assigneeEq);
      }
      return data;
    },
  });
};
`;
}

/**
 * Prettierを実行して生成されたファイルをフォーマット
 */
function runPrettier(): void {
  console.log("📝 Step 4: Prettierでコードをフォーマット中...");

  const targetPaths = [
    "src/entities/apis/models/**/*.ts",
    "src/entities/apis/todos/**/*.ts",
    "msw/todos.msw.ts",
    "msw/responses/**/*.ts",
  ];

  try {
    for (const targetPath of targetPaths) {
      const fullPath = path.join(ROOT_DIR, targetPath);
      console.log(`✓ Formatting: ${targetPath}`);
      execSync(`npx prettier --write "${fullPath}"`, {
        cwd: ROOT_DIR,
        stdio: "ignore", // 出力を非表示
      });
    }
    console.log("✅ Prettierによるフォーマットが完了しました\n");
  } catch (error) {
    console.log(
      "⚠️  Prettierの実行中にエラーが発生しましたが、処理は続行されます\n",
    );
  }
}

/**
 * メイン処理
 */
function main(): void {
  console.log("🚀 OpenAPI自動生成コードの移植を開始します...\n");

  // 1. models を移植
  console.log("📁 Step 1: Models を移植中...");
  if (fs.existsSync(PATHS.generatedModels)) {
    copyDirectory(PATHS.generatedModels, PATHS.targetModels);
    console.log("✅ Models の移植が完了しました\n");
  } else {
    console.log("⚠️  openapi/generated/models が見つかりません\n");
  }

  // 2. todos.ts (APIクライアント) を移植
  console.log("📁 Step 2: APIクライアント (todos.ts) を移植中...");
  const todosTsSource = path.join(PATHS.generatedTodos, "todos.ts");
  const todosTsTarget = path.join(PATHS.targetTodos, "todos.ts");

  if (fs.existsSync(todosTsSource)) {
    if (!fs.existsSync(PATHS.targetTodos)) {
      fs.mkdirSync(PATHS.targetTodos, { recursive: true });
    }

    // ファイルを読み込んで、インポートパスを修正
    let content = fs.readFileSync(todosTsSource, "utf-8");

    // インポートパスを修正
    // ../../../src/entities/backend/customInstance -> ../../backend/customInstance
    content = content.replace(
      /from ["']\.\.\/\.\.\/\.\.\/src\/entities\//g,
      'from "../../',
    );

    fs.writeFileSync(todosTsTarget, content, "utf-8");
    console.log(
      `✓ Copied and fixed imports: ${path.relative(ROOT_DIR, todosTsTarget)}`,
    );
    console.log("✅ APIクライアントの移植が完了しました\n");
  } else {
    console.log("⚠️  openapi/generated/todos/todos.ts が見つかりません\n");
  }

  // 3. todos.msw.ts を解析して移植
  console.log("📁 Step 3: MSWモックを解析・移植中...");
  const todosMswSource = path.join(PATHS.generatedTodos, "todos.msw.ts");

  if (!fs.existsSync(todosMswSource)) {
    console.log("⚠️  openapi/generated/todos/todos.msw.ts が見つかりません");
    return;
  }

  const mswContent = fs.readFileSync(todosMswSource, "utf-8");
  const samples = extractResponseSamples(mswContent);

  console.log(`📝 ${samples.length} 個のレスポンスサンプルを検出しました`);

  // レスポンスファイルを生成
  for (const sample of samples) {
    const responseDir = path.join(PATHS.mswResponses, sample.endpoint);
    if (!fs.existsSync(responseDir)) {
      fs.mkdirSync(responseDir, { recursive: true });
    }

    const responseFilePath = path.join(responseDir, `${sample.exportName}.ts`);
    const responseContent = generateResponseFile(sample);
    fs.writeFileSync(responseFilePath, responseContent, "utf-8");
    console.log(`✓ Generated: ${path.relative(ROOT_DIR, responseFilePath)}`);
  }

  // msw/todos.msw.ts を生成
  const mswFileContent = generateMswFile(samples);
  fs.writeFileSync(PATHS.targetMsw, mswFileContent, "utf-8");
  console.log(`✓ Generated: ${path.relative(ROOT_DIR, PATHS.targetMsw)}`);

  console.log("✅ MSWモックの移植が完了しました\n");

  // 4. Prettierでフォーマット
  runPrettier();

  console.log("🎉 すべての移植が完了しました！");
}

// スクリプト実行
main();
