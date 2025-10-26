"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const radio = cva(
  // Use accent color for radio, add focus-visible ring
  "inline-flex items-center justify-center rounded-full p-0.5 accent-primary-500 dark:accent-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60",
  {
    variants: {
      intent: {
        default: "",
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
