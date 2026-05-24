import React from "react";
import type { Preview } from "@storybook/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { initialize, mswLoader } from "msw-storybook-addon";

// MSWの初期化
initialize();

const queryClient = new QueryClient();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  loaders: [mswLoader],
};

export default preview;
