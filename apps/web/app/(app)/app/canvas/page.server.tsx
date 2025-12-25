import { requireUser } from "../../../../lib/auth";
import CanvasPage from "./page";

export default async function CanvasPageServer() {
  const user = await requireUser();
  if (!user) return null;

  return <CanvasPage firstName={user.firstName} />;
}


