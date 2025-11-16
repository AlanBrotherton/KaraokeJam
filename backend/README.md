# KaraokeJam Backend - Processing Service

## Setup

1. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure environment variables:**
Create a `.env` file in the backend directory:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
PROCESSING_INTERVAL=60
TEMP_DIR=./temp
```

**Important:** Use your **service role key** (not anon key) for backend processing.

## Running the Service

### Start the processing service:
```bash
python main.py
```

The service will:
- Start a FastAPI server on `http://localhost:8000`
- Check for pending songs every 60 seconds (configurable)
- Automatically process songs through the pipeline:
  1. Download original audio
  2. Separate vocals and instrumental
  3. Extract lyrics with timestamps
  4. Extract pitch data
  5. Upload all results to Supabase Storage
  6. Update database with URLs

### Manually process a specific song:
```bash
python process_song.py <song_id>
```

## API Endpoints

- `GET /` - Health check
- `GET /status` - Get processing statistics
- `GET /songs/pending` - List pending songs
- `POST /process/{song_id}` - Manually trigger processing for a song

## Processing Pipeline

```
Upload Song (Frontend)
    ↓
Database: status = 'pending'
    ↓
Background Worker (checks every 60s)
    ↓
1. Download original audio
    ↓
2. Separate vocals/instrumental (Demucs)
    ↓
3. Extract lyrics (Whisper)
    ↓
4. Extract pitch data (Librosa)
    ↓
5. Upload results to Storage
    ↓
6. Update database URLs
    ↓
Database: status = 'completed'
```

## Monitoring

Check processing status:
```bash
curl http://localhost:8000/status
```

View API docs:
```
http://localhost:8000/docs
```

## Troubleshooting

- **ModuleNotFoundError:** Run `pip install -r requirements.txt`
- **Supabase connection error:** Check `.env` file has correct credentials
- **Processing takes too long:** Songs process sequentially. Consider reducing PROCESSING_INTERVAL or running multiple workers.
