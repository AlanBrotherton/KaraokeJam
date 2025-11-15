#!/usr/bin/env python3
"""
Lyrics Extraction Script using OpenAI Whisper
Extracts lyrics with timestamps from an audio file (typically vocals)
"""

import sys
import os
import json
from pathlib import Path

try:
    import whisper
except ImportError:
    print("Error: openai-whisper is not installed. Install it with: pip install openai-whisper")
    sys.exit(1)


def extract_lyrics(
    audio_file: str,
    model_name: str = "base",
    output_file: str = None,
    language: str = None,
    format: str = "json"
) -> dict:
    """
    Extract lyrics with timestamps from an audio file using Whisper.
    
    Args:
        audio_file: Path to the input audio file (vocals or full song)
        model_name: Whisper model to use (tiny, base, small, medium, large, large-v2, large-v3)
                   Default: "base" (good balance of speed and accuracy)
        output_file: Optional file to save the results (JSON or LRC format)
        language: Language code (e.g., 'en', 'es', 'fr'). If None, auto-detect
        format: Output format - 'json' (default) or 'lrc' (LRC karaoke format)
        
    Returns:
        Dictionary containing:
            - text: Full transcribed text
            - segments: List of segments with start, end, and text
            - words: List of words with timestamps (if available)
            - language: Detected language
    """
    # Validate input file
    if not os.path.exists(audio_file):
        raise FileNotFoundError(f"Audio file not found: {audio_file}")
    
    print(f"Loading Whisper model: {model_name}...")
    # Load Whisper model
    model = whisper.load_model(model_name)
    
    print(f"Transcribing audio file: {audio_file}")
    # Transcribe audio with word-level timestamps
    result = model.transcribe(
        audio_file,
        language=language,
        word_timestamps=True,
        verbose=True
    )
    
    # Extract information
    full_text = result["text"].strip()
    language_detected = result.get("language", "unknown")
    segments = result.get("segments", [])
    
    # Process segments
    processed_segments = []
    for segment in segments:
        processed_segments.append({
            "id": segment.get("id", 0),
            "start": float(segment["start"]),
            "end": float(segment["end"]),
            "text": segment["text"].strip(),
            "no_speech_prob": float(segment.get("no_speech_prob", 0)),
            "words": []
        })
        
        # Add word-level timestamps if available
        if "words" in segment:
            for word in segment["words"]:
                processed_segments[-1]["words"].append({
                    "word": word["word"],
                    "start": float(word["start"]),
                    "end": float(word["end"]),
                    "probability": float(word.get("probability", 0))
                })
    
    # Prepare result dictionary
    result_dict = {
        "text": full_text,
        "language": language_detected,
        "segments": processed_segments,
        "duration": float(result.get("duration", 0))
    }
    
    # Save to file if specified
    if output_file:
        output_path = Path(output_file)
        
        if format.lower() == "lrc":
            # Save as LRC (LyRiCs) format - standard karaoke format
            print(f"Saving lyrics in LRC format to: {output_file}")
            with open(output_file, 'w', encoding='utf-8') as f:
                # LRC header
                f.write("[ti:]\n")  # Title (empty, can be filled later)
                f.write("[ar:]\n")  # Artist (empty, can be filled later)
                f.write("[al:]\n")  # Album (empty, can be filled later)
                f.write("[by:KaraokeJam]\n")  # Creator
                f.write("\n")
                
                # Write segments with timestamps
                for segment in processed_segments:
                    # Format time as [mm:ss.xx]
                    start_min = int(segment["start"] // 60)
                    start_sec = segment["start"] % 60
                    time_str = f"[{start_min:02d}:{start_sec:05.2f}]"
                    f.write(f"{time_str}{segment['text']}\n")
        else:
            # Save as JSON (default)
            print(f"Saving lyrics in JSON format to: {output_file}")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result_dict, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\nLyrics Extraction Summary:")
    print(f"  Language detected: {language_detected}")
    print(f"  Duration: {result_dict['duration']:.2f} seconds")
    print(f"  Number of segments: {len(processed_segments)}")
    print(f"  Full text length: {len(full_text)} characters")
    print(f"\nFirst few segments:")
    for i, segment in enumerate(processed_segments[:3]):
        print(f"  [{segment['start']:.2f}s - {segment['end']:.2f}s] {segment['text'][:50]}...")
    
    return result_dict


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_lyrics.py <audio_file> [output_file] [options]")
        print("Example: python extract_lyrics.py vocals.wav lyrics.json")
        print("Example: python extract_lyrics.py vocals.wav lyrics.lrc --format lrc")
        print("\nOptions:")
        print("  --model <name>      Whisper model: tiny, base, small, medium, large (default: base)")
        print("  --format <format>    Output format: json or lrc (default: json)")
        print("  --language <code>    Language code (e.g., en, es, fr). Auto-detect if not specified")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    
    # Parse optional arguments
    model_name = "base"
    format_type = "json"
    language = None
    
    i = 2 if output_file else 1
    while i < len(sys.argv):
        if sys.argv[i] == '--model' and i + 1 < len(sys.argv):
            model_name = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--format' and i + 1 < len(sys.argv):
            format_type = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--language' and i + 1 < len(sys.argv):
            language = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    # Auto-detect output format from file extension if not specified
    if output_file and format_type == "json":
        ext = Path(output_file).suffix.lower()
        if ext == ".lrc":
            format_type = "lrc"
    
    try:
        result = extract_lyrics(
            audio_file,
            model_name=model_name,
            output_file=output_file,
            language=language,
            format=format_type
        )
        
        if output_file:
            print(f"\n✓ Lyrics saved to: {output_file}")
        else:
            print("\nFull transcription:")
            print(result["text"])
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

