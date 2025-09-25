import { FC } from "react";

type Props = {
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
  id?: string;
};
const Textarea: FC<Props> = ({
  value,
  onChange,
  disabled,
  placeholder = "",
  rows = 3,
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    disabled={disabled}
    placeholder={placeholder}
    rows={rows}
    className="
      w-full rounded-lg px-2 py-1 text-sm outline-none shadow-sm
      border-2 border-solid
      border-neutral-200 dark:border-neutral-800
      focus:border-primary-300 dark:focus:border-primary-400/50
      transition-all duration-200 ease-in-out
      bg-neutral-50 dark:bg-neutral-950
      focus:bg-neutral-50 dark:focus:bg-neutral-900
      disabled:cursor-not-allowed
      disabled:text-neutral-400 dark:disabled:text-neutral-600
      resize-y
    "
  />
);

export default Textarea;
