"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

interface LandingFigmaFrameProps {
  children: ReactNode;
  width: number;
  height: number;
}

function getScale(width: number) {
  if (typeof window === "undefined") return 1;
  return Math.min(1, window.innerWidth / width);
}

export function LandingFigmaFrame({
  children,
  width,
  height,
}: LandingFigmaFrameProps) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      setScale(getScale(width));
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [width]);

  const scaledHeight = height * scale;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: scaledHeight }}
    >
      <div
        className="relative w-full bg-[#001020] font-trenda"
        data-node-id="18:6"
        data-name="Landing page rediseño"
        style={{ height: scaledHeight }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            "--landing-scale": scale,
            width,
            height,
            transform: "scale(var(--landing-scale))",
            transformOrigin: "0 0",
          } as CSSProperties}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
