/**
 * Downloads a remote media file to the user's device.
 *
 * Strategy:
 * 1. Fetch the file as a Blob (bypasses cross-origin restrictions on the `download` attribute).
 * 2. On iOS/Android where the Web Share API with files is supported, invoke the native
 *    share sheet so the user can "Save to Photos" / "Save to Camera Roll".
 * 3. Otherwise fall back to a standard Blob URL anchor download (desktop + older Android).
 */
export async function downloadMedia(
  url: string,
  filename: string,
  mimeType: string
): Promise<void> {
  // Fetch the file as a Blob so we own a local copy regardless of origin.
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status}`);
  }
  const blob = await response.blob();
  const file = new File([blob], filename, { type: mimeType });

  // Web Share API Level 2 — supported on iOS Safari 15+, iOS Chrome, Android Chrome 89+.
  // This is the only reliable way to save to the Camera Roll / Photo Library on iOS.
  if (
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({ files: [file], title: filename });
    return;
  }

  // Desktop / unsupported mobile fallback: trigger a Blob URL download.
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Revoke shortly after to free memory.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  }
}
