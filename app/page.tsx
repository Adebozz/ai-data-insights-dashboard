"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type ApiResult = {
  fileName: string;
  shape: { rows: number; cols: number };
  dtypes: Record<string, string>;
  missing: { total: number; byColumn: Record<string, number> };
  numericColumns: string[];
  summaryStats: Record<
    string,
    { count: number; mean: number; std: number; min: number; p25: number; median: number; p75: number; max: number }
  >;
  correlation: null | { columns: string[]; matrix: number[][] };
  preview: { columns: string[]; rows: Record<string, any>[] };
  error?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const missingChart = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.missing.byColumn)
      .map(([name, missing]) => ({ name, missing }))
      .sort((a, b) => b.missing - a.missing)
      .slice(0, 12);
  }, [data]);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE;

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setErr(null);
    setData(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${apiBase}/analyze/csv`, {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as ApiResult;

      if (!res.ok || json.error) {
        setErr(json.error || "Something went wrong");
      } else {
        setData(json);
      }
    } catch (e: any) {
      setErr(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-bold">AI-Powered Personal Dashboard</h1>
        <p className="mt-2 text-zinc-300">
          Upload a CSV → get instant insights → visualize it.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-zinc-200 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-zinc-100 hover:file:bg-zinc-700"
            />
            <button
              onClick={analyze}
              disabled={!file || loading}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze CSV"}
            </button>
          </div>

          {err && (
            <div className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
              {err}
            </div>
          )}
        </div>

        {data && (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Card title="Dataset">
              <div className="text-sm text-zinc-200">
                <div><span className="text-zinc-400">File:</span> {data.fileName}</div>
                <div><span className="text-zinc-400">Rows:</span> {data.shape.rows}</div>
                <div><span className="text-zinc-400">Cols:</span> {data.shape.cols}</div>
                <div><span className="text-zinc-400">Missing:</span> {data.missing.total}</div>
                <div><span className="text-zinc-400">Numeric cols:</span> {data.numericColumns.length}</div>
              </div>
            </Card>

            <Card title="Missing Values (Top 12)">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingChart}>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="missing" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Tip: columns with lots of missing values usually need cleaning or dropping.
              </p>
            </Card>

            <Card title="Quick Stats (first numeric column)">
              {data.numericColumns[0] ? (
                <StatsTable
                  col={data.numericColumns[0]}
                  stats={data.summaryStats[data.numericColumns[0]]}
                />
              ) : (
                <p className="text-sm text-zinc-300">No numeric columns found.</p>
              )}
            </Card>

            <div className="md:col-span-3">
              <Card title="Data Preview (first 10 rows)">
                <div className="overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-zinc-950/40">
                      <tr>
                        {data.preview.columns.map((c) => (
                          <th key={c} className="whitespace-nowrap border-b border-zinc-800 px-3 py-2 text-zinc-300">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.preview.rows.map((r, i) => (
                        <tr key={i} className="border-b border-zinc-900">
                          {data.preview.columns.map((c) => (
                            <td key={c} className="whitespace-nowrap px-3 py-2 text-zinc-100">
                              {String(r[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatsTable({
  col,
  stats,
}: {
  col: string;
  stats: { count: number; mean: number; std: number; min: number; p25: number; median: number; p75: number; max: number };
}) {
  const rows: [string, number][] = [
    ["count", stats.count],
    ["mean", stats.mean],
    ["std", stats.std],
    ["min", stats.min],
    ["p25", stats.p25],
    ["median", stats.median],
    ["p75", stats.p75],
    ["max", stats.max],
  ];

  return (
    <div>
      <p className="text-sm text-zinc-300">
        Column: <span className="font-semibold text-zinc-100">{col}</span>
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-zinc-800 last:border-b-0">
                <td className="px-3 py-2 text-zinc-400">{k}</td>
                <td className="px-3 py-2 text-zinc-100">{Number.isFinite(v) ? v.toFixed(4) : String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
