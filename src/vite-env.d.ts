/// <reference types="vite/client" />

import type * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        autoplay?: boolean | string;
        loop?: boolean | string;
        mode?: string;
        src?: string;
        speed?: string;
      };
    }
  }
}
