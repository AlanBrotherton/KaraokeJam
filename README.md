# KaraokeJam

A karaoke application with real-time pitch detection and scoring. Features an arcade-style neon interface with purple and blue theme.

## Features
- Browse song library with search and genre filters
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

## Setup & Running

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on: `http://localhost:5173`

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

## Project Structure
```
KaraokeJam/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with routing
│   │   ├── SongList.tsx         # Song browser
│   │   ├── KaraokePage.tsx      # Karaoke player
│   │   ├── App.css              # Global styles
│   │   ├── SongList.css         # Song list styles
│   │   └── KaraokePage.css      # Karaoke player styles
│   └── package.json
└── backend/
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