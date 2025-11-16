"""
Live pitch estimation helpers for streaming / WebSocket use.

This module is intentionally separate from `extract_pitches.py`, which is used
for offline, whole-file pitch extraction in the processing pipeline.
"""

from typing import Dict, Any

import numpy as np

try:
    import librosa
except ImportError as e:
    # Keep import-time behavior similar to extract_pitches.py
    raise ImportError(
        "librosa is required for live pitch estimation. "
        "Install it with: pip install librosa"
    ) from e


def estimate_pitch_for_buffer(
    audio: np.ndarray,
    sample_rate: int,
    fmin: float = 80.0,
    fmax: float = 800.0,
    hop_length: int = 256,
    frame_length: int = 2048,
) -> Dict[str, Any]:
    """
    Estimate pitch for a short audio buffer (e.g., a live chunk).

    This is a lightweight helper suitable for live / streaming use. It runs the
    YIN algorithm on the provided mono buffer and returns the latest pitch
    estimate and its relative timestamp within the buffer.

    Args:
        audio:
            1D mono audio samples as a NumPy array (float32/float64). If a
            multi-channel array is passed, it will be converted to mono.
        sample_rate:
            Sample rate of the audio buffer in Hz.
        fmin, fmax, hop_length, frame_length:
            Same meaning as in the offline extractor.

    Returns:
        Dict with:
          - pitch: float | None  (Hz, None if unvoiced)
          - time: float          (seconds, relative to start of this buffer)
          - voiced: bool         (True if pitch is not None)
    """
    # Ensure numpy array
    if not isinstance(audio, np.ndarray):
        audio = np.asarray(audio, dtype=np.float32)

    # Ensure mono
    if audio.ndim > 1:
        audio = librosa.to_mono(audio)

    if audio.size == 0:
        return {"pitch": None, "time": 0.0, "voiced": False}

    # Run YIN on this buffer
    f0 = librosa.yin(
        audio,
        fmin=fmin,
        fmax=fmax,
        sr=sample_rate,
        frame_length=frame_length,
        hop_length=hop_length,
    )

    times = librosa.frames_to_time(
        np.arange(len(f0)),
        sr=sample_rate,
        hop_length=hop_length,
    )

    last_pitch = float(f0[-1]) if not np.isnan(f0[-1]) and f0[-1] > 0 else None
    last_time = float(times[-1]) if len(times) > 0 else 0.0

    return {
        "pitch": last_pitch,
        "time": last_time,
        "voiced": last_pitch is not None,
    }


