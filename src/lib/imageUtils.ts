export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // 1. Convert Google Drive file link: drive.google.com/file/d/{FILE_ID}/...
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`;
  }

  // 2. Convert Google Drive open/uc link: drive.google.com/open?id={FILE_ID} or drive.google.com/uc?id={FILE_ID}
  const driveIdMatch = trimmed.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }

  // 3. Convert Google Drive sharing link with id param: google.com/... id={FILE_ID}
  const genericIdMatch = trimmed.match(/google\.com\/.*[?&]id=([a-zA-Z0-9_-]+)/);
  if (genericIdMatch && genericIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${genericIdMatch[1]}`;
  }

  return trimmed;
}

export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const formatted = formatImageUrl(url);
  if (!formatted) return false;

  try {
    if (formatted.startsWith("/")) return true;
    const parsed = new URL(formatted);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
