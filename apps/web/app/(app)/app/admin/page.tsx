import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export default async function AdminPage() {
  const user = await requireUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERUSER")) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Forbidden</h1>
        <p className="text-sm text-slate-600">You do not have access to this page.</p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, generationLimit: true }
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin: Generation Limits</h1>
        <p className="text-sm text-slate-600 mt-2">
          Set per-user generation limits. Leave empty to use the default free limit (2). Admins/Superusers bypass limits.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-200">
        {users.map((u) => (
          <UserLimitRow key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}

function UserLimitRow({ user }: { user: { id: string; email: string; role: string; generationLimit: number | null } }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <div>
        <div className="font-semibold text-slate-900">{user.email}</div>
        <div className="text-xs text-slate-500">Role: {user.role}</div>
      </div>
      <form
        className="flex items-center gap-2"
        action="/api/admin/limits"
        method="post"
      >
        <input type="hidden" name="email" value={user.email} />
        <input
          name="generationLimit"
          type="number"
          min="0"
          placeholder="2"
          defaultValue={user.generationLimit ?? ""}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-3 py-1 text-xs font-bold uppercase text-white shadow-[0_2px_0_#111] transition hover:-translate-y-[1px]"
        >
          Save
        </button>
      </form>
    </div>
  );
}


