"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { Check } from "lucide-react";

const button = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      intent: {
        default: "bg-slate-900 text-white hover:bg-slate-700",
        destructive: "bg-red-600 text-white hover:bg-red-500",
        subtle: "bg-slate-100 text-slate-900 hover:bg-slate-200",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      intent: "default",
      size: "md",
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    icon?: boolean;
  };

export const Button: React.FC<ButtonProps> = ({
  className,
  intent,
  size,
  icon,
  children,
  ...props
}) => {
  return (
    <button {...props} className={clsx(button({ intent, size }), className)}>
      {icon && <Check className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
};
