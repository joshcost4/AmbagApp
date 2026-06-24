/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  default content;
}