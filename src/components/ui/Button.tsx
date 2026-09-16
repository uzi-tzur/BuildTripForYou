import Link from "next/link";
import type { ReactNode } from "react";

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ href, children, variant = "primary" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-semibold transition-colors";
  const styles =
    variant === "primary"
      ? `${base} bg-brand-blue-500 text-white hover:bg-brand-blue-600`
      : `${base} border border-brand-green-500 text-brand-green-700 hover:bg-brand-green-50`;

  return (
    <Link href={href} className={styles}>
      {children}
    </Link>
  );
}
