import { useState, useEffect } from 'react'
import './SongList.css'
import logo from './assets/logo.png'
import { supabase } from './supabaseClient'

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

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
}

interface SongListProps {
  onBack: () => void
  onSongSelect: (song: Song) => void
  onUploadClick: () => void
  user: User
}

function SongList({ onBack, onSongSelect, onUploadClick, user }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  const handleSignOut = () => {
    localStorage.removeItem('user')
    window.location.reload()
  }

  useEffect(() => {
    const fetchSongs = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching songs:', error)
      } else {
        setSongs(data || [])
      }
      setLoading(false)
    }
    fetchSongs()
  }, [user.id])

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleSongSelect = (song: Song) => {
    onSongSelect(song)
  }

  const handleBackHome = () => {
    onBack()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="song-list-container">
      {/* Header */}
      <div className="song-list-header">
        <div className="song-list-header-content">
          <button
            onClick={handleBackHome}
            className="back-button"
          >
            ← Back
          </button>
          <h1 className="song-list-title">
            Song Library
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={handleSignOut}
              className="back-button"
            >
              Sign Out
            </button>
            <img 
              src={logo} 
              alt="KaraokeJam Logo" 
              className="header-logo"
            />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters-section">
        <div className="search-filters-content">
          {/* Search Bar */}
          <input
            type="text"
            placeholder="SEARCH SONGS OR ARTISTS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />


        </div>
      </div>

      {/* Song List */}
      <div className="songs-grid-section">
        <div className="songs-grid-content">
          {loading ? (
            <p className="empty-message">Loading songs...</p>
          ) : filteredSongs.length === 0 ? (
            <p className="empty-message">
              {searchQuery ? 'No songs match your search.' : 'No songs uploaded yet. Click "Upload Song" to add your first song!'}
            </p>
          ) : (
            <div className="songs-grid">
              {filteredSongs.map(song => {
                const isProcessing = song.processing_status !== 'completed'
                return (
                  <div
                    key={song.id}
                    onClick={() => !isProcessing && handleSongSelect(song)}
                    className="song-card"
                    style={{
                      opacity: isProcessing ? 0.6 : 1,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      filter: isProcessing ? 'grayscale(0.5)' : 'none'
                    }}
                  >
                    <div className="song-card-header">
                      <div className="song-info">
                        <h3 className="song-title">
                          {song.title}
                        </h3>
                        <p className="song-artist">{song.artist}</p>
                        {isProcessing && (
                          <p style={{
                            fontSize: '12px',
                            color: '#ff6b9d',
                            marginTop: '5px',
                            fontWeight: 'bold'
                          }}>
                            ⏳ Processing...
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="song-card-footer">
                      <span>⏱️ {formatDuration(song.duration)}</span>
                      <span>🏆 {song.max_score ? `${song.max_score} pts` : 'Not played'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Button */}
      <div className="upload-button-section">
        <button
          onClick={onUploadClick}
          className="upload-button"
        >
          + Upload Song
        </button>
      </div>
    </div>
  )
}

export default SongList
