import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type AppButtonVariant = "primary" | "secondary" | "ghost";

type AppButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: AppButtonVariant;
  className?: string;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "disabled" | "onClick"
>;

const variantClasses: Record<AppButtonVariant, string> = {
  primary:
    "bg-[#3A8DFF] text-white shadow-[0_12px_30px_rgba(58,141,255,0.22)] hover:bg-[#236fd1]",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
};

export default function AppButton({
  children,
  href,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  onClick,
}: AppButtonProps) {
  const classes = [
    "inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[variant],
    className,
  ].join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
    >
      {children}
    </button>
  );
}