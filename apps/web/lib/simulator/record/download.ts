export function downloadStageRecording(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  anchor.download = `mrbd-${stamp}.${ext}`;
  anchor.click();
  URL.revokeObjectURL(url);
}
