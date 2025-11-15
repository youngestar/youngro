import React, { useMemo } from "react";
import "./animated-wave.css";

export type WaveDirection = "up" | "down";
export type MovementDirection = "left" | "right";

interface AnimatedWaveProps {
  height?: number; // base wave height
  amplitude?: number; // vertical variance
  waveLength?: number; // one cycle length
  fillColor?: string; // CSS color
  direction?: WaveDirection;
  movementDirection?: MovementDirection;
  animationSpeed?: number; // pixels per second
  className?: string;
}

function generateSineWavePath(
  width: number,
  height: number,
  amplitude: number,
  waveLength: number,
  direction: WaveDirection
): string {
  const points: string[] = [];
  const numberOfWaves = Math.ceil(width / waveLength);
  const totalWavesWidth = numberOfWaves * waveLength;
  const step = 1;
  const baseY = direction === "up" ? amplitude : height - amplitude;
  points.push(`M 0 ${baseY}`);
  const factor = (Math.PI * 2) / waveLength;
  for (let x = 0; x <= totalWavesWidth; x += step) {
    const deltaY = amplitude * Math.sin(factor * x);
    const y = direction === "up" ? baseY - deltaY : baseY + deltaY;
    points.push(`L ${x} ${y}`);
  }
  const closeY = direction === "up" ? height : 0;
  points.push(`L ${totalWavesWidth} ${closeY}`);
  points.push(`L 0 ${closeY} Z`);
  return points.join(" ");
}

export function AnimatedWave({
  height = 40,
  amplitude = 14,
  waveLength = 250,
  // 默认读取集中导出的舞台变量（可通过 CSS 覆盖），回退到主色
  fillColor = "var(--stage-wave-color, hsl(var(--primary-50) / 1))",
  direction = "down",
  movementDirection = "left",
  animationSpeed = 50,
  className = "",
  children,
}: React.PropsWithChildren<AnimatedWaveProps>) {
  const fullHeight = height + amplitude * 2;
  const maskImage = useMemo(() => {
    const path = generateSineWavePath(
      waveLength,
      fullHeight,
      amplitude,
      waveLength,
      direction
    );
    const svg = `<svg width="${waveLength}" height="${fullHeight}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`;
    // Use URL-encoded SVG to avoid SSR/CSR divergence
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [waveLength, fullHeight, amplitude, direction]);

  const duration = waveLength / animationSpeed;

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute left-0 right-0 top-0 w-full overflow-hidden pointer-events-none">
        <div
          className="wave-colored-area colored-area"
          style={{
            background: fillColor,
            height: fullHeight,
            WebkitMaskImage: maskImage,
            maskImage: maskImage,
            width: "200vw",
            animation: `wave-animation ${duration}s linear infinite`,
            animationDirection:
              movementDirection === "left" ? "normal" : "reverse",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}

export default AnimatedWave;
