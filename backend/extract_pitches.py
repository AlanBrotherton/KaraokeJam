#!/usr/bin/env python3
"""
Pitch Extraction Script using Librosa
Extracts pitch (fundamental frequency F0) over time from an audio file
"""

import sys
import os
import json
import numpy as np
import math

try:
    import librosa
except ImportError:
    print("Error: librosa is not installed. Install it with: pip install librosa")
    sys.exit(1)


def extract_pitches(
    audio_file: str,
    fmin: float = 80.0,
    fmax: float = 800.0,
    hop_length: int = 256,
    frame_length: int = 2048,
    output_file: str = None
) -> dict:
    """
    Extract pitch (fundamental frequency) over time from an audio file.
    
    Args:
        audio_file: Path to the input audio file
        fmin: Minimum frequency in Hz (low male voice ~80Hz)
        fmax: Maximum frequency in Hz (high female voice ~800Hz)
        hop_length: Number of samples between successive frames
        frame_length: Length of each frame in samples
        output_file: Optional JSON file to save the results
        
    Returns:
        Dictionary containing:
            - pitches: List of pitch values in Hz (NaN for non-voiced frames)
            - times: List of time stamps in seconds
            - sample_rate: Sample rate of the audio
            - stats: Statistics about the pitch extraction
    """
    # Validate input file
    if not os.path.exists(audio_file):
        raise FileNotFoundError(f"Audio file not found: {audio_file}")
    
    print(f"Loading audio file: {audio_file}")
    # Load audio (mono, original sample rate)
    audio, sample_rate = librosa.load(audio_file, sr=None, mono=True)
    
    print(f"Audio loaded: {len(audio)} samples at {sample_rate} Hz")
    print(f"Duration: {len(audio) / sample_rate:.2f} seconds")
    
    # Extract pitch using YIN algorithm
    print("Extracting pitch using YIN algorithm...")
    f0 = librosa.yin(
        audio,
        fmin=fmin,
        fmax=fmax,
        sr=sample_rate,
        frame_length=frame_length,
        hop_length=hop_length,
    )
    
    # Generate time stamps for each frame
    times = librosa.frames_to_time(
        np.arange(len(f0)),
        sr=sample_rate,
        hop_length=hop_length
    )
    
    # Calculate statistics
    valid_pitches = f0[~np.isnan(f0)]
    valid_pitches = valid_pitches[valid_pitches > 0]
    
    if len(valid_pitches) > 0:
        stats = {
            'mean_pitch': float(np.mean(valid_pitches)),
            'median_pitch': float(np.median(valid_pitches)),
            'min_pitch': float(np.min(valid_pitches)),
            'max_pitch': float(np.max(valid_pitches)),
            'std_pitch': float(np.std(valid_pitches)),
            'voiced_frames': int(len(valid_pitches)),
            'total_frames': int(len(f0)),
            'voiced_percentage': float(len(valid_pitches) / len(f0) * 100)
        }
    else:
        stats = {
            'mean_pitch': None,
            'median_pitch': None,
            'min_pitch': None,
            'max_pitch': None,
            'std_pitch': None,
            'voiced_frames': 0,
            'total_frames': int(len(f0)),
            'voiced_percentage': 0.0
        }
    
    # Prepare results
    result = {
        'pitches': [float(p) if not np.isnan(p) else None for p in f0],
        'times': [float(t) for t in times],
        'sample_rate': int(sample_rate),
        'hop_length': hop_length,
        'frame_length': frame_length,
        'fmin': fmin,
        'fmax': fmax,
        'stats': stats
    }
    
    # Save to JSON file if specified
    if output_file:
        print(f"Saving results to: {output_file}")
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
    
    # Print statistics
    print("\nPitch Extraction Statistics:")
    print(f"  Total frames: {stats['total_frames']}")
    print(f"  Voiced frames: {stats['voiced_frames']} ({stats['voiced_percentage']:.1f}%)")
    if stats['mean_pitch'] is not None:
        print(f"  Mean pitch: {stats['mean_pitch']:.2f} Hz")
        print(f"  Median pitch: {stats['median_pitch']:.2f} Hz")
        print(f"  Pitch range: {stats['min_pitch']:.2f} - {stats['max_pitch']:.2f} Hz")
        print(f"  Standard deviation: {stats['std_pitch']:.2f} Hz")
    
    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pitches.py <audio_file> [output_json] [options]")
        print("Example: python extract_pitches.py vocals.wav pitches.json")
        print("\nOptions:")
        print("  --fmin <value>    Minimum frequency in Hz (default: 80.0)")
        print("  --fmax <value>    Maximum frequency in Hz (default: 800.0)")
        print("  --hop <value>     Hop length in samples (default: 256)")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    
    # Parse optional arguments
    fmin = 80.0
    fmax = 800.0
    hop_length = 256
    
    i = 2 if output_file else 1
    while i < len(sys.argv):
        if sys.argv[i] == '--fmin' and i + 1 < len(sys.argv):
            fmin = float(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--fmax' and i + 1 < len(sys.argv):
            fmax = float(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--hop' and i + 1 < len(sys.argv):
            hop_length = int(sys.argv[i + 1])
            i += 2
        else:
            i += 1
    
    try:
        result = extract_pitches(
            audio_file,
            fmin=fmin,
            fmax=fmax,
            hop_length=hop_length,
            output_file=output_file
        )
        
        if output_file:
            print(f"\nResults saved to: {output_file}")
        else:
            print("\nFirst 10 pitch values:")
            for i in range(min(10, len(result['pitches']))):
                pitch = result['pitches'][i]
                time = result['times'][i]
                if pitch is not None:
                    print(f"  t={time:.2f}s  pitch={pitch:.2f} Hz")
                else:
                    print(f"  t={time:.2f}s  pitch=None (non-voiced)")
                    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

