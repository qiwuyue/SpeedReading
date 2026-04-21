import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navbar: {
          bg: "rgba(9, 9, 11, 0.82)",
          "bg-mobile": "rgba(9, 9, 11, 0.97)",
        },
      },
    },
  },
} satisfies Config;
