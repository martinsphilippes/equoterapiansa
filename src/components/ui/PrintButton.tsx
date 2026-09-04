"use client";
import { Button } from "./index";
export function PrintButton() {
  return <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimir / salvar PDF</Button>;
}
