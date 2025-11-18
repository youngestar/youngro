"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const checkbox = cva(
  // Use native accent color for consistent theming; add focus-visible ring
  "inline-flex items-center justify-center rounded-sm p-0.5 accent-primary-500 dark:accent-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60",
  {
    variants: {
      intent: {
        default: "",
        destructive:
          "accent-red-500 focus-visible:ring-red-400/70 dark:accent-red-400",
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
  },
);

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof checkbox>;

export const Checkbox: React.FC<CheckboxProps> = ({
  className,
  intent,
  size,
  ...props
}) => {
  return (
    <input
      type="checkbox"
      {...props}
      className={clsx(checkbox({ intent, size }), className)}
    />
  );
};

export default Checkbox;
