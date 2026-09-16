"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

export function AnimatedNumber({
  value,
  formatFn,
  duration = 0.6,
}: {
  value: number;
  formatFn?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest),
    });
    prevValue.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{formatFn ? formatFn(display) : Math.round(display).toLocaleString()}</>;
}
