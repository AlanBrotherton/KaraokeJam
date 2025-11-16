# KaraokeJam

KaraokeJam is an AI-powered karaoke app that turns any song into a playable karaoke experience with real-time pitch tracking and scoring. Upload your favorite tracks, and our system automatically separates vocals, extracts lyrics with word-level timing, and analyzes the melody so you can sing along and compete for high scores. It's like having a personalized karaoke arcade in your browser!

## Features
- **Custom Authentication** - Secure username/password authentication with bcrypt password hashing
- **Automated Song Processing** - AI-powered vocal separation, lyrics extraction with word-level timestamps, and pitch analysis
- **Real-time Pitch Detection** - Live microphone input analysis with WebSocket streaming
- **Smart Scoring System** - Compare your pitch to the original melody with semitone-based accuracy scoring
- **Word-Level Lyrics Sync** - Lyrics highlight word-by-word as the song plays
- **High Score Tracking** - Persistent high scores stored per song with competitive display
- **Arcade-Style UI** - Neon-themed interface with cyan, pink, and gold glow effects using Press Start 2P font
- **Song Library Management** - Upload, browse, and search your personal song collection

## Tech Stack

### Frontend
- **React 19.2.0** - Modern UI framework with hooks
- **TypeScript** - Type-safe JavaScript for robust code
- **Tailwind CSS v4** - Utility-first CSS framework for styling
- **Vite** - Lightning-fast build tool and dev server
- **Press Start 2P Font** - Retro arcade-style typography
- **bcryptjs** - Client-side password hashing for secure authentication
- **Supabase Client** - PostgreSQL database and storage integration
- **Web Audio API** - Real-time microphone capture and audio processing
  - `AudioContext` - Audio processing pipeline
  - `ScriptProcessorNode` - Audio buffer processing for pitch analysis
  - `MediaRecorder` - Microphone stream capture
- **WebSocket API** - Real-time bidirectional communication for pitch data

### Backend
- **FastAPI 0.121.2** - High-performance async Python web framework
- **Uvicorn 0.38.0** - Lightning-fast ASGI server
- **WebSockets** - Real-time audio streaming and pitch feedback
- **Supabase Python Client** - Database and storage operations

#### Audio Processing & AI
- **Demucs 4.0.1** - State-of-the-art AI vocal separation (Meta Research)
- **OpenAI Whisper** - Advanced speech-to-text with word-level timestamps
- **Librosa 0.11.0** - Audio analysis and pitch detection (YIN algorithm)
- **Pydub 0.25.1** - Audio file format conversion and manipulation
- **NumPy** - Numerical computing for audio signal processing
- **SciPy** - Scientific computing utilities

#### Data & Storage
- **Supabase** - PostgreSQL database with Row Level Security
  - User authentication and profiles
  - Song metadata with processing status
  - High score persistence
- **Supabase Storage** - Object storage for audio files and processed data
  - `songs-audio` bucket - Original and processed audio files (MP3)
  - `songs-data` bucket - Lyrics and pitch data (JSON)

## Authentication

The app uses **custom authentication** with secure password hashing:
- Users sign up with **username, password, first name, and last name**
- Users sign in with **username and password only**
- Passwords are hashed using **bcryptjs** (10 salt rounds) before storing in the database
- Sessions are stored in browser localStorage
- No email confirmation required

### Password Hashing
Passwords are never stored as plain text. When a user signs up:
1. Password is hashed using bcrypt with a salt (one-way encryption)
2. Only the hash is stored in the database
3. On login, the entered password is hashed and compared to the stored hash
4. Even database admins cannot see actual passwords

## Setup & Running

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on: `http://localhost:5173`

**Environment Variables:**
Create a `.env` file in the `frontend/` directory:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux
# On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Runs on: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

**Note:** If you encounter pip issues, upgrade pip first:
```bash
pip install --upgrade pip
```

### Database Setup

#### Supabase Configuration
1. Create a new Supabase project at https://supabase.com
2. Create two storage buckets:
   - `songs-audio` (for audio files)
   - `songs-data` (for JSON data)
3. Make both buckets public
4. Run the following SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can select users"
  ON users FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert users"
  ON users FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_users_username ON users(username);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration INTEGER,
  uploaded_by UUID REFERENCES users(id) ON DELETE CASCADE,
  original_audio_url TEXT NOT NULL,
  vocals_url TEXT,
  instrumental_url TEXT,
  pitch_data_url TEXT,
  lyrics_data_url TEXT,
  processing_status TEXT DEFAULT 'pending',
  max_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE TO public USING (true);

