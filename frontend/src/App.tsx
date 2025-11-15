import './App.css'
import logo from './assets/logo.png'
import { useState, useEffect } from 'react'
import SongList from './SongList'
import KaraokePage from './KaraokePage'
import SongUpload from './SongUpload'
import SignIn from './SignIn'
import { supabase } from './supabaseClient'
import type { User } from '@supabase/supabase-js'

interface Song {
  id: number
  title: string
  artist: string
  duration: string
}

function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'songs' | 'karaoke' | 'upload'>('home')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleBrowseSongs = () => {
    console.log('Browse songs clicked')
    setCurrentPage('songs')
  }

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song)
    setCurrentPage('karaoke')
  }

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    })
    if (error) throw error

    // Create profile in database
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
      })
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
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
    />
  }

  if (currentPage === 'upload') {
    return <SongUpload onBack={() => setCurrentPage('songs')} />
  }

  if (currentPage === 'karaoke' && selectedSong) {
    return <KaraokePage song={selectedSong} onBack={() => setCurrentPage('songs')} />
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden relative">
      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="absolute top-6 right-6 px-6 py-2 text-sm font-bold text-blue-400 bg-transparent border-2 border-blue-400 hover:bg-blue-400 hover:text-black transition-all uppercase tracking-wider"
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
            Welcome {user.email}! Upload your songs and sing your heart out.
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
