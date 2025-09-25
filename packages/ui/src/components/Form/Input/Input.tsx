import { FC, InputHTMLAttributes } from "react";

type Props = {
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
};

const Input: FC<Props> = ({ type = "text", value, onChange, disabled }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    disabled={disabled}
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
      whitespace-nowrap
    "
  />
);

export default Input;
