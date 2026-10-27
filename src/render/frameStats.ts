// Frame-rate evidence for the phone (AC-46): every 10 s of play, one logcat line
// "FRAME_STATS fps=<average> slow=<% of frames over 20 ms> frames=<n>". Pure, unit-tested.
export const FRAME_STATS_WINDOW_MS = 10_000;
export const SLOW_FRAME_MS = 20;

export class FrameStats {
  private frames = 0;
  private slow = 0;
  private elapsed = 0;

  // Records one frame; returns the summary line when a window is complete.
  record(frameMs: number): string | null {
    if (!(frameMs > 0) || frameMs > 1000) return null; // pauses and app switches are not frames
    this.frames += 1;
    this.elapsed += frameMs;
    if (frameMs > SLOW_FRAME_MS) this.slow += 1;
    if (this.elapsed < FRAME_STATS_WINDOW_MS) return null;
    const line = `FRAME_STATS fps=${((this.frames * 1000) / this.elapsed).toFixed(1)} slow=${((this.slow * 100) / this.frames).toFixed(1)}% frames=${this.frames}`;
    this.frames = 0;
    this.slow = 0;
    this.elapsed = 0;
    return line;
  }
}
