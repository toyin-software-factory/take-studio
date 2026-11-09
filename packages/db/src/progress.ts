import type pg from "pg";

// Wiring proof only: real pipeline progress tables arrive with the data model (0002).
export const PROGRESS_CHANNEL = "job_progress";

export type JobProgress = { jobId: string; percent: number };

export async function ensureProgressTable(pool: pg.Pool) {
  await pool.query(
    `create table if not exists wiring_progress (
       job_id text primary key,
       percent integer not null,
       updated_at timestamptz not null default now()
     )`,
  );
}

export async function reportProgress(pool: pg.Pool, jobId: string, percent: number) {
  await pool.query(
    `insert into wiring_progress (job_id, percent) values ($1, $2)
     on conflict (job_id) do update set percent = excluded.percent, updated_at = now()`,
    [jobId, percent],
  );
  await pool.query("select pg_notify($1, $2)", [
    PROGRESS_CHANNEL,
    JSON.stringify({ jobId, percent } satisfies JobProgress),
  ]);
}

export async function getProgress(pool: pg.Pool, jobId: string): Promise<number | null> {
  const { rows } = await pool.query<{ percent: number }>(
    "select percent from wiring_progress where job_id = $1",
    [jobId],
  );
  return rows[0]?.percent ?? null;
}
export const NOOP_QUEUE = "noop";
