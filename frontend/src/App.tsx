import './App.css'
import logo from './assets/logo.png'

function App() {
  const handleBrowseSongs = () => {
    console.log('Browse songs clicked')
    // TODO: Navigate to songs page
  }

  return (
    <div className="min-h-screen min-w-full bg-gradient-to-b from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center overflow-hidden">
      <div className="max-w-2xl w-full text-center space-y-8 px-4">
        {/* Logo */}
        <div className="animate-pulse">
          <img 
            src={logo} 
            alt="KaraokeJam Logo" 
            className="w-full max-w-md mx-auto drop-shadow-2xl"
          />
        </div>

        {/* Description */}
        <div className="bg-black/40 backdrop-blur-sm border-2 border-purple-500 rounded-lg p-8 shadow-2xl shadow-purple-500/50">
          <p className="text-xl text-gray-200 leading-relaxed font-light">
            Welcome to the ultimate karaoke experience! Get ready to unleash your inner rockstar 
            and sing your heart out. Choose from thousands of songs across all genres and decades. 
            It's time to turn up the volume and let the music take over!
          </p>
        </div>

        {/* Browse Button */}
        <button
          onClick={handleBrowseSongs}
          className="relative px-8 sm:px-12 py-5 text-2xl font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-full shadow-lg shadow-pink-500/50 hover:shadow-pink-500/80 transform hover:scale-105 transition-all duration-300 border-4 border-yellow-400 hover:border-cyan-400 overflow-hidden"
        >
          <span className="relative z-10">🎤 BROWSE SONGS 🎵</span>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        {/* Decorative elements */}
        <div className="flex justify-center gap-8 text-4xl animate-bounce overflow-hidden">
          <span>🎸</span>
          <span>🎹</span>
          <span>🎤</span>
          <span>🎵</span>
        </div>
      </div>
    </div>
  )
}

export default App
