import { defineConfig } from "orval";

export default defineConfig({
  sampleFront: {
    output: {
      mode: "tags-split",
      clean: true,
      target: "openapi/generated/api.ts",
      schemas: "openapi/generated/models",
      client: "react-query",
      httpClient: "axios",
      tsconfig: "tsconfig.json",
      mock: {
        generators: [
          {
            type: "msw",
            baseUrl: "http://localhost:8080",
            useExamples: true,
          },
        ],
      },
      override: {
        mutator: {
          path: "src/entities/backend/customInstance.ts",
          name: "backendCustomInstance",
        },
      },
    },
    input: {
      target: "./openapi/openapi_todo.yaml",
    },
    hooks: {
      afterAllFilesWrite: [
        "prettier --write openapi/generated",
        "npx ts-node scripts/migrate-generated-code.ts",
      ],
    },
  },
});
