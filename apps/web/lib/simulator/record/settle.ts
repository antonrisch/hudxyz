/**
 * Wait until the stage is painting steadily after the share-tab picker returns.
 * Reduces the start hitch that permanently offsets independent media clocks
 * (stage BG video vs iframe content).
 */

function waitAnimationFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let left = count;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function waitVideoFrame(video: HTMLVideoElement, timeoutMs = 500): Promise<void> {
  if (!("requestVideoFrameCallback" in video)) {
    return waitAnimationFrames(2);
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const handle = video.requestVideoFrameCallback(() => finish());
    window.setTimeout(() => {
      try {
        video.cancelVideoFrameCallback(handle);
      } catch {
        // ignore
      }
      finish();
    }, timeoutMs);
  });
}

/** Find the HW backdrop leader <video> (stage or additive slice). */
export function findBackdropLeader(stage: HTMLElement): HTMLVideoElement | null {
  const video =
    stage.querySelector<HTMLVideoElement>('[data-capture="backdrop"] video') ??
    stage.querySelector("video");
  if (!video) return null;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  return video;
}

/**
 * Ensure the leader keeps playing, wait for one decoded frame + a couple of
 * display frames, then the caller may start MediaRecorder.
 */
export async function settleBeforeEncode(stage: HTMLElement): Promise<{
  leader: HTMLVideoElement | null;
  settleMs: number;
}> {
  const started = performance.now();
  const leader = findBackdropLeader(stage);

  if (leader && leader.paused) {
    void leader.play().catch(() => {});
  }

  if (leader) await waitVideoFrame(leader);
  await waitAnimationFrames(2);

  return { leader, settleMs: Math.round(performance.now() - started) };
}
