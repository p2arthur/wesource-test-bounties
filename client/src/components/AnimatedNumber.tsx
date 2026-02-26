import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number; // ms
  decimals?: number;
  className?: string;
}

export default function AnimatedNumber({ value, duration = 1200, decimals = 0, className = '' }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number>();
  const start = useRef<number>();
  const initial = useRef<number>(value);

  useEffect(() => {
    initial.current = display;
    let frame: number;
    function animate(ts: number) {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const next = initial.current + (value - initial.current) * easeOutExpo(progress);
      setDisplay(next);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
        start.current = undefined;
      }
    }
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      start.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className}>{display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>
  );
}

function easeOutExpo(x: number) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
