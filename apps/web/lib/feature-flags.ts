import { prisma } from "./prisma";

export async function getFeatureFlag(key: string): Promise<any> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  return flag?.value ?? null;
}

export async function setFeatureFlag(key: string, value: any): Promise<void> {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, scope: "GLOBAL", value },
    update: { value },
  });
}

export async function isOtpEnabled(): Promise<boolean> {
  const flag = await getFeatureFlag("email_otp_enabled");
  return flag?.enabled === true;
}
