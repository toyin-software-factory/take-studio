import PgBoss from "pg-boss";
import { NOOP_QUEUE, createPool, ensureProgressTable, reportProgress } from "@take-studio/db";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = createPool(url);
  await ensureProgressTable(pool);

  const boss = new PgBoss(url);
  boss.on("error", (err) => console.error("pg-boss", err.message));
  await boss.start();
  await boss.createQueue(NOOP_QUEUE);

  // One job at a time, per the spec.
  await boss.work(NOOP_QUEUE, { batchSize: 1 }, async ([job]) => {
    if (!job) return;
    for (let percent = 0; percent <= 100; percent += 10) {
      await reportProgress(pool, job.id, percent);
      await sleep(300);
    }
  });
  console.log("worker ready");

  const stop = async () => {
    await boss.stop({ graceful: true, timeout: 30_000 });
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
