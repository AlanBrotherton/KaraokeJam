"""
Song Processing Pipeline
Downloads audio from Supabase, processes it, and uploads results
"""
import os
import json
import tempfile
import requests
from pathlib import Path
from typing import Dict, Optional
from pydub import AudioSegment
from supabase_client import supabase
from separate_vocals import separate_vocals_fast
from extract_lyrics import extract_lyrics
from extract_pitches import extract_pitches


class SongProcessor:
    def __init__(self, temp_dir: str = "./temp"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(exist_ok=True)
        
    def process_song(self, song_id: str) -> bool:
        """
        Process a single song through the complete pipeline
        
        Args:
            song_id: UUID of the song to process
            
        Returns:
            True if successful, False otherwise
        """
        print(f"\n{'='*60}")
        print(f"Processing song: {song_id}")
        print(f"{'='*60}\n")
        
        try:
            # 1. Fetch song record from database
            print("📥 Fetching song record...")
            response = supabase.table('songs').select('*').eq('id', song_id).single().execute()
            song = response.data
            
            if not song:
                print(f"❌ Song {song_id} not found in database")
                return False
            
            print(f"✓ Found song: {song['title']} by {song['artist']}")
            
            # Update status to 'processing'
            supabase.table('songs').update({
                'processing_status': 'processing'
            }).eq('id', song_id).execute()
            
            # 2. Download original audio file
            print(f"\n📥 Downloading original audio from: {song['original_audio_url']}")
            original_file = self._download_file(song['original_audio_url'], song_id, 'original')
            print(f"✓ Downloaded to: {original_file}")
            
            # 3. Separate vocals and instrumental
            print("\n🎤 Separating vocals from instrumental...")
            output_dir = self.temp_dir / song_id
            output_dir.mkdir(exist_ok=True)
            
            separation_result = separate_vocals_fast(str(original_file), str(output_dir))
            vocals_file = separation_result['vocals']
            instrumental_file = separation_result['accompaniment']
            print(f"✓ Vocals: {vocals_file}")
            print(f"✓ Instrumental: {instrumental_file}")
            
            # 4. Extract lyrics from vocals
            print("\n📝 Extracting lyrics...")
            lyrics_file = str(output_dir / 'lyrics.json')
            lyrics_result = extract_lyrics(
                vocals_file,
                model_name='base',
                output_file=lyrics_file,
                format='json'
            )
            print(f"✓ Lyrics extracted: {len(lyrics_result['segments'])} segments")
            
            # 5. Extract pitch data from vocals
            print("\n🎵 Extracting pitch data...")
            pitch_file = str(output_dir / 'pitch.json')
            pitch_result = extract_pitches(
                vocals_file,
                output_file=pitch_file
            )
            print(f"✓ Pitch data extracted: {len(pitch_result['pitches'])} frames")
            
            # 6. Convert WAV to MP3 (compress files)
            print("\n🗜️  Converting WAV to MP3...")
            vocals_mp3 = self._convert_to_mp3(vocals_file)
            instrumental_mp3 = self._convert_to_mp3(instrumental_file)
            print(f"✓ Vocals compressed: {vocals_mp3}")
            print(f"✓ Instrumental compressed: {instrumental_mp3}")
            
            # 7. Upload all processed files to Supabase Storage
            print("\n☁️  Uploading processed files to Supabase Storage...")
            
            # Upload vocals
            vocals_url = self._upload_to_storage(vocals_mp3, song_id, 'vocals.mp3', 'songs-audio')
            print(f"✓ Vocals uploaded: {vocals_url}")
            
            # Upload instrumental
            instrumental_url = self._upload_to_storage(instrumental_mp3, song_id, 'instrumental.mp3', 'songs-audio')
            print(f"✓ Instrumental uploaded: {instrumental_url}")
            
            # Upload lyrics JSON
            lyrics_url = self._upload_to_storage(lyrics_file, song_id, 'lyrics.json', 'songs-data')
            print(f"✓ Lyrics uploaded: {lyrics_url}")
            
            # Upload pitch JSON
            pitch_url = self._upload_to_storage(pitch_file, song_id, 'pitch.json', 'songs-data')
            print(f"✓ Pitch data uploaded: {pitch_url}")
            
            # 7. Update database with processed file URLs
            print("\n💾 Updating database...")
            supabase.table('songs').update({
                'vocals_url': vocals_url,
                'instrumental_url': instrumental_url,
                'lyrics_data_url': lyrics_url,
                'pitch_data_url': pitch_url,
                'processing_status': 'completed'
            }).eq('id', song_id).execute()
            print("✓ Database updated")
            
            # 8. Cleanup temporary files
            print("\n🧹 Cleaning up temporary files...")
            self._cleanup(song_id)
            print("✓ Cleanup complete")
            
            print(f"\n{'='*60}")
            print(f"✅ Successfully processed song: {song['title']}")
            print(f"{'='*60}\n")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error processing song {song_id}: {e}")
            import traceback
            traceback.print_exc()
            
            # Update status to 'failed'
            try:
                supabase.table('songs').update({
                    'processing_status': 'failed'
                }).eq('id', song_id).execute()
            except:
                pass
            
            # Cleanup on error
            self._cleanup(song_id)
            
            return False
    
    def _download_file(self, url: str, song_id: str, filename: str) -> Path:
        """Download a file from URL to temp directory"""
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Detect file extension from URL or content-type
        ext = Path(url).suffix or '.mp3'
        file_path = self.temp_dir / song_id / f"{filename}{ext}"
        file_path.parent.mkdir(exist_ok=True)
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return file_path
    
    def _convert_to_mp3(self, wav_file: str) -> str:
        """Convert WAV file to MP3 for smaller file size"""
        wav_path = Path(wav_file)
        mp3_path = wav_path.with_suffix('.mp3')
        
        # Load WAV and export as MP3
        audio = AudioSegment.from_wav(wav_file)
        audio.export(mp3_path, format='mp3', bitrate='192k')
        
        return str(mp3_path)
    
    def _upload_to_storage(self, file_path: str, song_id: str, filename: str, bucket: str) -> str:
        """Upload a file to Supabase Storage and return public URL"""
        storage_path = f"{song_id}/{filename}"
        
        # Read file
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Upload to storage
        supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": self._get_content_type(filename)}
        )
        
        # Get public URL
        url_data = supabase.storage.from_(bucket).get_public_url(storage_path)
        return url_data
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension"""
        ext = Path(filename).suffix.lower()
        content_types = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.json': 'application/json'
        }
        return content_types.get(ext, 'application/octet-stream')
    
    def _cleanup(self, song_id: str):
        """Delete temporary files for a song"""
        song_dir = self.temp_dir / song_id
        if song_dir.exists():
            import shutil
            shutil.rmtree(song_dir)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python process_song.py <song_id>")
        sys.exit(1)
    
    song_id = sys.argv[1]
    processor = SongProcessor()
    success = processor.process_song(song_id)
    
    sys.exit(0 if success else 1)
