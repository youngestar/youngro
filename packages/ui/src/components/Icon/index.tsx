"use client";

import * as React from "react";
import type { SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export type IconSize = "sm" | "md" | "lg" | number;

export interface IconProps {
  icon: LucideIcon | React.ComponentType<SVGProps<SVGSVGElement>>;
  size?: IconSize; // tailwind sizes for sm/md/lg, number uses inline px
  strokeWidth?: number;
  className?: string;
  "aria-label"?: string;
}

const sizeToClass: Record<Exclude<IconSize, number>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export const Icon: React.FC<IconProps> = ({
  icon: IconImpl,
  size = "md",
  strokeWidth = 2,
  className,
  ...aria
}) => {
  const isNumber = typeof size === "number";
  const classFromSize = isNumber ? undefined : sizeToClass[size];
  const style = isNumber ? { width: size, height: size } : undefined;

  const a11yProps = aria["aria-label"]
    ? { role: "img", "aria-label": aria["aria-label"] }
    : { "aria-hidden": true };

  return (
    <IconImpl
      strokeWidth={strokeWidth}
      className={clsx(classFromSize, className)}
      style={style}
      {...a11yProps}
    />
  );
};

export default Icon;
