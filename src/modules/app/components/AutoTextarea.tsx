import {
  MutableRefObject,
  TextareaHTMLAttributes,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";

const adjustHeight = (element: HTMLTextAreaElement) => {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
};

type AutoTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  ({ onInput, value, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;

        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }

        if (node) {
          adjustHeight(node);
        }
      },
      [forwardedRef],
    );

    const handleInput = useCallback<
      NonNullable<AutoTextareaProps["onInput"]>
    >(
      (event) => {
        adjustHeight(event.currentTarget);
        onInput?.(event);
      },
      [onInput],
    );

    useLayoutEffect(() => {
      const node = innerRef.current;
      if (!node) return;
      adjustHeight(node);
    }, [value]);

    return (
      <textarea
        {...rest}
        value={value}
        onInput={handleInput}
        ref={setRefs}
      />
    );
  },
);

AutoTextarea.displayName = "AutoTextarea";
