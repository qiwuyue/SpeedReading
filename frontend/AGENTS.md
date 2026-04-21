<!-- BEGIN:nextjs-agent-rules -->
# Next.js + Tailwind CSS — LLM Best Practices Guide

> A reference for any LLM generating, reviewing, or refactoring code in a Next.js + Tailwind CSS project.
> Follow every rule here unless the user explicitly overrides it.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Next.js Best Practices](#nextjs-best-practices)
3. [Tailwind CSS Best Practices](#tailwind-css-best-practices)
4. [Component Patterns](#component-patterns)
5. [Performance](#performance)
6. [Accessibility](#accessibility)
7. [TypeScript](#typescript)
8. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Project Structure

Use the **App Router** (`/app`) unless the user explicitly says they are on Pages Router (`/pages`).

```
src/
├── app/
│   ├── layout.tsx          # Root layout — fonts, global providers
│   ├── page.tsx            # Home route
│   ├── globals.css         # Tailwind directives + CSS variables only
│   └── [route]/
│       ├── page.tsx        # Route entry point
│       └── layout.tsx      # Nested layout (only when needed)
├── components/
│   ├── ui/                 # Headless / primitive components (Button, Input…)
│   └── [feature]/          # Feature-specific components
├── lib/                    # Pure utility functions, no React
├── hooks/                  # Custom React hooks
└── types/                  # Shared TypeScript types / interfaces
```

- Co-locate tests next to the file they test (`Button.test.tsx` beside `Button.tsx`).
- Keep `app/` for routing only — business logic belongs in `lib/` or `hooks/`.

---

## Next.js Best Practices

### Server vs. Client Components

Default to **Server Components**. Add `"use client"` only when you need:
- `useState` / `useReducer` / `useEffect`
- Browser APIs (`window`, `document`, etc.)
- Event listeners or interactive callbacks

```tsx
// ✅ Server Component — no directive needed
export default async function ProductList() {
  const products = await fetchProducts(); // runs on server
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// ✅ Client Component — declared explicitly
"use client";
import { useState } from "react";
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### Data Fetching

- Fetch data in **Server Components** or **Route Handlers** (`app/api/`), not inside `useEffect`.
- Use `fetch` with Next.js cache options — don't install a separate HTTP client for simple requests.

```tsx
// Cache forever (static)
const data = await fetch("/api/config", { cache: "force-cache" });

// Revalidate every 60 seconds (ISR)
const data = await fetch("/api/posts", { next: { revalidate: 60 } });

// Always fresh (dynamic)
const data = await fetch("/api/cart", { cache: "no-store" });
```

### Routing & Navigation

- Use `<Link href="…">` for all internal navigation — never `<a href="…">`.
- Use `useRouter()` from `next/navigation` (App Router) — not `next/router`.
- Prefer `redirect()` (server-side) over `router.push()` for post-form redirects.

### Images & Fonts

```tsx
// ✅ Always use next/image
import Image from "next/image";
<Image src="/hero.jpg" alt="Hero" width={1200} height={630} priority />

// ✅ Always use next/font
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });
```

Never use raw `<img>` tags or `@import` Google Fonts in CSS.

### Metadata

```tsx
// Static
export const metadata: Metadata = {
  title: "My App",
  description: "…",
};

// Dynamic
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id);
  return { title: product.name };
}
```

### Error & Loading States

Every route that fetches data should have:
- `loading.tsx` — shown automatically during Server Component streaming
- `error.tsx` — must be a Client Component (`"use client"`) with `reset` prop

---

## Tailwind CSS Best Practices

### Configuration

```js
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],   // Keep content paths tight
  theme: {
    extend: {
      colors: {
        brand: {                       // Use semantic names, not hex literals
          50:  "#f0f9ff",
          500: "#0ea5e9",
          900: "#0c4a6e",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)"],   // Reference CSS variables from next/font
      },
    },
  },
} satisfies Config;
```

### Class Organization Order

Apply classes in this consistent order (matches Prettier Tailwind plugin):

```
Layout → Display → Position → Box Model → Typography → Visual → Interactive → Responsive → Dark Mode
```

Example:
```tsx
<div className="flex flex-col items-center gap-4 px-6 py-4 text-sm font-medium text-gray-900 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow md:flex-row dark:bg-gray-800 dark:text-white" />
```

Install `prettier-plugin-tailwindcss` to enforce this automatically.

### Avoid Arbitrary Values in Hot Paths

```tsx
// ❌ Avoid — not in your design system
<div className="w-[337px] mt-[13px] text-[#3d82f6]" />

// ✅ Prefer — extend the theme instead
<div className="w-84 mt-3 text-brand-500" />
```

Reserve `[]` arbitrary values for truly one-off cases (e.g., a background image URL).

### Dynamic Class Names

Tailwind needs full class strings to be present at build time — it cannot reconstruct them from fragments.

```tsx
// ❌ Breaks — Tailwind won't include these classes
const color = "red";
<div className={`text-${color}-500`} />

