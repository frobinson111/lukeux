import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import CanvasPage from "./page";

export default async function CanvasPageServer() {
  const user = await requireUser();
  if (!user) return null;

  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { title: "asc" }]
  });

  return <CanvasPage firstName={user.firstName} templates={templates} />;
}


