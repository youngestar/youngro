"use client";

import React from "react";
import clsx from "clsx";
import { cva, type VariantProps } from "class-variance-authority";

export type SelectItem = {
  value: string;
  label: React.ReactNode;
};

export type SelectGroup = {
  groupLabel: string;
  children: SelectItem[];
};

// options can be either a flat list of items or groups with children
export type SelectOption = SelectItem | SelectGroup;

const select = cva(
  "h-10 rounded-md px-3 py-2 text-sm font-medium outline-none",
  {
    variants: {
      tone: {
        tinted:
          "bg-primary-200/20 dark:bg-primary-400/20 text-primary-600 placeholder-primary-400 dark:text-primary-300/70 dark:placeholder-primary-300/50 focus-visible:ring-2 focus-visible:ring-primary-400/60",
        plain:
          "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-neutral-200 dark:border-neutral-700 focus-visible:ring-2 focus-visible:ring-primary-400/60",
      },
      vsize: {
        sm: "h-8 text-sm",
        md: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      tone: "tinted",
      vsize: "md",
    },
  }
);

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof select> {
  options?: SelectOption[];
  /** placeholder text to show when no value is selected (renders a disabled empty option) */
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  options = [],
  className,
  children,
  tone,
  vsize,
  placeholder,
  ...props
}) => {
  // detect controlled vs uncontrolled to avoid switching modes
  const isControlled = props.value !== undefined;

  // if uncontrolled and a placeholder is provided, ensure the placeholder shows by
  // setting defaultValue to empty string when no defaultValue was provided
  const selectProps: React.SelectHTMLAttributes<HTMLSelectElement> = {
    ...props,
  };
  if (!isControlled && placeholder && selectProps.defaultValue === undefined) {
    selectProps.defaultValue = "";
  }

  const isGroup = (o: SelectOption): o is SelectGroup => {
    return (o as SelectGroup).children !== undefined;
  };

  return (
    <select
      {...selectProps}
      className={clsx(select({ tone, vsize }), className)}
    >
      {placeholder ? (
        // an empty, disabled option to act as placeholder when nothing is selected
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}

      {options.length > 0
        ? options.map((o, idx) => {
            if (isGroup(o)) {
              return (
                <optgroup label={o.groupLabel} key={o.groupLabel + idx}>
                  {o.children.map((child) => (
                    <option key={child.value} value={child.value}>
                      {child.label}
                    </option>
                  ))}
                </optgroup>
              );
            }

            // flat option
            return (
              <option
                key={(o as SelectItem).value}
                value={(o as SelectItem).value}
              >
                {(o as SelectItem).label}
              </option>
            );
          })
        : children}
    </select>
  );
};

export default Select;
