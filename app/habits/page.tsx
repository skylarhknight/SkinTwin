"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getAccessToken } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { DailyHabit } from "@/lib/types";

export default function HabitsPage() {
  const [habit, setHabit] = useState<DailyHabit>({ logDate: new Date().toISOString().slice(0,10), waterIntakeMl: 1600, sleepHours: 7, usedSpf: true, stressLevel: 3, exerciseMinutes: 0, notes: "" });
  useEffect(() => {
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error("missing token");
        return fetch("/api/habits", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => r.json())
      .then((data) => {
        const habits = (data as { habits?: DailyHabit[] }).habits ?? [];
        localStorage.setItem(LS_KEYS.habits, JSON.stringify(habits));
        const today = new Date().toISOString().slice(0, 10);
        const current = habits.find((h) => h.logDate === today) ?? habits.at(-1);
        if (current) setHabit(current);
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    const arr = JSON.parse(localStorage.getItem(LS_KEYS.habits) || "[]").filter((h: DailyHabit) => h.logDate !== habit.logDate);
    localStorage.setItem(LS_KEYS.habits, JSON.stringify([...arr, habit]));
    const token = await getAccessToken();
    if (!token) return alert("Please sign in again.");
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(habit),
    });
    alert("Habit log saved");
  };
  return <div className="mx-auto max-w-2xl space-y-8"><PageHeader eyebrow="Daily log" title={<>Today&rsquo;s <span className="italic">habits</span></>} intro="Sleep, water, SPF, stress — the quiet inputs SkinTwin ties to what your skin shows." accent="sage" /><section data-reveal className="card grid gap-4"><Field label="Water intake ml" type="number" value={habit.waterIntakeMl} onChange={(v) => setHabit({ ...habit, waterIntakeMl: Number(v) })}/><Field label="Sleep hours" type="number" value={habit.sleepHours} onChange={(v) => setHabit({ ...habit, sleepHours: Number(v) })}/><label className="flex items-center gap-3"><input type="checkbox" checked={habit.usedSpf} onChange={(e) => setHabit({ ...habit, usedSpf: e.target.checked })}/> Used SPF today</label><Field label="Stress 1-5" type="number" value={habit.stressLevel} onChange={(v) => setHabit({ ...habit, stressLevel: Number(v) as DailyHabit["stressLevel"] })}/><Field label="Exercise minutes" type="number" value={habit.exerciseMinutes ?? 0} onChange={(v) => setHabit({ ...habit, exerciseMinutes: Number(v) })}/><textarea className="input" placeholder="Notes" value={habit.notes} onChange={(e) => setHabit({ ...habit, notes: e.target.value })}/><button className="btn-primary" onClick={save}>Save Today’s Log</button></section></div>;
}
function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; type?: string; onChange: (v: string) => void }) { return <label className="grid gap-2"><span className="label">{label}</span><input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
