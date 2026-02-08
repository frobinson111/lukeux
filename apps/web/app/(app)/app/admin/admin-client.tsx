"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import TemplatesAdmin from "./templates-client";
import KeysAdmin from "./keys-client";
import PaymentsAdmin from "./payments-client";
import type {
  UserRow,
  TemplateRow,
  UsageRow,
  EventRow,
  KeyRow,
  CategoryRow,
  PaymentConfigRow,
  SupportRow,
  FeedbackRow,
  UsageTotals,
  UserUsageCounts,
  LlmModelStats,
  LlmModelRow
} from "./page";
import SupportAdmin from "./support-client";
import FeedbackAdmin from "./feedback-client";
import RecommendationFeedbackAdmin, { type RecommendationFeedbackRow, type TemplateStat, type FeedbackSummary } from "./recommendation-feedback-client";
import { PromoSignupsClient } from "./promo-signups-client";
import EmailSmtpAdmin from "./email-smtp-client";
import { exportToCSV } from "./export-utils";
import type { SmtpConfigRow } from "./page";

const TABS = ["overview", "users", "limits", "templates", "keys", "payments", "feedback", "rec-feedback", "promo", "usage", "events", "email"] as const;
type Tab = (typeof TABS)[number];

export default function AdminClient({
  userRole,
  users,
  templates,
  usage,
  events,
  keys,
  llmModels,
  categories,
  payments,
  support,
  feedback,
  usageTotals,
  userUsageCounts,
  llmModelStats,
  smtpConfig,
  emailSettings,
  promoEnabled
}: {
  userRole: string;
  users: UserRow[];
  templates: TemplateRow[];
  usage: UsageRow[];
  events: EventRow[];
  keys: KeyRow[];
  llmModels: LlmModelRow[];
  categories: CategoryRow[];
  payments: PaymentConfigRow;
  support: SupportRow[];
  feedback: FeedbackRow[];
  usageTotals: UsageTotals;
  userUsageCounts: UserUsageCounts;
  llmModelStats: LlmModelStats[];
  smtpConfig: SmtpConfigRow | null;
  emailSettings: { otpEnabled: boolean; smtpConfigured: boolean; smtpVerified: boolean };
  promoEnabled: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [usersState, setUsersState] = useState(users);
  const [status, setStatus] = useState<string | null>(null);
  
  // User filtering and search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"email" | "createdAt" | "lastLoginAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Usage pagination
  const [usagePage, setUsagePage] = useState(1);
  const usagePageSize = 10;

  // Recommendation feedback state (loaded on demand)
  const [recFeedbacks, setRecFeedbacks] = useState<RecommendationFeedbackRow[]>([]);
  const [recSummary, setRecSummary] = useState<FeedbackSummary>({ totalUp: 0, totalDown: 0, total: 0, ratio: 0 });
  const [recTemplateStats, setRecTemplateStats] = useState<TemplateStat[]>([]);
  const [recFeedbackLoaded, setRecFeedbackLoaded] = useState(false);

  // Load recommendation feedback when tab is selected
  useEffect(() => {
    if (tab === "rec-feedback" && !recFeedbackLoaded) {
      fetch("/api/admin/recommendation-feedback")
        .then((res) => res.json())
        .then((data) => {
          if (data.feedbacks) {
            setRecFeedbacks(data.feedbacks);
            setRecSummary(data.summary);
            setRecTemplateStats(data.templateStats);
            setRecFeedbackLoaded(true);
          }
        })
        .catch(console.error);
    }
  }, [tab, recFeedbackLoaded]);

  // Helper function to format relative time
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return "Never logged in";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toISOString().slice(0, 10);
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...usersState];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => u.email.toLowerCase().includes(query));
    }
    
    // Apply role filter
    if (roleFilter !== "ALL") {
      result = result.filter(u => u.role === roleFilter);
    }
    
    // Apply plan filter
    if (planFilter !== "ALL") {
      result = result.filter(u => u.plan === planFilter);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "email") {
        comparison = a.email.localeCompare(b.email);
      } else if (sortBy === "createdAt") {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortBy === "lastLoginAt") {
        const aTime = a.lastLoginAt?.getTime() ?? 0;
        const bTime = b.lastLoginAt?.getTime() ?? 0;
        comparison = aTime - bTime;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [usersState, searchQuery, roleFilter, planFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, page, pageSize]);

  // Usage pagination
  const usageTotalPages = Math.max(1, Math.ceil(usage.length / usagePageSize));
  const pagedUsage = useMemo(() => {
    const start = (usagePage - 1) * usagePageSize;
    return usage.slice(start, start + usagePageSize);
  }, [usage, usagePage, usagePageSize]);

  const stats = useMemo(
    () => {
      // Calculate provider-specific stats from llmModelStats
      const anthropicStats = llmModelStats.filter(s => s.provider === "anthropic");
      const openaiStats = llmModelStats.filter(s => s.provider === "openai");

      const claudeEstCost = anthropicStats.reduce((sum, s) => sum + s.estimatedCost, 0);
      const claudeRequests = anthropicStats.reduce((sum, s) => sum + s.requestCount, 0);
      const chatgptEstCost = openaiStats.reduce((sum, s) => sum + s.estimatedCost, 0);
      const chatgptRequests = openaiStats.reduce((sum, s) => sum + s.requestCount, 0);

      return {
        usersTotal: usersState.length,
        admins: usersState.filter((u) => u.role === "ADMIN" || u.role === "SUPERUSER").length,
        pros: usersState.filter((u) => u.plan === "PRO").length,
        templatesTotal: templates.length,
        templatesActive: templates.filter((t) => t.isActive).length,
        apiKeysTotal: keys.length,
        apiKeysActive: keys.filter((k) => k.isActive).length,
        recentUsageCount: usage.length,
        initialResponses: usageTotals.initialCount,
        followupResponses: usageTotals.followupCount,
        imagesGenerated: usageTotals.imageCount,
        claudeEstCost,
        claudeRequests,
        chatgptEstCost,
        chatgptRequests
      };
    },
    [usersState, templates, keys, usage, usageTotals, llmModelStats]
  );

  const menu: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users & Usage" },
    { id: "limits", label: "Plan Limits" },
    { id: "templates", label: "UX Objectives" },
    { id: "keys", label: "LLM Models" },
    { id: "payments", label: "Payment Gateways" },
    { id: "feedback", label: "Feedback & Enquirer" },
    { id: "rec-feedback", label: "Rec Feedback" },
    { id: "promo", label: "Promo Signups" },
    { id: "usage", label: "Recent Usage" },
    { id: "email", label: "Email & SMTP" }
  ];

  async function togglePlan(userId: string, currentPlan: string) {
    setStatus(null);
    const nextPlan = currentPlan === "PRO" ? "FREE" : "PRO";
    try {
      const res = await fetch("/api/admin/users/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: nextPlan })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(json?.error || "Failed to update plan.");
        return;
      }
      setUsersState((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: json.user.plan, planStatus: json.user.planStatus } : u))
      );
      setStatus(`Plan updated to ${nextPlan}.`);
    } catch {
      setStatus("Failed to update plan.");
    }
  }

  async function deleteUser(userId: string, email: string) {
    setStatus(null);
    const confirmed = typeof window === "undefined" ? false : window.confirm(`Delete user ${email}? This will suspend access.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setStatus(json?.error || "Failed to delete user.");
        return;
      }
      setUsersState((prev) => {
        const next = prev.filter((u) => u.id !== userId);
        const nextTotalPages = Math.max(1, Math.ceil(next.length / pageSize));
        setPage((p) => Math.min(p, nextTotalPages));
        return next;
      });
      setStatus(`User ${email} deleted.`);
    } catch {
      setStatus("Failed to delete user.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start gap-6">
        <aside className="w-48 shrink-0 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sticky top-4 h-fit">
          <div className="text-xs font-semibold uppercase text-slate-500 px-1">Admin</div>
          <nav className="space-y-1 text-sm font-semibold text-slate-800">
            {menu.map((item) => (
              <button
                key={item.id}
                className={`block w-full text-left rounded-md px-2 py-2 hover:bg-slate-100 ${
                  tab === item.id ? "bg-slate-100 text-slate-900" : ""
                }`}
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 space-y-8">
          {status && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status}</div>}

          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Manage users, UX objectives, keys, usage, and events.</p>
            </div>
            <div className="rounded-full bg-black px-3 py-1 text-xs font-bold uppercase text-white shadow-[0_2px_0_#111]">
              {userRole}
            </div>
          </header>

          {tab === "overview" && (
            <section className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard label="Users" value={stats.usersTotal} helper={`${stats.admins} admins`} />
                <StatCard label="Pro Users" value={stats.pros} helper="Plan: PRO" />
                <StatCard label="UX Objectives" value={stats.templatesTotal} helper={`${stats.templatesActive} active`} />
                <StatCard label="LLM Keys" value={stats.apiKeysTotal} helper={`${stats.apiKeysActive} active`} />
                <StatCard label="Initial Responses" value={stats.initialResponses} helper="Total generated" />
                <StatCard label="Follow-up Responses" value={stats.followupResponses} helper="Total refinements" />
                <StatCard label="Visualizations" value={stats.imagesGenerated} helper="Total generated" />
                <StatCard label="Recent Usage" value={stats.recentUsageCount} helper="last 200" />
                <CostCard label="Claude Est. Cost" value={stats.claudeEstCost} helper="All Anthropic models" />
                <StatCard label="Claude Requests" value={stats.claudeRequests} helper="All Anthropic models" />
                <CostCard label="ChatGPT Est. Cost" value={stats.chatgptEstCost} helper="All OpenAI models" />
                <StatCard label="ChatGPT Requests" value={stats.chatgptRequests} helper="All OpenAI models" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image src="/images/settings.svg" alt="Users" width={18} height={18} className="h-5 w-5" />
                    <h2 className="text-lg font-semibold text-slate-900">Users</h2>
                  </div>
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-7 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                    <div className="col-span-2">User</div>
                    <div>Role</div>
                    <div>Plan</div>
                    <div>Limit</div>
                    <div>Created</div>
                    <div>Actions</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {pagedUsers.map((u) => (
                      <div key={u.id} className="grid grid-cols-7 items-center px-4 py-3 text-sm">
                        <div className="col-span-2">
                          <div className="font-semibold text-slate-900">{u.email}</div>
                          <div className="text-[11px] text-slate-500">
                            Stripe: {u.stripeCustomerId ? u.stripeCustomerId : "—"}
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">{u.role}</div>
                        <div className="text-xs font-semibold text-slate-700">
                          {u.plan} · {u.planStatus}
                        </div>
                        <div className="text-xs text-slate-700">{u.generationLimit ?? "—"}</div>
                        <div className="text-[12px] text-slate-500">{u.createdAt.toISOString().slice(0, 10)}</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => togglePlan(u.id, u.plan)}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition hover:-translate-y-[1px] hover:shadow ${
                              u.plan === "PRO"
                                ? "border border-slate-300 text-slate-700"
                                : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            Set {u.plan === "PRO" ? "Free" : "Pro"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id, u.email)}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 transition hover:-translate-y-[1px] hover:shadow"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {pagedUsers.length === 0 && <div className="px-4 py-3 text-sm text-slate-600">No users.</div>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === "users" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image src="/images/settings.svg" alt="Users" width={18} height={18} className="h-5 w-5" />
                  <h2 className="text-lg font-semibold text-slate-900">Users & Limits</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Showing {filteredAndSortedUsers.length} of {usersState.length} users
                  </span>
                  <button
                    type="button"
                    onClick={() => exportToCSV(
                      filteredAndSortedUsers,
                      [
                        { key: "email", label: "Email" },
                        { key: "role", label: "Role" },
                        { key: "plan", label: "Plan" },
                        { key: "planStatus", label: "Plan Status" },
                        { key: "generationLimit", label: "Generation Limit" },
                        { key: "initialCount", label: "Initial Count" },
                        { key: "followupCount", label: "Follow-up Count" },
                        { key: "imageCount", label: "Image Count" },
                        { key: "lastLoginAt", label: "Last Login", format: (v) => v instanceof Date ? v.toISOString().split("T")[0] : "" },
                        { key: "createdAt", label: "Created At", format: (v) => v instanceof Date ? v.toISOString().split("T")[0] : String(v) }
                      ],
                      "users"
                    )}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search by email..."
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERUSER">SUPERUSER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Plan</label>
                    <select
                      value={planFilter}
                      onChange={(e) => {
                        setPlanFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                    >
                      <option value="ALL">All Plans</option>
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sort By</label>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                      >
                        <option value="email">Email</option>
                        <option value="createdAt">Created</option>
                        <option value="lastLoginAt">Last Login</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                        title={sortOrder === "asc" ? "Ascending" : "Descending"}
                      >
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-9 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  <div className="col-span-2">User</div>
                  <div>Role</div>
                  <div>Plan</div>
                  <div>Limit</div>
                  <div>Usage</div>
                  <div>Last Login</div>
                  <div>Created</div>
                  <div>Actions</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {pagedUsers.map((u) => (
                    <div key={u.id} className="grid grid-cols-9 items-center px-4 py-3 text-sm">
                      <div className="col-span-2">
                        <div className="font-semibold text-slate-900">{u.email}</div>
                        <div className="text-[11px] text-slate-500">
                          Stripe: {u.stripeCustomerId ? u.stripeCustomerId : "—"}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">{u.role}</div>
                      <div className="text-xs font-semibold text-slate-700">
                        {u.plan} · {u.planStatus}
                      </div>
                      <div className="text-xs text-slate-700">{u.generationLimit ?? "—"}</div>
                      <div className="text-[11px] text-slate-600" title={`Initial: ${u.initialCount}, Follow-up: ${u.followupCount}, Image: ${u.imageCount}`}>
                        <span className="text-blue-600">{u.initialCount}</span>
                        {" / "}
                        <span className="text-amber-600">{u.followupCount}</span>
                        {" / "}
                        <span className="text-purple-600">{u.imageCount}</span>
                      </div>
                      <div className="text-[12px] text-slate-600" title={u.lastLoginAt ? u.lastLoginAt.toISOString() : "Never"}>
                        {formatRelativeTime(u.lastLoginAt)}
                      </div>
                      <div className="text-[12px] text-slate-500">{u.createdAt.toISOString().slice(0, 10)}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => togglePlan(u.id, u.plan)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition hover:-translate-y-[1px] hover:shadow ${
                            u.plan === "PRO"
                              ? "border border-slate-300 text-slate-700"
                              : "border border-emerald-300 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          Set {u.plan === "PRO" ? "Free" : "Pro"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteUser(u.id, u.email)}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 transition hover:-translate-y-[1px] hover:shadow"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {pagedUsers.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-600">
                      No users match your filters
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {tab === "templates" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/help.svg" alt="UX Objective" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">UX Objective</h2>
              </div>
              <TemplatesAdmin initialTemplates={templates} llmModels={llmModels} categories={categories} />
            </section>
          )}
          {tab === "payments" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/billing.svg" alt="Payments" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
              </div>
              <PaymentsAdmin config={payments} />
            </section>
          )}
          {tab === "feedback" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/help.svg" alt="Feedback & Enquirer" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Feedback & Enquirer</h2>
              </div>
              <SupportAdmin requests={support} />
              <FeedbackAdmin feedback={feedback} />
            </section>
          )}

          {tab === "rec-feedback" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👍👎</span>
                <h2 className="text-lg font-semibold text-slate-900">Recommendation Feedback</h2>
              </div>
              <p className="text-sm text-slate-600">
                Track how users rate AI recommendations. Use this data to improve prompts for templates with low helpful rates.
              </p>
              <RecommendationFeedbackAdmin
                feedbacks={recFeedbacks}
                summary={recSummary}
                templateStats={recTemplateStats}
              />
            </section>
          )}

          {tab === "promo" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <h2 className="text-lg font-semibold text-slate-900">Promo Signups</h2>
              </div>
              <p className="text-sm text-slate-600">
                Manage promotional signups for the 3-month free access offer to Senior UX Designers.
              </p>
              <PromoSignupsClient initialPromoEnabled={promoEnabled} />
            </section>
          )}

          {tab === "limits" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Image src="/images/settings.svg" alt="Plan Limits" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">Plan Limits</h2>
              </div>
              <PlanLimitForm onStatus={setStatus} />
            </section>
          )}

          {tab === "keys" && (
            <section className="space-y-6">
              <div className="flex items-center gap-2">
                <Image src="/images/share.svg" alt="LLM Models" width={18} height={18} className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-slate-900">LLM Models & Keys</h2>
              </div>
              <KeysAdmin initialKeys={keys} initialModels={llmModels} />

              {/* LLM Usage Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-semibold text-slate-900">LLM Usage by Model</h3>
                  <button
                    type="button"
                    onClick={() => exportToCSV(
                      llmModelStats,
                      [
                        { key: "model", label: "Model" },
                        { key: "provider", label: "Provider" },
                        { key: "totalTokensIn", label: "Tokens In" },
                        { key: "totalTokensOut", label: "Tokens Out" },
                        { key: "totalTokens", label: "Total Tokens" },
                        { key: "estimatedCost", label: "Est. Cost (USD)", format: (v) => typeof v === "number" ? `$${v.toFixed(4)}` : "—" },
                        { key: "requestCount", label: "Requests" }
                      ],
                      "llm-usage-by-model"
                    )}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-6 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                    <div>Model</div>
                    <div>Provider</div>
                    <div className="text-right">Total Tokens</div>
                    <div className="text-right">Tokens In</div>
                    <div className="text-right">Est. Cost</div>
                    <div className="text-right">Requests</div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {llmModelStats.map((stat) => (
                      <div key={stat.model} className="grid grid-cols-6 items-center px-4 py-3 text-sm">
                        <div className="font-semibold text-slate-900">{stat.model}</div>
                        <div>
                          <span className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                            stat.provider === "openai"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : stat.provider === "anthropic"
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : "bg-slate-50 text-slate-700 border border-slate-200"
                          }`}>
                            {stat.provider}
                          </span>
                        </div>
                        <div className="text-right text-slate-700">
                          {stat.totalTokens > 0 ? stat.totalTokens.toLocaleString() : "—"}
                        </div>
                        <div className="text-right text-[12px] text-slate-500">
                          {stat.totalTokensIn > 0 || stat.totalTokensOut > 0
                            ? `${stat.totalTokensIn.toLocaleString()} / ${stat.totalTokensOut.toLocaleString()}`
                            : "—"}
                        </div>
                        <div className="text-right font-semibold text-slate-900">
                          {stat.estimatedCost > 0 ? `$${stat.estimatedCost.toFixed(4)}` : "—"}
                        </div>
                        <div className="text-right text-slate-700">{stat.requestCount.toLocaleString()}</div>
                      </div>
                    ))}
                    {llmModelStats.length > 0 && (
                      <div className="grid grid-cols-6 items-center px-4 py-3 text-sm bg-slate-50 font-semibold">
                        <div className="text-slate-900">TOTAL</div>
                        <div></div>
                        <div className="text-right text-slate-900">
                          {llmModelStats.reduce((sum, s) => sum + s.totalTokens, 0).toLocaleString()}
                        </div>
                        <div className="text-right text-[12px] text-slate-600">
                          {llmModelStats.reduce((sum, s) => sum + s.totalTokensIn, 0).toLocaleString()} / {llmModelStats.reduce((sum, s) => sum + s.totalTokensOut, 0).toLocaleString()}
                        </div>
                        <div className="text-right text-slate-900">
                          ${llmModelStats.reduce((sum, s) => sum + s.estimatedCost, 0).toFixed(4)}
                        </div>
                        <div className="text-right text-slate-900">
                          {llmModelStats.reduce((sum, s) => sum + s.requestCount, 0).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {llmModelStats.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-slate-600">
                        No usage data yet. Token tracking will begin with new requests.
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Note: Historical requests before token tracking was enabled will show &ldquo;—&rdquo; for tokens and cost.
                </p>
              </div>
            </section>
          )}

          {tab === "usage" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image src="/images/share.svg" alt="Usage" width={18} height={18} className="h-5 w-5" />
                  <h2 className="text-lg font-semibold text-slate-900">Recent Usage</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{usage.length} records</span>
                  <button
                    type="button"
                    onClick={() => exportToCSV(
                      usage,
                      [
                        { key: "userEmail", label: "User Email" },
                        { key: "type", label: "Type" },
                        { key: "model", label: "Model" },
                        { key: "createdAt", label: "Date", format: (v) => v instanceof Date ? v.toISOString().split("T")[0] : String(v) }
                      ],
                      "recent-usage"
                    )}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Pagination page={usagePage} totalPages={usageTotalPages} onPageChange={setUsagePage} />
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid grid-cols-5 bg-slate-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                  <div>User</div>
                  <div>Type</div>
                  <div>User Total</div>
                  <div>Model</div>
                  <div>When</div>
                </div>
                <div className="divide-y divide-slate-200">
                  {pagedUsage.map((u) => {
                    const counts = userUsageCounts[u.userEmail] || { initial: 0, followup: 0, image: 0 };
                    return (
                      <div key={u.id} className="grid grid-cols-5 items-center px-4 py-3 text-sm">
                        <div className="font-semibold text-slate-900">{u.userEmail}</div>
                        <div><TypeBadge type={u.type} /></div>
                        <div className="text-[11px] text-slate-600" title={`Initial: ${counts.initial}, Follow-up: ${counts.followup}, Image: ${counts.image}`}>
                          <span className="text-blue-600">{counts.initial}</span>
                          {" / "}
                          <span className="text-amber-600">{counts.followup}</span>
                          {" / "}
                          <span className="text-purple-600">{counts.image}</span>
                        </div>
                        <div className="text-xs text-slate-700">{u.model ?? "—"}</div>
                        <div className="text-[12px] text-slate-500">{u.createdAt.toISOString().slice(0, 10)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {tab === "email" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">Email & SMTP</h2>
              </div>
              <EmailSmtpAdmin
                initialSmtpConfig={smtpConfig}
                initialEmailSettings={emailSettings}
              />
            </section>
          )}

        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value.toLocaleString()}</div>
      {helper && <div className="text-xs text-slate-600 mt-1">{helper}</div>}
    </div>
  );
}

function CostCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">
        {value > 0 ? `$${value.toFixed(2)}` : "$0.00"}
      </div>
      {helper && <div className="text-xs text-slate-600 mt-1">{helper}</div>}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-700">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-xs text-slate-600">
        Page {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function PlanLimitForm({ onStatus }: { onStatus: (msg: string | null) => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    onStatus(null);
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      onStatus("Please enter a non-negative number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/limits/free", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyLimit: parsed })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        onStatus(json?.error || "Failed to update plan limit.");
        return;
      }
      onStatus(`Free plan daily limit set to ${json.dailyLimit}.`);
      setValue("");
    } catch {
      onStatus("Failed to update plan limit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <label className="block text-sm font-semibold text-slate-800 space-y-1">
        <span>Free plan daily limit</span>
        <input
          type="number"
          min="0"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 5"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-black px-4 py-2 text-xs font-bold uppercase text-white shadow-[0_4px_0_#111] transition hover:-translate-y-[1px] hover:shadow-[0_6px_0_#111] disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Limit"}
      </button>
    </form>
  );
}

function TypeBadge({ type }: { type: "GENERATION" | "FOLLOWUP" | "IMAGE" }) {
  const config = {
    GENERATION: { label: "Initial", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    FOLLOWUP: { label: "Follow-up", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    IMAGE: { label: "Image", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" }
  };
  const { label, bg, text, border } = config[type];
  return (
    <span className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${bg} ${text} border ${border}`}>
      {label}
    </span>
  );
}
