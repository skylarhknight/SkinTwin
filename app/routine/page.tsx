"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getAccessToken, authHeaders } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { RoutineResponse } from "@/lib/types";

type Status = "loading" | "ready" | "error";

export default function RoutinePage() {
  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    /** Cached copy from a previous visit, so a failed regeneration still shows the last routine. */
    function readCache(): RoutineResponse | null {
      try {
        const raw = localStorage.getItem(LS_KEYS.routines);
        const parsed = raw ? (JSON.parse(raw) as RoutineResponse) : null;
        return parsed?.routines?.length ? parsed : null;
      } catch {
        return null;
      }
    }

    async function load() {
      const token = await getAccessToken();
      const res = await fetch("/api/routines/generate", { method: "POST", headers: authHeaders(token) });
      const body = (await res.json()) as RoutineResponse & { error?: string };
      // A non-2xx body is an error payload, not an empty routine — surfacing it as "no routine yet"
      // hid auth and server failures behind an empty state.
      if (!res.ok || body?.error) throw new Error(body?.error ?? `Request failed (${res.status})`);
      if (!body?.routines?.length) throw new Error("Empty routine payload");
      return body;
    }

    load()
      .then((next) => {
        if (cancelled) return;
        setRoutine(next);
        setStatus("ready");
        localStorage.setItem(LS_KEYS.routines, JSON.stringify(next));
      })
      .catch(() => {
        if (cancelled) return;
        const cached = readCache();
        if (cached) {
          setRoutine(cached);
          setStatus("ready");
          return;
        }
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Personalized plan"
          title={<>Your AM / PM <span className="italic">routine</span></>}
          intro="Generating a routine from your scan, products, and habits…"
          accent="sage"
        />
        <div className="grid gap-6 md:grid-cols-2">
          {["AM", "PM"].map((slot) => (
            <section className="card animate-pulse space-y-4" key={slot}>
              <div className="h-5 w-24 rounded-full bg-sf-blue-soft" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2 rounded-2xl bg-sf-blue-soft/60 p-4">
                  <div className="h-3 w-3/4 rounded bg-sf-blue-lighter/70" />
                  <div className="h-3 w-1/2 rounded bg-sf-blue-lighter/50" />
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Could not load your routine"
        body="Try again in a moment, or take a new scan to refresh recommendations."
        cta="Take Scan"
        href="/scan"
      />
    );
  }

  if (!routine) {
    return (
      <EmptyState
        title="No routine yet"
        body="Take a baseline scan and add at least one product to generate a personalized AM/PM routine."
        cta="Start Scan"
        href="/scan"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Personalized plan"
        title={<>Your AM / PM <span className="italic">routine</span></>}
        intro="Sequenced from your scan, products, and logged habits — each step with the why."
        accent="sage"
      />
      <div data-reveal className="grid gap-6 md:grid-cols-2">
        {routine.routines.map((r) => (
          <section className="card" key={r.routineType}>
            <h2 className="text-xl font-semibold">{r.routineType} Routine</h2>
            <ol className="mt-4 space-y-3">
              {r.steps.map((s) => (
                <li className="rounded-2xl bg-sf-blue-soft p-4" key={`${r.routineType}-${s.stepOrder}`}>
                  <p className="font-medium">
                    {s.stepOrder}. {s.instruction}
                  </p>
                  <p className="mt-1 text-sm text-sf-muted">{s.rationale}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {routine.avoidForNow?.length ? (
        <section className="card">
          <h2 className="font-semibold">Avoid for now</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {routine.avoidForNow.map((x) => (
              <span className="badge" key={x}>
                {x}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <Disclaimer />
      <div className="flex gap-3">
        <Link className="btn-primary" href="/trends">
          View Trends
        </Link>
        <Link className="btn-secondary" href="/habits">
          Log Habits
        </Link>
      </div>
    </div>
  );
}
