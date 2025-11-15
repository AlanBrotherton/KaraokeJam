import { useState } from 'react'
import './SongList.css'
import logo from './assets/logo.png'

interface Song {
  id: number
  title: string
  artist: string
  genre: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  duration: string
}

// Sample song data
const sampleSongs: Song[] = [
  { id: 1, title: "Bohemian Rhapsody", artist: "Queen", genre: "Rock", difficulty: "Hard", duration: "5:55" },
  { id: 2, title: "Sweet Child O' Mine", artist: "Guns N' Roses", genre: "Rock", difficulty: "Medium", duration: "5:56" },
  { id: 3, title: "Shake It Off", artist: "Taylor Swift", genre: "Pop", difficulty: "Easy", duration: "3:39" },
  { id: 4, title: "Billie Jean", artist: "Michael Jackson", genre: "Pop", difficulty: "Medium", duration: "4:54" },
  { id: 5, title: "Rolling in the Deep", artist: "Adele", genre: "Pop", difficulty: "Medium", duration: "3:48" },
  { id: 6, title: "Don't Stop Believin'", artist: "Journey", genre: "Rock", difficulty: "Easy", duration: "4:11" },
  { id: 7, title: "Someone Like You", artist: "Adele", genre: "Ballad", difficulty: "Easy", duration: "4:45" },
  { id: 8, title: "Livin' on a Prayer", artist: "Bon Jovi", genre: "Rock", difficulty: "Medium", duration: "4:09" },
  { id: 9, title: "Uptown Funk", artist: "Bruno Mars", genre: "Funk", difficulty: "Hard", duration: "4:30" },
  { id: 10, title: "Let It Be", artist: "The Beatles", genre: "Rock", difficulty: "Easy", duration: "4:03" },
]

interface SongListProps {
  onBack: () => void
}

function SongList({ onBack }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState<string>('All')

  const genres = ['All', 'Rock', 'Pop', 'Ballad', 'Funk']

  const filteredSongs = sampleSongs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         song.artist.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === 'All' || song.genre === selectedGenre
    return matchesSearch && matchesGenre
  })

  const handleSongSelect = (song: Song) => {
    console.log('Selected song:', song)
    // TODO: Navigate to karaoke player with selected song
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

          {/* Filters */}
          <div className="filters-row">
            {/* Genre Filter */}
            <div className="filter-group">
              <span className="filter-label">Genre:</span>
              {genres.map(genre => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`filter-button ${selectedGenre === genre ? 'active' : ''}`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
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
                  <span>{song.genre}</span>
                  <span>{song.duration}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredSongs.length === 0 && (
            <div className="empty-state">
              <p className="empty-state-title">No songs found</p>
              <p className="empty-state-subtitle">Try adjusting your filters or search query</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SongList
