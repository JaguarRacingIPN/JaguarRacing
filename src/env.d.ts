/// <reference types="astro/client" />

interface Window {
  umami: {
    track: {
      (eventName: string, eventData?: Record<string, string | number>): void;
      (callback: (props: Record<string, string>) => Record<string, string | number>): void;
    };
  };
}

declare module 'three';
declare module 'three/examples/jsm/loaders/OBJLoader.js';
declare module 'three/examples/jsm/controls/OrbitControls.js';
