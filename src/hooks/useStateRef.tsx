import { useCallback, useRef, useState } from "react";

export function useStateRef<T>(initialState: T): [T, React.Dispatch<React.SetStateAction<T>>, React.MutableRefObject<T>] {
  const [state, setState] = useState<T>(initialState);
  const ref = useRef<T>(state);

  const setStateRef = useCallback((value: React.SetStateAction<T>) => {
    setState((prev) => {
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

      ref.current = next;
      return next;
    });
  }, []);

  return [state, setStateRef, ref];
}
