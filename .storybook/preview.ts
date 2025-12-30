import type { Preview } from "@storybook/react";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "hsl(220 20% 4%)" },
        { name: "light", value: "hsl(0 0% 100%)" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="dark p-8 min-h-screen bg-background text-foreground font-sans">
        <Story />
      </div>
    ),
  ],
};

export default preview;
