export {};

declare global {
  interface Window {
    __game?: {
      getState(): unknown;
      press(key: string): void;
    };
  }
}
