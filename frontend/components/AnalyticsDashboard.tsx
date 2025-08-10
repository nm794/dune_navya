"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useWebSocket } from "../hooks/useWebSocket";

type FieldStats = {
  fieldId: string;
  fieldLabel: string;
  fieldType: string;
  responseCount: number;
  averageRating?: number;
  ratingDistribution?: Record<string, number>;
  optionCounts?: Record<string, number>;
  textResponses?: string[];
  numberSummary?: { average: number; min: number; max: number };
};

type RatingPoint = { date: string; average: number };
type MostSkippedItem = { fieldId: string; fieldLabel: string; count: number };
type TopOption = { option: string; count: number };

type Analytics = {
  formId: string;
  totalResponses: number;
  recentResponses: number;
  fieldAnalytics: Record<string, FieldStats>;
  lastUpdated: string;
  ratingOverTime?: RatingPoint[];
  mostSkipped?: MostSkippedItem[];
  topOptions?: Record<string, TopOption>;
};

export default function AnalyticsDashboard({ formId }: { formId: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("all");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use env-provided WS URL in prod, else rely on Next rewrites with a relative path
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "/ws";
  const { lastMessage } = useWebSocket(wsUrl);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/${formId}`);
      if (!response.ok) throw new Error("Failed to load analytics");
      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch {
      setError("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    intervalRef.current = setInterval(loadAnalytics, 20000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  useEffect(() => {
    if (!lastMessage) return;

    // Be robust to string or object messages
    let msg: any = lastMessage as any;
    if (typeof lastMessage === "string") {
      try {
        msg = JSON.parse(lastMessage as unknown as string);
      } catch {
        // ignore parse errors for non-JSON messages
      }
    }

    if (msg?.type === "new_response") {
      const data = msg.data;
      if (data?.formId === formId) {
        loadAnalytics();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, formId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <p className="text-gray-600 dark:text-gray-300">Loading analytics...</p>
      </div>
    );
  }
  if (error || !analytics) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <p className="text-red-600">{error ?? "No analytics data available"}</p>
      </div>
    );
  }

  const fieldList = Object.values(analytics.fieldAnalytics || {});

  const getFieldChartData = (fs: FieldStats) => {
    if (fs.fieldType === "multiple_choice" || fs.fieldType === "checkbox") {
      return Object.entries(fs.optionCounts || {}).map(([option, count]) => ({
        option,
        count,
      }));
    }
    if (fs.fieldType === "rating" && fs.ratingDistribution) {
      return Object.entries(fs.ratingDistribution).map(([rating, count]) => ({
        rating,
        count,
      }));
    }
    return [];
  };

  const section = "bg-white dark:bg-gray-800 border rounded-xl p-4 shadow-sm";
  const card = "bg-white dark:bg-gray-800 border rounded-xl p-4 shadow-sm";

  return (
    <div className="min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time insights from your form responses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            className="px-3 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            href={`/api/responses/${analytics.formId}/csv`}
            target="_blank"
            rel="noreferrer"
          >
            ⬇️ Export CSV
          </a>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={card}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Total Responses</p>
          <p className="text-3xl font-semibold">{analytics.totalResponses}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Recent (24h)</p>
          <p className="text-3xl font-semibold">{analytics.recentResponses}</p>
        </div>
        <div className={card}>
          <p className="text-sm text-gray-600 dark:text-gray-300">Last Updated</p>
          <p className="text-lg">{new Date(analytics.lastUpdated).toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Rating trend */}
      {analytics.ratingOverTime && analytics.ratingOverTime.length > 0 && (
        <div className={section}>
          <h3 className="font-semibold mb-3">Rating Trend</h3>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={analytics.ratingOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Field breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fieldList.map((fs) => {
          if (["multiple_choice", "checkbox"].includes(fs.fieldType)) {
            const data = getFieldChartData(fs);
            return (
              <div key={fs.fieldId} className={section}>
                <h3 className="font-semibold mb-2">{fs.fieldLabel}</h3>
                <div className="w-full h-64">
                  <ResponsiveContainer>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="option" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          }

          if (fs.fieldType === "rating" && fs.averageRating !== undefined) {
            const data = getFieldChartData(fs);
            return (
              <div key={fs.fieldId} className={section}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{fs.fieldLabel}</h3>
                  <div className="text-sm">
                    Avg: <strong>{fs.averageRating?.toFixed(2)}</strong>
                  </div>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          }

          if (["text", "textarea", "email"].includes(fs.fieldType)) {
            return (
              <div key={fs.fieldId} className={section}>
                <h3 className="font-semibold mb-2">{fs.fieldLabel}</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {fs.textResponses?.slice().reverse().slice(0, 10).map((t, i) => (
                    <div key={i} className="p-2 border rounded-lg bg-white dark:bg-gray-800">
                      {t}
                    </div>
                  ))}
                  {(!fs.textResponses || fs.textResponses.length === 0) && (
                    <p className="text-gray-500">No text responses yet</p>
                  )}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Trends: Most skipped & Top options */}
      {(analytics.mostSkipped?.length || 0) > 0 ||
      (analytics.topOptions && Object.keys(analytics.topOptions).length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.mostSkipped && analytics.mostSkipped.length > 0 && (
            <div className={section}>
              <h3 className="font-semibold mb-2">Most Skipped Questions</h3>
              <ul className="space-y-2">
                {analytics.mostSkipped.map((m) => (
                  <li
                    key={m.fieldId}
                    className="p-2 border rounded-lg bg-white dark:bg-gray-800 flex items-center justify-between"
                  >
                    <span>{m.fieldLabel}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Skipped {m.count}x
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analytics.topOptions && Object.keys(analytics.topOptions).length > 0 && (
            <div className={section}>
              <h3 className="font-semibold mb-2">Top Options (Choice Fields)</h3>
              <ul className="space-y-2">
                {fieldList
                  .filter((f) => f.optionCounts && Object.keys(f.optionCounts).length > 0)
                  .map((f) => {
                    const top = analytics.topOptions![f.fieldId];
                    return (
                      <li
                        key={f.fieldId}
                        className="p-2 border rounded-lg bg-white dark:bg-gray-800 flex items-center justify-between"
                      >
                        <span>{f.fieldLabel}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {top?.option ?? "-"} ({top?.count ?? 0})
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
