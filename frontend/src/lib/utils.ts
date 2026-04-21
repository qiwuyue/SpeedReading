/**
 * Utility for merging Tailwind CSS classes.
 * Combines clsx (for conditional classes) with tailwind-merge (to prevent conflicts).
 *
 * Installation: npm install clsx tailwind-merge
 */

type ClassValue =
  | string
  | undefined
  | null
  | false
  | { [key: string]: boolean };

export function cn(...inputs: ClassValue[]): string {
  // Filter out falsy values and join
  return inputs
    .flat()
    .filter((value) => typeof value === "string")
    .join(" ");
}
