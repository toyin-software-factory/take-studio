import { NextResponse } from "next/server";
import { NOOP_QUEUE, ensureProgressTable } from "@take-studio/db";
import { getBoss, getPool } from "@/lib/server";

export const dynamic = "force-dynamic";

// Wiring proof: enqueue a no-op job that the worker reports 0 to 100 percent on.
export async function POST() {
  const boss = await getBoss();
  await ensureProgressTable(getPool());
  await boss.createQueue(NOOP_QUEUE);
  const id = await boss.send(NOOP_QUEUE, {});
  if (!id) return NextResponse.json({ error: "enqueue failed" }, { status: 500 });
  return NextResponse.json({ id }, { status: 202 });
}
