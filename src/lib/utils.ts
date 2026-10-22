import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility standard shadcn/Aceternity: unisce classi condizionali (clsx) e
// risolve i conflitti Tailwind (tailwind-merge). Richiesta dal componente
// keyboard.tsx (@aceternity/keyboard).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
