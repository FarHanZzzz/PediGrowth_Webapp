// PEDI-GROWTH — Pose Provider Abstraction
// Interface and factory for swappable pose estimation backends.

import type { PoseProvider, LandmarkFrame } from '@/lib/types';

/**
 * Create a pose provider instance.
 * Currently only MediaPipe is supported.
 * MoveNet can be re-added later if needed.
 */
export async function createPoseProvider(
  providerName: 'mediapipe' = 'mediapipe'
): Promise<PoseProvider> {
  switch (providerName) {
    case 'mediapipe': {
      // Lazy import to avoid loading WASM until needed
      const { MediaPipePoseProvider } = await import('./mediapipe-provider');
      return new MediaPipePoseProvider();
    }

    default:
      throw new Error(`Unknown pose provider: ${providerName}`);
  }
}

/**
 * Extract landmarks from all frames of a video element.
 * Processes at target FPS for the FULL playable video duration.
 */
export async function extractLandmarkSequence(
  provider: PoseProvider,
  video: HTMLVideoElement,
  targetFps: number = 10,
): Promise<LandmarkFrame[]> {
  const frames: LandmarkFrame[] = [];
  const duration = resolveExtractionDuration(video.duration);
  if (duration <= 0) return frames;

  const interval = 1 / targetFps;
  const sampleCount = Math.max(1, Math.floor(duration * targetFps));

  for (let sampleIdx = 0; sampleIdx <= sampleCount; sampleIdx++) {
    const time = Math.min(sampleIdx * interval, duration);
    video.currentTime = time;

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    const frame = await provider.extractFrame(video, time * 1000);
    frames.push(frame);
  }

  return frames;
}

export function resolveExtractionDuration(videoDurationSeconds: number): number {
  if (!Number.isFinite(videoDurationSeconds) || videoDurationSeconds <= 0) {
    return 0;
  }
  return videoDurationSeconds;
}
