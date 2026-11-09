import pg from "pg";
import {
  PROGRESS_CHANNEL,
  getProgress,
  type JobProgress,
} from "@take-studio/db";
import { getPool } from "@/lib/server";

export const dynamic = "force-dynamic";

// Streams a job's progress as Server Sent Events, driven by Postgres NOTIFY.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();
  const listener = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await listener.connect();

  let close = () => {};
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      // Comment lines keep proxies from closing the stream while a job waits in the queue.
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);
      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        listener.end().catch(() => {});
        try {
          controller.close();
        } catch {}
      };
      const send = (percent: number) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ percent })}\n\n`),
        );
        if (percent >= 100) close();
      };

      listener.on("error", close);
      listener.on("notification", (msg) => {
        if (!msg.payload) return;
        try {
          const p = JSON.parse(msg.payload) as JobProgress;
          if (p.jobId === id) send(p.percent);
        } catch {
          // ignore malformed payloads
        }
      });
      if (req.signal.aborted) return close();
      req.signal.addEventListener("abort", close);
      try {
        await listener.query(`listen ${PROGRESS_CHANNEL}`);
      } catch (err) {
        close();
        throw err;
      }

      // Catch up on anything reported before the LISTEN started.
      const current = await getProgress(getPool(), id).catch(() => null);
      if (current !== null) send(current);
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
