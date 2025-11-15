import { useState, useEffect } from 'react'
import './KaraokePage.css'

interface Song {
  id: number
  title: string
  artist: string
  duration: string
}

interface KaraokePageProps {
  song: Song
  onBack: () => void
}

function KaraokePage({ song, onBack }: KaraokePageProps) {
  const [isStarted, setIsStarted] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCountdown(null)
      // Start the actual karaoke
    }
  }, [countdown])

  useEffect(() => {
    if (isStarted && countdown === null) {
      const timer = setInterval(() => {
        setCurrentTime(prev => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isStarted, countdown])

  const handleStart = () => {
    setIsStarted(true)
    setCountdown(3)
  }

  const handleStop = () => {
    setIsStarted(false)
    setCountdown(null)
    setCurrentTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Mock lyrics with timing
  const lyrics = [
    { time: 0, text: "Welcome to KaraokeJam!" },
    { time: 5, text: "Get ready to sing..." },
    { time: 10, text: "This is a mock karaoke experience" },
    { time: 15, text: "Lyrics would appear here in sync" },
    { time: 20, text: "With the music playing" },
    { time: 25, text: "Keep singing!" },
    { time: 30, text: "You're doing great!" },
  ]

  const currentLyric = lyrics.filter(l => l.time <= currentTime).pop()?.text || "..."

  return (
    <div className="karaoke-container">
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
          {isStarted && countdown === null ? (
            <div className="lyrics-text">{currentLyric}</div>
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
