import './App.css'
import logo from './assets/logo.png'
import { useState } from 'react'
import SongList from './SongList'

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'songs'>('home')

  const handleBrowseSongs = () => {
    console.log('Browse songs clicked')
    setCurrentPage('songs')
  }

  if (currentPage === 'songs') {
    return <SongList onBack={() => setCurrentPage('home')} />
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="max-w-3xl w-full text-center space-y-16 px-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={logo} 
            alt="KaraokeJam Logo" 
            className="w-full max-w-lg h-auto drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]"
          />
        </div>

        {/* Description */}
        <div className="w-full flex justify-center">
          <p className="text-lg text-blue-400 leading-relaxed uppercase tracking-wider text-center">
            Choose from thousands of songs and sing your heart out.
          </p>
        </div>

        {/* Browse Button */}
        <button
          onClick={handleBrowseSongs}
          className="px-12 py-4 text-lg font-bold text-black bg-purple-500 rounded border-4 border-purple-400 hover:bg-blue-500 hover:border-blue-400 transition-all uppercase tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.6)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)]"
          style={{ marginTop: '40px' }}
        >
          Browse Songs
        </button>
      </div>
    </div>
  )
}

export default App
