import { NextResponse } from "next/server";
import { readReadCounter } from "@/lib/firebase/measure";

/** Só existe com MEASURE_READS=1 (auditoria local). */
export async function GET(req: Request) {
  if (process.env.MEASURE_READS !== "1") return NextResponse.json({ error: "disabled" }, { status: 404 });
  const reset = new URL(req.url).searchParams.get("reset") === "1";
  return NextResponse.json(readReadCounter(reset));
}
