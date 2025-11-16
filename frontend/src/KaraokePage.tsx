import { useState, useEffect, useRef } from 'react'
import './KaraokePage.css'

interface LyricWord {
  word: string
  start: number
  end: number
  probability?: number
}

interface LyricSegment {
  start: number
  end: number
  text: string
  words?: LyricWord[]
}

interface Song {
  id: string
  title: string
  artist: string
  duration: number | null
  uploaded_by: string
  original_audio_url: string
  vocals_url: string | null
  instrumental_url: string | null
  pitch_data_url: string | null
  lyrics_data_url: string | null
  processing_status: string
  max_score: number | null
  created_at: string
  updated_at: string
}

interface KaraokePageProps {
  song: Song
  onBack: () => void
}

function KaraokePage({ song, onBack }: KaraokePageProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [lyrics, setLyrics] = useState<LyricSegment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [userPitch, setUserPitch] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [referencePitches, setReferencePitches] = useState<number[]>([])
  const [referenceTimes, setReferenceTimes] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Load lyrics data
  useEffect(() => {
    const loadLyrics = async () => {
      if (!song.lyrics_data_url) {
        setError('Lyrics not available for this song')
        setIsLoading(false)
        return
      }

      try {
        console.log('Loading lyrics from:', song.lyrics_data_url)
        const response = await fetch(song.lyrics_data_url)
        if (!response.ok) throw new Error('Failed to load lyrics')
        const data = await response.json()
        console.log('Lyrics data loaded:', data)
        
        // Convert Whisper format to our format (keeping word timestamps)
        const segments: LyricSegment[] = data.segments.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
          words: seg.words || []
        }))
        
        console.log('Processed segments:', segments.length)
        setLyrics(segments)
        setIsLoading(false)
      } catch (err: any) {
        console.error('Error loading lyrics:', err)
        setError('Failed to load lyrics')
        setIsLoading(false)
      }
    }

    loadLyrics()
  }, [song.lyrics_data_url])

  // Load reference pitch data
  useEffect(() => {
    const loadPitchData = async () => {
      if (!song.pitch_data_url) {
        console.warn('No pitch data URL available')
        return
      }

      try {
        console.log('Loading pitch data from:', song.pitch_data_url)
        const response = await fetch(song.pitch_data_url)
        if (!response.ok) throw new Error('Failed to load pitch data')
        const data = await response.json()
        
        console.log('Pitch data loaded:', data.pitches.length, 'frames')
        setReferencePitches(data.pitches)
        setReferenceTimes(data.times)
      } catch (err: any) {
        console.error('Error loading pitch data:', err)
      }
    }

    loadPitchData()
  }, [song.pitch_data_url])

  // Setup WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/pitch')
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'pitch') {
        setUserPitch(data.pitch)
        
        // Compare with reference pitch and update score (only during lyrics)
        if (data.pitch && referencePitches.length > 0 && currentTime > 0 && lyrics.length > 0) {
          // Check if we're currently in a lyric segment
          const currentSegment = lyrics.find(
            seg => currentTime >= seg.start && currentTime <= seg.end
          )
          
          // Only score during lyric segments
          if (currentSegment) {
            // Find closest reference pitch at current time
            const closestIdx = referenceTimes.findIndex((t, idx) => 
              idx === referenceTimes.length - 1 || 
              (t <= currentTime && referenceTimes[idx + 1] > currentTime)
            )
            
            if (closestIdx !== -1) {
              const refPitch = referencePitches[closestIdx]
              
              if (refPitch && refPitch > 0) {
                // Calculate pitch accuracy (within semitone = good)
                const semitoneRatio = Math.abs(12 * Math.log2(data.pitch / refPitch))
                
                // Award points: 10 for perfect, 5 for within 0.5 semitone, 2 for within 1 semitone
                if (semitoneRatio < 0.25) {
                  setScore(prev => prev + 10)
                } else if (semitoneRatio < 0.5) {
                  setScore(prev => prev + 5)
                } else if (semitoneRatio < 1.0) {
                  setScore(prev => prev + 2)
                }
              }
            }
          }
        }
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
    
    wsRef.current = ws
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [currentTime, referencePitches, referenceTimes, lyrics])

  // Update current time from audio playback
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      console.log('Audio loaded, duration:', audio.duration)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isStarted])

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCountdown(null)
      // Start audio playback and recording simultaneously
      startRecording()
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error('Error playing audio:', err)
          setError('Failed to play audio')
        })
      }
    }
  }, [countdown])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Create AudioContext for processing
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        
        // Send audio chunk to WebSocket for pitch analysis
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const audioArray = new Float32Array(inputData)
          const base64Audio = btoa(
            String.fromCharCode(...new Uint8Array(audioArray.buffer))
          )
          
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Audio,
            sampleRate: audioContext.sampleRate
          }))
        }
      }
      
      source.connect(processor)
      processor.connect(audioContext.destination)
      
      // Store for cleanup
      mediaRecorderRef.current = { stream, processor, source } as any
      
      console.log('Recording started')
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (mediaRecorderRef.current) {
      const { stream } = mediaRecorderRef.current as any
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
    }
    console.log('Recording stopped')
  }

  const handleStart = () => {
    if (!song.instrumental_url) {
      setError('Instrumental not available for this song')
      return
    }
    setIsStarted(true)
    setCountdown(3)
  }

  const handleStop = () => {
    stopRecording()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsStarted(false)
    setCountdown(null)
    setCurrentTime(0)
    setUserPitch(null)
    
    // Show final score
    if (score > 0) {
      alert(`Final Score: ${score} points!`)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Find current segment and render with highlighted words
  const renderLyrics = () => {
    if (lyrics.length === 0) return <span>♪</span>
    
    // Find current segment
    const currentSegment = lyrics.find(
      seg => currentTime >= seg.start && currentTime <= seg.end
    )
    
    if (!currentSegment) return <span>♪</span>
    
    // If no word timestamps, show plain text
    if (!currentSegment.words || currentSegment.words.length === 0) {
      return <span>{currentSegment.text}</span>
    }
    
    // Render words with highlighting
    return (
      <span>
        {currentSegment.words.map((word, idx) => {
          const isActive = currentTime >= word.start && currentTime <= word.end
          return (
            <span
              key={idx}
              style={{
                color: isActive ? '#00ffff' : '#ffffff',
                fontWeight: isActive ? 'bold' : 'normal',
                textShadow: isActive ? '0 0 20px #00ffff, 0 0 40px #00ffff' : 'none',
                transition: 'all 0.1s ease',
                marginRight: '0.3em'
              }}
            >
              {word.word}
            </span>
          )
        })}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="karaoke-container">
        <div className="karaoke-main">
          <div className="lyrics-container">
            <div className="lyrics-placeholder">Loading karaoke data...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !song.instrumental_url) {
    return (
      <div className="karaoke-container">
        <div className="karaoke-header">
          <div className="karaoke-header-content">
            <button onClick={onBack} className="karaoke-back-button">← Back</button>
            <div className="song-info-header">
              <h2 className="karaoke-song-title">{song.title}</h2>
              <p className="karaoke-song-artist">{song.artist}</p>
            </div>
          </div>
        </div>
        <div className="karaoke-main">
          <div className="lyrics-container">
            <div className="lyrics-placeholder" style={{ color: '#ff6b9d' }}>
              {error || 'This song is still processing. Please try again later.'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="karaoke-container">
      {/* Hidden Audio Element */}
      {song.instrumental_url && (
        <audio
          ref={audioRef}
          src={song.instrumental_url}
          preload="auto"
          onEnded={handleStop}
          onError={(e) => {
            console.error('Audio error:', e)
            setError('Failed to load audio')
          }}
        />
      )}

      {/* Header */}
      <div className="karaoke-header">
        <div className="karaoke-header-content">
          <button
            onClick={onBack}
            className="karaoke-back-button"
          >
            ← Exit
          </button>
          <div className="song-info-header">
            <h2 className="karaoke-song-title">{song.title}</h2>
            <p className="karaoke-song-artist">{song.artist}</p>
          </div>
          <div className="timer-display">{formatTime(currentTime)}</div>
        </div>
      </div>

      {/* Pitch Display (Debug) */}
      {isStarted && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: userPitch ? '#00ffff' : '#888',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '1px solid ' + (userPitch ? '#00ffff' : '#333'),
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 1000
        }}>
          Your Pitch: {userPitch ? `${Math.round(userPitch)} Hz` : 'Not detected'}
          <br />
          Score: {score} pts
        </div>
      )}

      {/* Main Karaoke Area */}
      <div className="karaoke-main">
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {/* Video/Visualizer Area */}
        <div className="visualizer-area">
          <div className="visualizer-placeholder">
            <div className="pulse-circle"></div>
            <div className="pulse-circle pulse-2"></div>
            <div className="pulse-circle pulse-3"></div>
          </div>
        </div>

        {/* Lyrics Display */}
        <div className="lyrics-container">
          {error && isStarted ? (
            <div className="lyrics-text" style={{ color: '#ff6b9d' }}>{error}</div>
          ) : isStarted && countdown === null ? (
            <div className="lyrics-text">{renderLyrics()}</div>
          ) : !isStarted ? (
            <div className="lyrics-placeholder">Press START to begin</div>
          ) : null}
        </div>
      </div>

      {/* Controls */}
      <div className="karaoke-controls">
        <div className="karaoke-controls-content">
          {!isStarted ? (
            <button
              onClick={handleStart}
              className="control-button start-button"
            >
              START
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="control-button stop-button"
            >
              STOP
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default KaraokePage
