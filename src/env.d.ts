/// <reference types="astro/client" />

interface Window {
  umami: {
    track: {
      (eventName: string, eventData?: Record<string, string | number>): void;
      (callback: (props: Record<string, string>) => Record<string, string | number>): void;
    };
  };
}
