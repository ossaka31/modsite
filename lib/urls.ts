export function isHttpsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isSafeImageSrc(value: string) {
  if (!value) return false;
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("..")
  ) {
    return /^\/[a-zA-Z0-9/_\-.]+$/.test(value);
  }
  return isHttpsUrl(value) && value.length > 0;
}
