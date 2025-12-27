import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/auth";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) {
    redirect("/auth/login");
  }

  const [freshUser, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true, workDescription: true, plan: true, planStatus: true }
    }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expiresAt: true, revokedAt: true }
    })
  ]);

  if (!freshUser) {
    redirect("/auth/login");
  }

  return <SettingsClient user={freshUser} sessions={sessions} />;
}

