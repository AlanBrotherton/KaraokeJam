#!/usr/bin/env python3
"""
Test script to run all three processing scripts in sequence:
1. separate_vocals.py - Separate vocals from song
2. extract_lyrics.py - Extract lyrics with timestamps
3. extract_pitches.py - Extract pitch data
"""

import sys
import os
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"STEP: {description}")
    print(f"{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print()
    
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=False,
            text=True
        )
        print(f"\n✓ {description} completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Error in {description}")
        print(f"Exit code: {e.returncode}")
        return False
    except FileNotFoundError:
        print(f"\n✗ Script not found: {cmd[0]}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_scripts.py <audio_file> [output_dir]")
        print("\nExample:")
        print("  python test_scripts.py song.mp3 output/")
        print("\nThis will:")
        print("  1. Separate vocals from the song")
        print("  2. Extract lyrics from vocals")
        print("  3. Extract pitches from vocals")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "output"
    
    # Validate input file
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    # Get input file name without extension
    input_name = Path(input_file).stem
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\n{'='*60}")
    print("KARAOKEJAM - PROCESSING PIPELINE TEST")
    print(f"{'='*60}")
    print(f"Input file: {input_file}")
    print(f"Output directory: {output_dir}")
    print(f"{'='*60}\n")
    
    # Step 1: Separate vocals
    vocals_file = os.path.join(output_dir, f"{input_name}_vocals.wav")
    accompaniment_file = os.path.join(output_dir, f"{input_name}_accompaniment.wav")
    
    success = run_command(
        ["python", "separate_vocals.py", input_file, output_dir],
        "Separating vocals from song"
    )
    
    if not success:
        print("\n✗ Failed at vocal separation. Stopping.")
        sys.exit(1)
    
    # Check if vocals file was created
    if not os.path.exists(vocals_file):
        print(f"\n✗ Vocals file not found: {vocals_file}")
        sys.exit(1)
    
    print(f"\n✓ Vocals file created: {vocals_file}")
    
    # Step 2: Extract lyrics
    lyrics_json = os.path.join(output_dir, f"{input_name}_lyrics.json")
    
    success = run_command(
        ["python", "extract_lyrics.py", vocals_file, lyrics_json, "--model", "base"],
        "Extracting lyrics from vocals"
    )
    
    if not success:
        print("\n⚠ Lyrics extraction failed, but continuing with pitch extraction...")
    else:
        if os.path.exists(lyrics_json):
            print(f"\n✓ Lyrics file created: {lyrics_json}")
        else:
            print(f"\n⚠ Lyrics extraction completed but file not found: {lyrics_json}")
    
    # Step 3: Extract pitches
    pitches_json = os.path.join(output_dir, f"{input_name}_pitches.json")
    
    success = run_command(
        ["python", "extract_pitches.py", vocals_file, pitches_json],
        "Extracting pitches from vocals"
    )
    
    if not success:
        print("\n✗ Failed at pitch extraction.")
        sys.exit(1)
    
    if os.path.exists(pitches_json):
        print(f"\n✓ Pitches file created: {pitches_json}")
    
    # Summary
    print(f"\n{'='*60}")
    print("PROCESSING COMPLETE!")
    print(f"{'='*60}")
    print(f"\nGenerated files in '{output_dir}':")
    print(f"  ✓ {Path(vocals_file).name}")
    print(f"  ✓ {Path(accompaniment_file).name}")
    if os.path.exists(lyrics_json):
        print(f"  ✓ {Path(lyrics_json).name}")
    if os.path.exists(pitches_json):
        print(f"  ✓ {Path(pitches_json).name}")
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    main()

