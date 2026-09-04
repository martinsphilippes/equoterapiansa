"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./index";
import type { ButtonHTMLAttributes } from "react";

export function SubmitButton({ children, pendingText = "Salvando…", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; variant?: "primary" | "secondary" | "danger" | "outline" | "ghost"; size?: "sm" | "md" | "lg" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...rest}>
      {pending ? pendingText : children}
    </Button>
  );
}
