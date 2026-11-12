import "server-only";

import { headers } from "next/headers";
import { isHttpsUrl, isSafeImageSrc } from "@/lib/urls";

export { isHttpsUrl, isSafeImageSrc };

export async function assertSameOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  const hosts = [
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim(),
    headerList.get("host")?.trim(),
  ]
    .filter((host): host is string => Boolean(host));
  const normalizedHosts = hosts.map((host) => host.toLowerCase());

  // Localhost / development always allowed
  if (normalizedHosts.some((host) => host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return true;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  let originHost: string | null = null;
  if (origin) {
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return false;
    }

    if (normalizedHosts.includes(originHost)) return true;
  }

  if (configured) {
    try {
      const configuredHost = new URL(configured).host.toLowerCase();
      return originHost
        ? originHost === configuredHost
        : normalizedHosts.includes(configuredHost);
    } catch {
      return false;
    }
  }

  return normalizedHosts.length > 0;
}

export async function clientAddress() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "local";
}

export async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }

  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return `http://${host}`;
  }
  return null;
}

export function safeStoragePath(path: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(path);
}

export function cleanText(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

const IMAGE_LIMIT = 4 * 1024 * 1024;

export function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.byteLength > IMAGE_LIMIT || bytes.byteLength < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export function contentTypeFor(ext: "jpg" | "png" | "webp") {
  if (ext === "jpg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "image/webp";
}

export async function verifyTurnstile(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!secret || !siteKey) return true;
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}
