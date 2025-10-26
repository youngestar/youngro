"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

// Align default textarea style with InteractiveArea input
// w-full min-h-[100px] max-h-[300px] rounded-t-xl p-3 font-medium outline-none
// bg-primary-200/20 dark:bg-primary-400/20 text-primary-500
// placeholder-primary-400 dark:text-primary-300/50 dark:placeholder-primary-300/50
const textarea = cva(
  "w-full min-h-[100px] max-h-[300px] rounded-t-xl p-3 text-sm font-medium outline-none bg-primary-200/20 dark:bg-primary-400/20 text-primary-500 placeholder-primary-400 dark:text-primary-300/50 dark:placeholder-primary-300/50",
  {
    variants: {
      intent: {
        // default matches InteractiveArea visual by default
        default: "",
        destructive:
          "ring-1 ring-red-300 focus:ring-2 focus:ring-red-400 dark:ring-red-400/60",
      },
      size: {
        sm: "text-sm p-2",
        md: "text-sm p-3",
        lg: "text-base p-4",
      },
    },
    defaultVariants: {
      intent: "default",
      size: "md",
    },
  }
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textarea>;

export const Textarea: React.FC<TextareaProps> = ({
  className,
  intent,
  size,
  ...props
}) => {
  return (
    <textarea
      {...props}
      className={clsx(textarea({ intent, size }), className)}
    />
  );
};

export default Textarea;
