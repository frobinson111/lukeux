import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const FIGMA_API_BASE = "https://api.figma.com/v1";
const FIGMA_OAUTH_BASE = "https://www.figma.com/oauth";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET not configured");
  return scryptSync(secret, "figma-token-salt", 32);
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedToken, "base64");
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function buildFigmaAuthUrl(state: string): string {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const redirectUri = process.env.FIGMA_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Figma OAuth not configured");
  }

  const url = new URL(FIGMA_OAUTH_BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "file_content:read");
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

export async function exchangeFigmaCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;
  const redirectUri = process.env.FIGMA_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Figma OAuth not configured");
  }

  const response = await fetch("https://www.figma.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma token exchange failed: ${text}`);
  }

  return response.json();
}

export async function refreshFigmaToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const clientId = process.env.FIGMA_CLIENT_ID;
  const clientSecret = process.env.FIGMA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Figma OAuth not configured");
  }

  const response = await fetch("https://www.figma.com/api/oauth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Figma token refresh failed");
  }

  return response.json();
}

export async function getFigmaUser(accessToken: string): Promise<{
  id: string;
  email: string;
  handle: string;
  img_url: string;
}> {
  const response = await fetch(`${FIGMA_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Figma user");
  }

  return response.json();
}

export async function getFigmaFile(accessToken: string, fileKey: string): Promise<any> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Figma file");
  }

  return response.json();
}

export async function getFigmaFileNodes(
  accessToken: string,
  fileKey: string,
  nodeIds: string[]
): Promise<any> {
  const ids = nodeIds.join(",");
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${ids}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Figma nodes");
  }

  return response.json();
}

export async function getFigmaComments(accessToken: string, fileKey: string): Promise<any> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/comments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Figma comments");
  }

  return response.json();
}

export async function getFigmaImages(
  accessToken: string,
  fileKey: string,
  nodeIds: string[],
  format: "png" | "svg" | "pdf" = "png",
  scale: number = 2
): Promise<{ images: Record<string, string> }> {
  const ids = nodeIds.join(",");
  const response = await fetch(
    `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Figma images");
  }

  return response.json();
}
