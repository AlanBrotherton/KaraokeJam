# KaraokeJam

A karaoke application with real-time pitch detection and scoring. Features an arcade-style neon interface with purple and blue theme.

## Features
- Username/password authentication with secure password hashing
- Browse song library with search functionality
- Real-time karaoke playback with synchronized lyrics
- Audio analysis for pitch, frequency, and timing comparison
- Performance scoring system
- Arcade-style UI with neon effects

## Tech Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Orbitron Font** - Arcade-style typography
- **bcryptjs** - Password hashing for secure authentication
- **Supabase** - Database for user data and songs

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **Librosa** - Audio analysis and pitch detection
- **NumPy/SciPy** - Scientific computing
- **Scikit-learn** - Machine learning for audio features
- **Demucs** - AI-powered vocal separation
- **OpenAI Whisper** - Speech-to-text with timestamps
- **WebSockets** - Real-time audio streaming
- **Pydub** - Audio file manipulation
- **FastDTW** - Dynamic time warping for timing comparison
- **Pydantic** - Data validation

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
Run this SQL in your Supabase SQL Editor to create the users table:
```sql
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
```

## Project Structure
```
KaraokeJam/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with auth & routing
│   │   ├── SignIn.tsx           # Authentication page
│   │   ├── SongList.tsx         # Song browser
│   │   ├── SongUpload.tsx       # Song upload page
│   │   ├── KaraokePage.tsx      # Karaoke player
│   │   ├── supabaseClient.ts    # Supabase configuration
│   │   └── *.css                # Component styles
│   ├── .env                     # Environment variables (not in git)
│   ├── .env.example             # Template for environment variables
│   └── package.json
└── backend/
    ├── database/
    │   └── profiles_schema.sql  # Database schema
    ├── main.py                  # FastAPI app
    └── requirements.txt
```

## Development Notes
- Frontend uses Tailwind CSS v4 with Vite plugin
- Arcade theme uses Orbitron font family
- Color scheme: Neon purple (#a855f7) and neon blue (#3b82f6)
- Python 3.12+ compatible
- Uses WebSockets for real-time audio streaming
- Audio analysis powered by Librosa and NumPy

## Planned Features
- User song uploads with automatic vocal separation
- LRC file generation from audio (speech-to-text with timestamps)
- Real-time pitch detection and scoring
- Performance history tracking
- Supabase integration for song and user data storage