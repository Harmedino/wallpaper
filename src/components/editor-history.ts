"use client";
import { useEffect, useRef, useState } from "react";
export function useEditorHistory(
  snapshot: string,
  apply: (snapshot: string) => void,
) {
  const history = useRef<string[]>([]),
    cursor = useRef(-1),
    restoring = useRef(false),
    current = useRef(snapshot);
  const [revision, setRevision] = useState(0);
  current.current = snapshot;
  useEffect(() => {
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (history.current[cursor.current] === snapshot) return;
      history.current = history.current.slice(0, cursor.current + 1);
      history.current.push(snapshot);
      if (history.current.length > 50) history.current.shift();
      cursor.current = history.current.length - 1;
      setRevision((n) => n + 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [snapshot]);
  function move(direction: number) {
    if (direction < 0 && history.current[cursor.current] !== current.current) {
      history.current = history.current.slice(0, cursor.current + 1);
      history.current.push(current.current);
      cursor.current++;
    }
    const next = cursor.current + direction;
    if (next < 0 || next >= history.current.length) return;
    cursor.current = next;
    restoring.current = true;
    apply(history.current[next]);
    setRevision((n) => n + 1);
  }
  function checkpoint() {
    if (history.current[cursor.current] === current.current) return;
    history.current = history.current.slice(0, cursor.current + 1);
    history.current.push(current.current);
    if (history.current.length > 50) history.current.shift();
    cursor.current = history.current.length - 1;
    setRevision((n) => n + 1);
  }
  return {
    checkpoint,
    undo: () => move(-1),
    redo: () => move(1),
    canUndo: cursor.current > 0,
    canRedo: cursor.current < history.current.length - 1,
    revision,
  };
}
