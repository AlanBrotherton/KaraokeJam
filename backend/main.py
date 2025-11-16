"""
FastAPI Backend Service with Background Song Processing
"""
import os
import asyncio
import json
import base64
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import numpy as np
from supabase_client import supabase
from process_song import SongProcessor
from live_pitch import estimate_pitch_for_buffer

# Load environment variables
load_dotenv()

PROCESSING_INTERVAL = int(os.getenv("PROCESSING_INTERVAL", "60"))
TEMP_DIR = os.getenv("TEMP_DIR", "./temp")

# Global processor instance
processor = SongProcessor(temp_dir=TEMP_DIR)

# Create FastAPI app
app = FastAPI(
    title="KaraokeJam Processing Service",
    description="API service for processing uploaded songs",
    version="1.0.0"
)

# Startup message
@app.on_event("startup")
async def startup_event():
    print("\n🚀 Starting KaraokeJam Processing Service")
    print(f"📁 Temp directory: {TEMP_DIR}\n")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "KaraokeJam Processing Service",
        "status": "running"
    }


@app.get("/status")
async def status():
    """Get processing status"""
    try:
        # Count songs by status
        response = supabase.table('songs').select('processing_status').execute()
        songs = response.data
        
        status_counts = {
            'pending': 0,
            'processing': 0,
            'completed': 0,
            'failed': 0
        }
        
        for song in songs:
            status = song.get('processing_status', 'pending')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return {
            "songs": status_counts,
            "total": len(songs)
        }
    except Exception as e:
        return {
            "error": str(e)
        }


@app.post("/process/{song_id}")
async def process_song_manual(song_id: str, background_tasks: BackgroundTasks):
    """Manually trigger processing for a specific song"""
    def process():
        processor.process_song(song_id)
    
    background_tasks.add_task(process)
    
    return {
        "message": f"Processing started for song {song_id}",
        "song_id": song_id
    }


@app.get("/songs/pending")
async def get_pending_songs():
    """Get list of pending songs"""
    try:
        response = supabase.table('songs').select('id, title, artist, created_at').eq('processing_status', 'pending').execute()
        return {
            "pending_songs": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        return {
            "error": str(e)
        }


@app.websocket("/ws/pitch")
async def websocket_pitch(websocket: WebSocket):
    """WebSocket endpoint for real-time pitch analysis"""
    await websocket.accept()
    print("🎤 WebSocket client connected")
    
    try:
        while True:
            # Receive audio data from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "audio":
                # Decode base64 audio data
                audio_b64 = message.get("data")
                sample_rate = message.get("sampleRate", 48000)
                
                # Decode base64 to bytes, then to float32 array
                audio_bytes = base64.b64decode(audio_b64)
                audio_array = np.frombuffer(audio_bytes, dtype=np.float32)
                
                # Estimate pitch
                pitch_result = estimate_pitch_for_buffer(
                    audio_array,
                    sample_rate=sample_rate,
                    fmin=80.0,
                    fmax=800.0
                )
                
                # Send pitch back to client
                await websocket.send_json({
                    "type": "pitch",
                    "pitch": pitch_result["pitch"],
                    "time": pitch_result["time"],
                    "voiced": pitch_result["voiced"]
                })
            
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        print("🎤 WebSocket client disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
