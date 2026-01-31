"use client";

import { useMemo } from "react";
import { exportToCSV } from "./export-utils";

export type RecommendationFeedbackRow = {
  id: string;
  userEmail: string | null;
  userName: string | null;
  historyTitle: string | null;
  recommendationNum: number;
  feedback: string;
  templateId: string | null;
  templateTitle: string | null;
  createdAt: string | Date;
};

export type TemplateStat = {
  title: string;
  up: number;
  down: number;
  total: number;
  ratio: number;
};

export type FeedbackSummary = {
  totalUp: number;
  totalDown: number;
  total: number;
  ratio: number;
};

export default function RecommendationFeedbackAdmin({
  feedbacks,
  summary,
  templateStats
}: {
  feedbacks: RecommendationFeedbackRow[];
  summary: FeedbackSummary;
  templateStats: TemplateStat[];
}) {
  const rows = useMemo(
    () =>
      feedbacks.map((f) => ({
        ...f,
        createdAtDisplay: formatDate(f.createdAt)
      })),
    [feedbacks]
  );

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{summary.total}</div>
          <div className="text-xs text-slate-600">Total Feedbacks</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-700">{summary.totalUp}</div>
          <div className="text-xs text-green-600">👍 Helpful</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-red-700">{summary.totalDown}</div>
          <div className="text-xs text-red-600">👎 Not Helpful</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-700">{(summary.ratio * 100).toFixed(1)}%</div>
          <div className="text-xs text-blue-600">Helpful Rate</div>
        </div>
      </div>

      {/* Template Performance */}
      {templateStats.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-slate-900">Template Performance (Lowest First)</h3>
          <div className="max-h-48 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2 text-center">👍</th>
                  <th className="px-3 py-2 text-center">👎</th>
                  <th className="px-3 py-2 text-center">Total</th>
                  <th className="px-3 py-2">Helpful Rate</th>
                </tr>
              </thead>
              <tbody>
                {templateStats.map((t) => (
                  <tr key={t.title} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-900">{t.title}</td>
                    <td className="px-3 py-2 text-center text-green-600">{t.up}</td>
                    <td className="px-3 py-2 text-center text-red-600">{t.down}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{t.total}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full ${t.ratio >= 0.7 ? 'bg-green-500' : t.ratio >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${t.ratio * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">{(t.ratio * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Feedbacks */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Recent Recommendation Feedbacks</h3>
          <button
            type="button"
            onClick={() => exportToCSV(
              feedbacks,
              [
                { key: "userEmail", label: "User Email" },
                { key: "userName", label: "User Name" },
                { key: "templateTitle", label: "Template" },
                { key: "recommendationNum", label: "Rec #" },
                { key: "feedback", label: "Feedback" },
                { key: "createdAt", label: "Created At", format: (v) => formatDate(v as string | Date) }
              ],
              "recommendation-feedback"
            )}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Export CSV
          </button>
        </div>
        <div className="max-h-64 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-600 sticky top-0">
              <tr>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2 text-center">Rec #</th>
                <th className="px-3 py-2 text-center">Feedback</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="text-xs text-slate-700">{f.userEmail || "—"}</div>
                    {f.userName && <div className="text-[10px] text-slate-500">{f.userName}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">{f.templateTitle || "—"}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{f.recommendationNum}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                        f.feedback === "UP"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {f.feedback === "UP" ? "👍" : "👎"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">{f.createdAtDisplay}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No recommendation feedback yet. Users can rate recommendations with 👍/👎 on the canvas page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: string | Date) {
  try {
    const asDate = d instanceof Date ? d : new Date(d);
    return asDate.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return d as string;
  }
}
