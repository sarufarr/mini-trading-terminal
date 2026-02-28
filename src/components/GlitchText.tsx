import React, { useState, useEffect, useRef } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
  charSet?: string;
  intervalMs?: number;
  iterationsPerChar?: number;
}

const defaultCharSet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:'";
const defaultIntervalMs = 100;
const defaultIterationsPerChar = 10;

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = '',
  charSet = defaultCharSet,
  intervalMs = defaultIntervalMs,
  iterationsPerChar = defaultIterationsPerChar,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const iterationCounters = useRef<number[]>([]);

  useEffect(() => {
    setIsAnimating(true);
    iterationCounters.current = Array(text.length).fill(0);
    setDisplayText(
      Array.from(
        { length: text.length },
        () => charSet[Math.floor(Math.random() * charSet.length)]
      ).join('')
    );

    intervalRef.current = setInterval(() => {
      let allDone = true;
      const nextText = Array.from(text)
        .map((originalChar, index) => {
          if (iterationCounters.current[index] < iterationsPerChar) {
            allDone = false;
            iterationCounters.current[index]++;
            return charSet[Math.floor(Math.random() * charSet.length)];
          } else {
            return originalChar;
          }
        })
        .join('');

      setDisplayText(nextText);

      if (allDone) {
        setIsAnimating(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, intervalMs);

    return () => {
      setIsAnimating(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, charSet, intervalMs, iterationsPerChar]);

  const animationClass = isAnimating ? 'opacity-75' : '';

  return (
    <span className={`${className} ${animationClass}`}>{displayText}</span>
  );
};
