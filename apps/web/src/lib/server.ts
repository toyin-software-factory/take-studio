import { createPool } from "@take-studio/db";
import PgBoss from "pg-boss";

type Globals = { pool?: ReturnType<typeof createPool>; boss?: Promise<PgBoss> };
const g = globalThis as unknown as Globals;

export function getPool() {
  return (g.pool ??= createPool());
}

export function getBoss() {
  g.boss ??= (async () => {
    const boss = new PgBoss(process.env.DATABASE_URL ?? "");
    boss.on("error", (err) => console.error("pg-boss", err.message));
    await boss.start();
    return boss;
  })();
  return g.boss;
}
