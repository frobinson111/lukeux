import crypto from "crypto";
import { hashToken } from "./tokens";

export function generateOtp(): { otp: string; hash: string } {
  const num = crypto.randomInt(100000, 999999);
  const otp = num.toString();
  const hash = hashToken(otp);
  return { otp, hash };
}

export function hashOtp(otp: string): string {
  return hashToken(otp);
}

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_RATE_LIMIT_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;
