import { useState, useEffect } from "react";

export default function ContadorRegressivo({ dataFinal }: { dataFinal: string }) {
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>({h:0, m:0, s:0});

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(dataFinal).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        setTimeLeft({
          h: Math.floor((diff / (1000 * 60 * 60))),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [dataFinal]);

  if (!timeLeft) return <span>ENCERRADO</span>;

  return (
    <>{timeLeft.h}h {timeLeft.m}m {timeLeft.s}s</>
  );
}