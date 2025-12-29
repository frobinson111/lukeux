import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { getAvailableModelsFromKeys } from "../../../../lib/llm/models";
import AdminClient from "./admin-client";

export type UserRow = {
  id: string;
  email: string;
  role: string;
  plan: string;
  planStatus: string;
  generationLimit: number | null;
  stripeCustomerId: string | null;
  createdAt: Date;
};

export type TemplateRow = {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  prompt: string;
  guidanceUseAiTo: string | null;
  guidanceExample: string | null;
  guidanceOutcome: string | null;
  assets: string | null;
  allowedModels: string[];
  allowedModes: string[];
  isActive: boolean;
  createdAt: Date;
  templateCategoryId: string | null;
};

export type UsageRow = {
  id: string;
  userEmail: string;
  model: string | null;
  createdAt: Date;
  tokensIn: number | null;
  tokensOut: number | null;
};

export type EventRow = {
  id: string;
  type: string;
  createdAt: Date;
  userEmail: string | null;
};

export type KeyRow = {
  id: string;
  provider: string;
  displayName: string;
  last4: string;
  isActive: boolean;
  createdAt: Date;
};

export type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
};

export type PaymentConfigRow = {
  pricePro: string | null;
  mode: "live" | "test" | "unknown";
  secretMasked: string;
  webhookMasked: string;
};

export type SupportRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  requestType: string | null;
  message: string;
  createdAt: Date;
};

export type FeedbackRow = {
  id: string;
  type: string;
  source: string | null;
  triggerCount: number | null;
  message: string;
  createdAt: string | Date;
  userEmail: string | null;
  userName: string | null;
};

export default async function AdminPage() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Forbidden</h1>
        <p className="text-sm text-slate-600">You do not have access to this page.</p>
      </div>
    );
  }

  const prismaAny = prisma as any;

  const [users, templates, usage, events, keys, modelOptions, categories, paymentConfig, supportRequests, feedbackRows] = await Promise.all([
    prismaAny.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        planStatus: true,
        generationLimit: true,
        stripeCustomerId: true,
        createdAt: true
      }
    }),
    prismaAny.taskTemplate.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }]
    }),
    prismaAny.usageLedger.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        model: true,
        tokensIn: true,
        tokensOut: true,
        user: { select: { email: true } }
      }
    }),
    prismaAny.billingEvent.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: { select: { email: true } }
      }
    }),
    prismaAny.apiKey.findMany({
      orderBy: { createdAt: "desc" }
    }),
    getAvailableModelsFromKeys(),
    prismaAny.templateCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prismaAny.paymentConfig.findFirst(),
    prismaAny.supportRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prismaAny.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true, firstName: true, lastName: true } } }
    })
  ]);

  const secret = process.env.STRIPE_SECRET_KEY || "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET || "";
  const mode: PaymentConfigRow["mode"] = secret.startsWith("sk_live")
    ? "live"
    : secret.startsWith("sk_test")
      ? "test"
      : "unknown";

  const usersData = users as UserRow[];
  const templatesData = templates as TemplateRow[];
  const usageData: UsageRow[] = usage.map((u: any) => ({
    id: u.id,
    userEmail: u.user?.email ?? "—",
    model: u.model,
    createdAt: u.createdAt,
    tokensIn: u.tokensIn,
    tokensOut: u.tokensOut
  }));
  const eventData: EventRow[] = events.map((e: any) => ({
    id: e.id,
    type: e.type,
    createdAt: e.createdAt,
    userEmail: e.user?.email ?? null
  }));
  const keyData: KeyRow[] = keys.map((k: any) => ({
    id: k.id,
    provider: k.provider,
    displayName: k.displayName,
    last4: k.key.slice(-4),
    isActive: k.isActive,
    createdAt: k.createdAt
  }));

  return (
    <AdminClient
      userRole={user.role}
      users={usersData}
      templates={templatesData}
      usage={usageData}
      events={eventData}
      keys={keyData}
      availableModels={modelOptions}
      categories={categories as CategoryRow[]}
      payments={{
        pricePro: paymentConfig?.pricePro ?? null,
        mode,
        secretMasked: secret ? `${secret.slice(0, 2)}••••${secret.slice(-4)}` : "",
        webhookMasked: webhook ? `${webhook.slice(0, 2)}••••${webhook.slice(-4)}` : ""
      }}
      support={supportRequests as SupportRow[]}
      feedback={
        feedbackRows.map((f: any) => ({
          id: f.id,
          type: f.type,
          source: f.source ?? null,
          triggerCount: f.triggerCount ?? null,
          message: f.message,
          createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
          userEmail: f.user?.email ?? null,
          userName: f.user ? `${f.user.firstName ?? ""} ${f.user.lastName ?? ""}`.trim() || null : null
        })) as FeedbackRow[]
      }
    />
  );
}


