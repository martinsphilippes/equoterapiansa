"use client";
import { Button } from "./index";
import type { ButtonHTMLAttributes } from "react";

/** Botão de envio que pede confirmação antes de submeter o formulário. */
export function ConfirmButton({ message, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { message: string; variant?: "primary" | "secondary" | "danger" | "outline" | "ghost"; size?: "sm" | "md" | "lg" }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
