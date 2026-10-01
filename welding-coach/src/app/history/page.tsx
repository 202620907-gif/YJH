"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { AnalysisRecord, Defect } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  심각: "bg-red-100 text-red-700 border-red-300",
  보통: "bg-amber-100 text-amber-700 border-amber-300",
  경미: "bg-sky-100 text-sky-700 border-sky-300",
};

function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-lime-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [records, setRecords] = useState<AnalysisRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error: e }) => {
        if (e) {
          console.error(e);
          setError(
            "기록을 불러오지 못했습니다. supabase/schema.sql을 실행했는지 확인하세요."
          );
        } else {
          setRecords(data ?? []);
        }
      });
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm opacity-60 hover:opacity-100">
          ← 분석하러 가기
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          📁 내 분석 기록
        </h1>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          ⚠️ {error}
        </p>
      )}

      {!supabase && (
        <p className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 text-sm opacity-70">
          기록 저장 기능은 아직 연결되지 않았어요. 메인 화면에서 데모 안내를
          사용할 수 있습니다.
        </p>
      )}

      {supabase && !error && records === null && (
        <p className="opacity-60">불러오는 중...</p>
      )}

      {supabase && records !== null && records.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center opacity-60">
          아직 저장된 분석 기록이 없어요. 메인 페이지에서 작품을 분석해 보세요!
        </p>
      )}

      <ul className="space-y-6">
        {records?.map((r) => (
          <li
            key={r.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
          >
            <div className="flex flex-col gap-4 p-5 sm:flex-row">
              {r.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image_url}
                  alt="용접 작품 사진"
                  className="h-40 w-full rounded-lg object-cover sm:w-56"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-3xl sm:w-56">
                  🔥
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs opacity-60">{formatDate(r.created_at)}</p>
                  <p>
                    <span
                      className={`text-3xl font-extrabold ${scoreColor(r.total_score ?? 0)}`}
                    >
                      {r.total_score ?? "-"}
                    </span>
                    <span className="text-xs opacity-60"> / 100</span>
                  </p>
                </div>
                <p className="mt-1 text-xs opacity-60">
                  {r.weld_process} · {r.material} · 결함{" "}
                  {r.defects?.length ?? 0}개
                </p>
                <p className="mt-2 text-sm leading-relaxed">{r.summary}</p>
              </div>
            </div>

            {r.defects && r.defects.length > 0 && (
              <div className="border-t border-zinc-200 dark:border-zinc-800 p-5 pt-4">
                <ul className="flex flex-wrap gap-2">
                  {r.defects.map((d: Defect, i: number) => (
                    <li
                      key={i}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[d.severity] ?? "border-zinc-300"}`}
                    >
                      {d.name} ({d.severity})
                    </li>
                  ))}
                </ul>
                {r.next_practice && (
                  <p className="mt-3 text-sm leading-relaxed">
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      🎯 다음엔:{" "}
                    </span>
                    {r.next_practice}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
