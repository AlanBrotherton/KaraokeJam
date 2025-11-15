#!/usr/bin/env python3
"""
Vocal Separation Script using Demucs
Separates vocals from the rest of the song (accompaniment)
"""

import sys
import os
import torch
import torchaudio
from pathlib import Path

try:
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
except ImportError:
    print("Error: demucs is not installed. Install it with: pip install demucs")
    sys.exit(1)


def separate_vocals(
    input_file: str, 
    output_dir: str = "output", 
    model_name: str = "htdemucs",
    use_gpu: bool = True,
    shifts: int = 1,
    overlap: float = 0.25,
    split: bool = True
) -> dict:
    """
    Separate vocals from a song file using Demucs.
    
    Args:
        input_file: Path to the input audio file (mp3, wav, etc.)
        output_dir: Directory to save the separated audio files
        model_name: Demucs model to use (default: "htdemucs")
        use_gpu: Whether to use GPU if available (default: True)
        shifts: Number of random shifts for test-time augmentation (default: 1, higher = slower but better quality)
        overlap: Overlap between chunks (default: 0.25, lower = faster but may have artifacts)
        split: Whether to split audio into chunks (default: True, False = faster but uses more memory)
        
    Returns:
        Dictionary with paths to 'vocals' and 'accompaniment' files
    """
    # Validate input file
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Input file not found: {input_file}")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Detect available device
    if use_gpu and torch.cuda.is_available():
        device = "cuda"
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
    elif use_gpu and hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        device = "mps"  # Apple Silicon GPU
        print("Using Apple Silicon GPU (MPS)")
    else:
        device = "cpu"
        print("Using CPU")
    
    print(f"Loading Demucs model: {model_name}...")
    # Load the pre-trained model
    model = get_model(model_name)
    model.eval()
    
    # Move model to device
    model = model.to(device)
    
    # Load audio file
    print(f"Loading audio file: {input_file}")
    waveform, sample_rate = torchaudio.load(input_file)
    
    # Demucs expects stereo input, so convert mono to stereo if needed
    if waveform.shape[0] == 1:
        # Duplicate mono channel to create stereo
        waveform = torch.cat([waveform, waveform], dim=0)
        print("Converted mono to stereo")
    elif waveform.shape[0] > 2:
        # If more than 2 channels, take first 2
        waveform = waveform[:2]
        print(f"Using first 2 channels from {waveform.shape[0]}-channel audio")
    
    # Ensure waveform is 2D: [channels, samples]
    if waveform.dim() == 1:
        waveform = waveform.unsqueeze(0)
    
    # Move waveform to device
    waveform = waveform.to(device)
    
    print(f"Audio loaded: {waveform.shape[1]} samples at {sample_rate} Hz")
    print(f"Duration: {waveform.shape[1] / sample_rate:.2f} seconds")
    
    # Separate the audio
    print("Separating vocals from accompaniment...")
    with torch.no_grad():
        # Apply the model to separate stems
        # Demucs returns: [batch, sources, channels, samples]
        # Sources are typically: [drums, bass, other, vocals]
        sources = apply_model(
            model, 
            waveform.unsqueeze(0), 
            device=device, 
            shifts=shifts, 
            split=split, 
            overlap=overlap, 
            progress=True
        )
    
    # Extract stems (remove batch dimension) and move to CPU for saving
    sources = sources.squeeze(0).cpu()  # [sources, channels, samples]
    
    # Demucs 4-stem model: [drums, bass, other, vocals]
    if sources.shape[0] == 4:
        drums = sources[0]
        bass = sources[1]
        other = sources[2]
        vocals = sources[3]
        
        # Combine drums, bass, and other into accompaniment
        accompaniment = drums + bass + other
    else:
        # If using a different model, assume last source is vocals
        vocals = sources[-1]
        # Sum all other sources as accompaniment
        accompaniment = torch.sum(sources[:-1], dim=0)
    
    # Generate output file paths
    input_name = Path(input_file).stem
    vocals_path = os.path.join(output_dir, f"{input_name}_vocals.wav")
    music_path = os.path.join(output_dir, f"{input_name}_accompaniment.wav")
    
    # Save separated audio files
    print(f"Saving vocals to: {vocals_path}")
    torchaudio.save(vocals_path, vocals, sample_rate)
    
    print(f"Saving accompaniment to: {music_path}")
    torchaudio.save(music_path, accompaniment, sample_rate)
    
    print("Separation complete!")
    
    return {
        'vocals': vocals_path,
        'accompaniment': music_path,
        'sample_rate': int(sample_rate)
    }


def separate_vocals_fast(input_file: str, output_dir: str = "output") -> dict:
    """
    Fast mode for vocal separation - optimized for speed.
    Uses GPU if available, reduces overlap, and minimizes shifts.
    
    Args:
        input_file: Path to the input audio file
        output_dir: Directory to save the separated audio files
        
    Returns:
        Dictionary with paths to 'vocals' and 'accompaniment' files
    """
    return separate_vocals(
        input_file=input_file,
        output_dir=output_dir,
        model_name="htdemucs",
        use_gpu=True,
        shifts=1,  # Minimum shifts for speed
        overlap=0.15,  # Lower overlap for speed (may have minor artifacts at chunk boundaries)
        split=True
    )


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python separate_vocals.py <input_file> [output_dir] [--fast]")
        print("Example: python separate_vocals.py song.mp3 output/")
        print("Example (fast mode): python separate_vocals.py song.mp3 output/ --fast")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "output"
    fast_mode = "--fast" in sys.argv
    
    try:
        if fast_mode:
            print("Running in FAST mode (optimized for speed)...")
            result = separate_vocals_fast(input_file, output_dir)
        else:
            result = separate_vocals(input_file, output_dir)
        print("\nResults:")
        print(f"  Vocals: {result['vocals']}")
        print(f"  Accompaniment: {result['accompaniment']}")
        print(f"  Sample Rate: {result['sample_rate']} Hz")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

