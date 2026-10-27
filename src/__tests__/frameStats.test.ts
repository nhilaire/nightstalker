import { FrameStats } from '../render/frameStats';

describe('frame stats log line (AC-46)', () => {
  it('summarises every 10 s of frames: average fps and share of slow frames', () => {
    const stats = new FrameStats();
    let line: string | null = null;
    for (let i = 0; i < 600 && !line; i++) line = stats.record(i % 10 === 0 ? 25 : 16);
    expect(line).toMatch(/^FRAME_STATS fps=\d+\.\d slow=\d+\.\d% frames=\d+$/);
    expect(line).toContain('slow=10.1%'); // 60 slow frames out of 592
  });

  it('ignores pauses and app switches', () => {
    const stats = new FrameStats();
    expect(stats.record(5000)).toBeNull();
    expect(stats.record(0)).toBeNull();
  });
});
