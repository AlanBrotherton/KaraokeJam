import { useState } from 'react'
import './SongList.css'
import logo from './assets/logo.png'

interface Song {
  id: number
  title: string
  artist: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  duration: string
}

interface SongListProps {
  onBack: () => void
  onSongSelect: (song: Song) => void
  onUploadClick: () => void
}

function SongList({ onBack, onSongSelect, onUploadClick }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [songs] = useState<Song[]>([])

  // TODO: Fetch songs from database
  // useEffect(() => {
  //   const fetchSongs = async () => {
  //     const { data } = await supabase.from('songs').select('*')
  //     setSongs(data || [])
  //   }
  //   fetchSongs()
  // }, [setSongs])

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
          <img 
            src={logo} 
            alt="KaraokeJam Logo" 
            className="header-logo"
          />
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
          <div className="songs-grid">
            {filteredSongs.map(song => (
              <div
                key={song.id}
                onClick={() => handleSongSelect(song)}
                className="song-card"
              >
                <div className="song-card-header">
                  <div className="song-info">
                    <h3 className="song-title">
                      {song.title}
                    </h3>
                    <p className="song-artist">{song.artist}</p>
                  </div>
                </div>
                <div className="song-card-footer">
                  <span>{song.duration}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredSongs.length === 0 && (
            <div className="empty-state">
              <p className="empty-state-title">{searchQuery ? 'No songs found' : 'No songs uploaded yet'}</p>
              <p className="empty-state-subtitle">{searchQuery ? 'Try adjusting your search query' : 'Upload your first song to get started'}</p>
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
