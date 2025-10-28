import type { MathfieldElement } from "mathlive";
import type { DetailedHTMLProps, HTMLAttributes, Ref } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": DetailedHTMLProps<HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        ref?: Ref<MathfieldElement>;
        value?: string;
        placeholder?: string;
        "virtual-keyboard-mode"?: string;
      };
    }
  }
}

export {};
