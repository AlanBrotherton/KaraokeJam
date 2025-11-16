import { useState, useEffect, useRef } from 'react'
import './KaraokePage.css'
import { supabase } from './supabaseClient'

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
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [showFinalScore, setShowFinalScore] = useState(false)
  const [isNewHighScore, setIsNewHighScore] = useState(false)
  const [currentHighScore, setCurrentHighScore] = useState<number>(0)
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
          // Check if we're currently in a lyric segment (with 0.5s buffer before and after)
          const buffer = 0.5
          const currentSegment = lyrics.find(
            seg => currentTime >= (seg.start - buffer) && currentTime <= (seg.end + buffer)
          )
          
          // Only score during lyric segments (with buffer)
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

  const handleStop = async () => {
    stopRecording()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsStarted(false)
    setCountdown(null)
    setCurrentTime(0)
    setUserPitch(null)
    
    // Update max_score in database if this score is higher
    if (score > 0) {
      try {
        const { data: currentSong } = await supabase
          .from('songs')
          .select('max_score')
          .eq('id', song.id)
          .single()
        
        const currentMaxScore = currentSong?.max_score || 0
        setCurrentHighScore(currentMaxScore)
        
        if (score > currentMaxScore) {
          await supabase
            .from('songs')
            .update({ max_score: score })
            .eq('id', song.id)
          setIsNewHighScore(true)
        } else {
          setIsNewHighScore(false)
        }
      } catch (err) {
        console.error('Error updating max score:', err)
      }
    }
    
    // Show final score screen
    setFinalScore(score)
    setShowFinalScore(true)
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

  // Final Score Screen
  if (showFinalScore) {
    return (
      <div className="karaoke-container">
        <div className="karaoke-main" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: '40px'
        }}>
          {isNewHighScore && (
            <div style={{
              fontSize: '36px',
              fontFamily: 'Press Start 2P, monospace',
              color: '#ffd700',
              textShadow: '0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 60px #ffd700',
              letterSpacing: '3px',
              marginBottom: '30px',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              NEW HIGH SCORE!
            </div>
          )}
          <div style={{
            fontSize: '48px',
            fontFamily: 'Press Start 2P, monospace',
            color: '#ff6b9d',
            textShadow: '0 0 20px #ff6b9d, 0 0 40px #ff6b9d, 0 0 60px #ff6b9d',
            letterSpacing: '4px',
            marginBottom: '20px'
          }}>
            FINAL SCORE
          </div>
          <div style={{
            fontSize: '96px',
            fontFamily: 'Press Start 2P, monospace',
            color: '#00ffff',
            textShadow: '0 0 30px #00ffff, 0 0 60px #00ffff, 0 0 90px #00ffff',
            lineHeight: '1.2'
          }}>
            {finalScore}
          </div>
          <div style={{
            fontSize: '24px',
            fontFamily: 'Press Start 2P, monospace',
            color: '#00ffff',
            textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff',
            marginTop: '10px'
          }}>
            POINTS
          </div>
          {!isNewHighScore && (
            <div style={{
              fontSize: '24px',
              fontFamily: 'Press Start 2P, monospace',
              color: '#ffd700',
              textShadow: '0 0 10px #ffd700',
              marginTop: '30px'
            }}>
              HIGH SCORE: {currentHighScore}
            </div>
          )}
          <button
            onClick={onBack}
            style={{
              marginTop: '60px',
              padding: '20px 60px',
              fontSize: '24px',
              fontFamily: 'Press Start 2P, monospace',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: '3px solid #00ffff',
              borderRadius: '12px',
              color: '#ffffff',
              cursor: 'pointer',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
              boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)'
            }}
          >
            BACK
          </button>
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

      {/* High Score Display */}
      {song.max_score && song.max_score > 0 && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid #ffd700',
          borderRadius: '8px',
          padding: '10px 20px',
          zIndex: 1000
        }}>
          <div style={{
            fontSize: '12px',
            fontFamily: 'Press Start 2P, monospace',
            color: '#ffd700',
            textShadow: '0 0 10px #ffd700',
            marginBottom: '5px',
            textAlign: 'center'
          }}>
            HIGH SCORE
          </div>
          <div style={{
            fontSize: '20px',
            fontFamily: 'Press Start 2P, monospace',
            color: '#ffd700',
            textShadow: '0 0 15px #ffd700, 0 0 30px #ffd700',
            textAlign: 'center'
          }}>
            {song.max_score}
          </div>
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

        {/* Video/Visualizer Area with Pitch and Score */}
        <div className="visualizer-area">
          {/* Pitch Display (Left) */}
          {isStarted && countdown === null && (
            <div style={{
              position: 'absolute',
              left: '10%',
              top: '50%',
              transform: 'translateY(-50%)',
              textAlign: 'center',
              zIndex: 10
            }}>
              <div style={{
                fontSize: '18px',
                fontFamily: 'Press Start 2P, monospace',
                color: '#ff6b9d',
                marginBottom: '15px',
                textShadow: '0 0 10px #ff6b9d, 0 0 20px #ff6b9d',
                letterSpacing: '2px'
              }}>
                PITCH
              </div>
              <div style={{
                fontSize: '48px',
                fontFamily: 'Press Start 2P, monospace',
                color: userPitch ? '#00ffff' : '#444',
                textShadow: userPitch ? '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff' : 'none',
                transition: 'all 0.2s ease',
                lineHeight: '1.2'
              }}>
                {userPitch ? `${Math.round(userPitch)}` : '---'}
              </div>
              <div style={{
                fontSize: '14px',
                fontFamily: 'Press Start 2P, monospace',
                color: userPitch ? '#00ffff' : '#444',
                marginTop: '10px',
                textShadow: userPitch ? '0 0 10px #00ffff' : 'none'
              }}>
                Hz
              </div>
            </div>
          )}

          {/* Center Visualizer */}
          <div className="visualizer-placeholder">
            <div className="pulse-circle"></div>
            <div className="pulse-circle pulse-2"></div>
            <div className="pulse-circle pulse-3"></div>
          </div>

          {/* Score Display (Right) */}
          {isStarted && countdown === null && (
            <div style={{
              position: 'absolute',
              right: '10%',
              top: '50%',
              transform: 'translateY(-50%)',
              textAlign: 'center',
              zIndex: 10
            }}>
              <div style={{
                fontSize: '18px',
                fontFamily: 'Press Start 2P, monospace',
                color: '#ff6b9d',
                marginBottom: '15px',
                textShadow: '0 0 10px #ff6b9d, 0 0 20px #ff6b9d',
                letterSpacing: '2px'
              }}>
                SCORE
              </div>
              <div style={{
                fontSize: '48px',
                fontFamily: 'Press Start 2P, monospace',
                color: '#00ffff',
                textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff',
                transition: 'all 0.2s ease',
                lineHeight: '1.2'
              }}>
                {score}
              </div>
              <div style={{
                fontSize: '14px',
                fontFamily: 'Press Start 2P, monospace',
                color: '#00ffff',
                marginTop: '10px',
                textShadow: '0 0 10px #00ffff'
              }}>
                PTS
              </div>
            </div>
          )}
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
