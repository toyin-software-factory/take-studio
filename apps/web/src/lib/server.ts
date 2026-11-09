import { createPool } from "@take-studio/db";
import PgBoss from "pg-boss";

type Globals = { pool?: ReturnType<typeof createPool>; boss?: Promise<PgBoss> };
const g = globalThis as unknown as Globals;

export function getPool() {
  return (g.pool ??= createPool());
}

export function getBoss() {
  g.boss ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const boss = new PgBoss(url);
    boss.on("error", (err) => console.error("pg-boss", err.message));
    await boss.start();
    return boss;
  })().catch((err) => {
    g.boss = undefined;
    throw err;
  });
  return g.boss;
}
