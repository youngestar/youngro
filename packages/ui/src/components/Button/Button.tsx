"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Icon } from "../Icon";

// Align Button variants with InteractiveArea buttons
// primary -> "发送" button style
// default -> "清空" button style
const button = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-300 dark:focus-visible:ring-primary-500/60",
  {
    variants: {
      intent: {
        primary:
          "bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60 disabled:pointer-events-none",
        default:
          "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 disabled:opacity-60 disabled:pointer-events-none",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 disabled:opacity-60 disabled:pointer-events-none",
        subtle:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-60 disabled:pointer-events-none",
      },
      // Do not attach spacing directly here to avoid conflicts with iconOnly
      size: {
        sm: "",
        md: "",
        lg: "",
      },
      iconOnly: {
        // Reset padding and line-height for icon-only to keep it square
        true: "p-0 leading-none",
        false: "",
      },
    },
    compoundVariants: [
      // Spacing when NOT icon-only (text buttons)
      { size: "sm", iconOnly: false, class: "px-3 py-2" },
      { size: "md", iconOnly: false, class: "px-4 py-2" },
      { size: "lg", iconOnly: false, class: "px-5 py-3" },

      // Explicit square sizes for icon-only buttons
      { size: "sm", iconOnly: true, class: "h-6 w-6" },
      { size: "md", iconOnly: true, class: "h-8 w-8" },
      { size: "lg", iconOnly: true, class: "h-10 w-10" },
    ],
    defaultVariants: {
      intent: "default",
      size: "md",
      iconOnly: false,
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<VariantProps<typeof button>, "iconOnly"> & {
    icon?: boolean;
    iconOnly?: boolean;
  };

export const Button: React.FC<ButtonProps> = ({
  className,
  intent,
  size,
  iconOnly,
  icon,
  children,
  ...props
}) => {
  return (
    <button
      {...props}
      className={clsx(button({ intent, size, iconOnly }), className)}
    >
      {icon && <Icon icon={Check} size="sm" className="mr-2" />}
      {children}
    </button>
  );
};

export type { ButtonProps };
