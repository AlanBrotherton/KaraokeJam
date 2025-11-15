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
- **Librosa** - Audio analysis and pitch detection
- **NumPy/SciPy** - Scientific computing
- **WebSockets** - Real-time audio streaming
- **Pydub** - Audio processing

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
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Runs on: `http://localhost:8000`

API Docs: `http://localhost:8000/docs`

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