CREATE INDEX idx_songs_uploaded_by ON songs(uploaded_by);
CREATE INDEX idx_songs_processing_status ON songs(processing_status);
```

## How It Works

### Song Processing Pipeline
1. **Upload** - User uploads an audio file (MP3/WAV) with title and artist
2. **Vocal Separation** - Demucs AI separates vocals from instrumental (creates two tracks)
3. **Lyrics Extraction** - Whisper transcribes vocals and generates word-level timestamps
4. **Pitch Analysis** - Librosa analyzes the vocal melody and extracts pitch data at 10ms intervals
5. **Audio Conversion** - WAV files converted to MP3 (192kbps) for efficient storage
6. **Storage Upload** - All processed files uploaded to Supabase Storage
7. **Database Update** - Song record updated with URLs and processing complete status

### Real-Time Karaoke Experience
1. **Start** - 3-second countdown before playback begins
2. **Audio Sync** - Instrumental track plays while lyrics display with word-level highlighting
3. **Microphone Capture** - User's voice captured via Web Audio API (4096 sample buffer)
4. **Pitch Analysis** - Audio chunks sent via WebSocket to backend for real-time pitch detection
5. **Scoring** - User pitch compared to reference pitch during lyric segments (0.5s buffer)
   - Perfect match (<0.25 semitones): 10 points
   - Close match (<0.5 semitones): 5 points  
   - Decent match (<1.0 semitones): 2 points
6. **High Score** - Final score saved if it beats the previous record

## Project Structure
```
KaraokeJam/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with auth & routing
│   │   ├── SignIn.tsx           # Sign in/sign up page
│   │   ├── SongList.tsx         # Song library with search
│   │   ├── SongUpload.tsx       # Song upload form
│   │   ├── KaraokePage.tsx      # Karaoke player with scoring
│   │   ├── supabaseClient.ts    # Supabase configuration
│   │   ├── assets/
│   │   │   └── logo.png         # KaraokeJam logo
│   │   └── *.css                # Component styles
│   ├── .env                     # Environment variables (not in git)
│   ├── package.json
│   └── vite.config.ts
└── backend/
    ├── main.py                  # FastAPI app with WebSocket endpoint
    ├── process_song.py          # Song processing pipeline
    ├── live_pitch.py            # Real-time pitch estimation
    ├── separate_vocals.py       # Demucs vocal separation
    ├── extract_lyrics.py        # Whisper lyrics extraction
    ├── extract_pitches.py       # Librosa pitch analysis
    ├── supabase_client.py       # Supabase configuration
    ├── requirements.txt
    └── temp/                    # Temporary processing files
```

## Development Notes
- Frontend uses Tailwind CSS v4 with Vite plugin for modern styling
- Arcade theme uses Press Start 2P font with neon glow effects
- Color scheme: Cyan (#00ffff), Pink (#ff6b9d), Gold (#ffd700), Purple/Blue accents
- Python 3.12+ compatible
- WebSocket connection for real-time audio streaming (base64-encoded float32 arrays)
- Audio analysis uses Librosa YIN algorithm for pitch detection
- Scoring only active during lyric segments with 0.5s forgiveness buffer
- All audio stored as MP3 for bandwidth efficiency

## API Endpoints

### Backend (FastAPI)
- `POST /process/{song_id}` - Trigger song processing pipeline
- `WebSocket /ws/pitch` - Real-time pitch analysis
  - Accepts: `{type: 'audio', data: base64_audio, sampleRate: number}`
  - Returns: `{type: 'pitch', pitch: number|null, time: number, voiced: boolean}`

## Known Limitations
- Processing can take 1-3 minutes per song depending on length
- Best results with clear vocal tracks (minimal background noise)
- Microphone permissions required for pitch detection
- WebSocket connection requires backend to be running locally
- Max file size: 50MB (configurable in SongUpload.tsx)

## Future Enhancements
- Multi-user leaderboards per song
- Song sharing between users
- Pitch visualization graph (user vs reference over time)
- Practice mode without scoring
- Replay functionality after completion
- Mobile responsive design improvements
- Cloud deployment (replace localhost with production URLs)