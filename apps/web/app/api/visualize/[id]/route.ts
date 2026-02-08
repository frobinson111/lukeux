import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

// GET: Retrieve a specific visualization artifact
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const artifact = await prisma.visualizationArtifact.findUnique({
    where: { id: params.id },
  });

  if (!artifact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return the artifact with image data as a data URL
  const imageUrl = artifact.imageData
    ? `data:image/png;base64,${artifact.imageData}`
    : artifact.storageUrl;

  return NextResponse.json({
    id: artifact.id,
    taskId: artifact.taskId,
    sectionId: artifact.sectionId,
    sectionType: artifact.sectionType,
    templateId: artifact.templateId,
    format: artifact.format,
    width: artifact.width,
    height: artifact.height,
    status: artifact.status,
    imageUrl,
    createdAt: artifact.createdAt,
    createdByModel: artifact.createdByModel,
  });
}
