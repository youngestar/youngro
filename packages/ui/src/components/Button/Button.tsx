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
      size: {
        sm: "px-3 py-2",
        md: "px-4 py-2",
        lg: "px-5 py-3",
      },
      iconOnly: {
        true: "p-2",
        false: "",
      },
    },
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
