import './App.css'
import logo from './assets/logo.png'
import { useState, useEffect } from 'react'
import SongList from './SongList'
import KaraokePage from './KaraokePage'
import SongUpload from './SongUpload'
import SignIn from './SignIn'
import { supabase } from './supabaseClient'
import bcrypt from 'bcryptjs'

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
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

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'songs' | 'karaoke' | 'upload'>('home')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session in localStorage
    const sessionUser = localStorage.getItem('user')
    if (sessionUser) {
      setUser(JSON.parse(sessionUser))
    }
    setLoading(false)
  }, [])

  const handleBrowseSongs = () => {
    console.log('Browse songs clicked')
    setCurrentPage('songs')
  }

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song)
    setCurrentPage('karaoke')
  }

  const handleSignIn = async (username: string, password: string) => {
    // Query user from database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !data) {
      throw new Error('Invalid username or password')
    }

    // Verify password
    const isValid = await bcrypt.compare(password, data.password_hash)
    if (!isValid) {
      throw new Error('Invalid username or password')
    }

    // Store user session
    const userSession: User = {
      id: data.id,
      username: data.username,
      first_name: data.first_name,
      last_name: data.last_name,
    }
    localStorage.setItem('user', JSON.stringify(userSession))
    setUser(userSession)
  }

  const handleSignUp = async (username: string, password: string, firstName: string, lastName: string) => {
    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      throw new Error('Username already taken')
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to create account: ${error.message}`)
    }

    if (!data) {
      throw new Error('Failed to create account: No data returned')
    }

    // Store user session
    const userSession: User = {
      id: data.id,
      username: data.username,
      first_name: data.first_name,
      last_name: data.last_name,
    }
    localStorage.setItem('user', JSON.stringify(userSession))
    setUser(userSession)
  }

  const handleSignOut = async () => {
    localStorage.removeItem('user')
    setUser(null)
    setCurrentPage('home')
  }

  // Show loading state
  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <p className="text-purple-500 text-2xl uppercase tracking-wider">Loading...</p>
      </div>
    )
  }

  // Show sign in if not authenticated
  if (!user) {
    return <SignIn onSignIn={handleSignIn} onSignUp={handleSignUp} />
  }

  if (currentPage === 'songs') {
    return <SongList 
      onBack={() => setCurrentPage('home')} 
      onSongSelect={handleSongSelect}
      onUploadClick={() => setCurrentPage('upload')}
      user={user}
    />
  }

  if (currentPage === 'upload') {
    return <SongUpload onBack={() => setCurrentPage('songs')} user={user} />
  }

  if (currentPage === 'karaoke' && selectedSong) {
    return <KaraokePage song={selectedSong} onBack={() => setCurrentPage('songs')} />
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="back-button"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
      >
        Sign Out
      </button>

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
            Welcome {user.first_name} {user.last_name}! Upload your songs and sing your heart out.
          </p>
        </div>

        {/* Browse Button */}
        <button
          onClick={handleBrowseSongs}
          className="px-20 py-7 text-2xl font-bold text-black bg-purple-500 rounded border-4 border-purple-400 hover:bg-blue-500 hover:border-blue-400 transition-all uppercase tracking-wider shadow-[0_0_24px_rgba(168,85,247,0.7)] hover:shadow-[0_0_36px_rgba(59,130,246,0.9)]"
          style={{ marginTop: '40px', minWidth: '320px' }}
        >
          Song Library
        </button>
      </div>
    </div>
  )
}

export default App
