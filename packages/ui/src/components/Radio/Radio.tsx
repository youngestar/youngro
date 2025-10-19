"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const radio = cva(
  "inline-flex items-center justify-center rounded-full border p-1",
  {
    variants: {
      intent: {
        default: "border-slate-300 bg-white",
      },
      size: {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
      },
    },
    defaultVariants: {
      intent: "default",
      size: "md",
    },
  }
);

export type RadioProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof radio>;

export const Radio: React.FC<RadioProps> = ({
  className,
  intent,
  size,
  ...props
}) => {
  return (
    <input
      type="radio"
      {...props}
      className={clsx(radio({ intent, size }), className)}
    />
  );
};

export default Radio;
