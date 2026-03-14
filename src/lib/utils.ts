import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a unique ID with prefix, e.g. generateId('MSG') => 'MSG_1710345678901_a3f' */
export function generateId(prefix: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 5);
  return `${prefix}_${ts}_${rand}`;
}