// ✅ Safe — full class name is always present in source
const colorMap = { red: "text-red-500", blue: "text-blue-500" };
<div className={colorMap[color]} />
```

### Component Variants with `cva`

Use `class-variance-authority` (cva) for components with multiple variants:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      intent: {
        primary: "bg-brand-500 text-white hover:bg-brand-600",
        ghost:   "bg-transparent text-gray-700 hover:bg-gray-100",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-base",
        lg: "h-12 px-6 text-lg",
      },
    },
    defaultVariants: { intent: "primary", size: "md" },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({ intent, size, className, ...props }: ButtonProps) {
  return <button className={cn(button({ intent, size }), className)} {...props} />;
}
```

### The `cn` Utility

Always include and use a `cn` helper that merges and deduplicates classes:

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

This prevents class conflicts like `p-2 p-4` resolving unpredictably.

### Responsive Design

- **Mobile-first** always. Write base styles for mobile, add breakpoint prefixes to override upward.
- Use the standard breakpoint ladder: `sm` (640) → `md` (768) → `lg` (1024) → `xl` (1280) → `2xl` (1536).

```tsx
// ✅ Mobile-first
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" />

// ❌ Desktop-first — avoid
<div className="grid grid-cols-4 gap-4 lg:grid-cols-2 sm:grid-cols-1" />
```

### Dark Mode

Set `darkMode: "class"` in `tailwind.config.ts` and use the `dark:` prefix:

```tsx
<div className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50" />
```

---

## Component Patterns

### Keep Components Small and Focused

- A component should do one thing.
- If JSX exceeds ~80 lines, split it.
- Extract repeated markup into sub-components, not just variables.

### Props Interface Naming

```ts
// ✅ Name matches the component
interface ButtonProps { … }
interface CardProps { … }

// ❌ Avoid generic names
interface Props { … }
interface IProps { … }
```

### Forwarding Refs

For primitive UI components that wrap HTML elements, always forward refs:

```tsx
import { forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("border rounded-md px-3 py-2", className)} {...props} />
  )
);
Input.displayName = "Input";
```

---

## Performance

- **Never** import an entire library when tree-shaking is available (`import { motion } from "framer-motion"` ✅, not `import * as Framer`).
- Use `React.lazy` + `Suspense` (or Next.js `dynamic()`) for heavy Client Components.
- Add `loading="lazy"` is handled automatically by `next/image` for below-the-fold images. Set `priority` only on above-the-fold images.
- Avoid `useEffect` for derived state — compute it inline or with `useMemo`.
- Memoize expensive computations with `useMemo`; stabilize callbacks passed to children with `useCallback`.

```tsx
// Lazy-load heavy Client Component
import dynamic from "next/dynamic";
const RichEditor = dynamic(() => import("@/components/RichEditor"), {
  loading: () => <p>Loading editor…</p>,
  ssr: false,
});
```

---

## Accessibility

- Every interactive element must be reachable by keyboard and have a visible focus ring. Tailwind's `focus-visible:ring-2` pattern is preferred over removing outlines.
- Images need descriptive `alt` text. Decorative images use `alt=""`.
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<button>`) before reaching for `<div>`.
- Pair icon-only buttons with `aria-label`.
- Color contrast must meet WCAG AA (4.5:1 for normal text, 3:1 for large text).

```tsx
// ✅ Accessible icon button
<button aria-label="Close dialog" className="focus-visible:ring-2 …">
  <XIcon className="h-4 w-4" aria-hidden="true" />
</button>
```

---

## TypeScript

- Enable `strict: true` in `tsconfig.json`.
- Never use `any` — use `unknown` and narrow, or model the type properly.
- Prefer `interface` for object shapes, `type` for unions and utility types.
- Type all Server Action and Route Handler inputs with `zod` schemas before using the data.

```ts
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  body:  z.string().min(1),
});

export async function createPost(formData: FormData) {
  const parsed = CreatePostSchema.safeParse({
    title: formData.get("title"),
    body:  formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.flatten() };
  // …
}
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | What to do instead |
|---|---|
| `"use client"` at the top of every file | Default to Server Components; add directive only when needed |
| `useEffect` for data fetching | Fetch in Server Components or Route Handlers |
| Raw `<img>` tags | `next/image` |
| `@import` Google Fonts in CSS | `next/font/google` |
| `<a href="…">` for internal links | `<Link href="…">` from `next/link` |
| Arbitrary Tailwind values everywhere | Extend the theme in `tailwind.config.ts` |
| String interpolation to build class names | Full class name lookup maps |
| Missing `cn()` / `twMerge` when merging classes | Always use `cn()` from `lib/utils` |
| Storing server secrets in Client Components | Keep secrets in Server Components or Route Handlers only |
| `any` type | Proper types or `unknown` + narrowing |
| `export default` anonymous arrow functions | Named exports for better debugging traces |

---

*Last updated: April 2026. Targets Next.js 15 (App Router) and Tailwind CSS v4.*
<!-- END:nextjs-agent-rules -->
