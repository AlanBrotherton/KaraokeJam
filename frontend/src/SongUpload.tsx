import { useState } from 'react'
import './SongUpload.css'
import logo from './assets/logo.png'
import { supabase } from './supabaseClient'

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
}

interface SongUploadProps {
  onBack: () => void
  user: User
}

function SongUpload({ onBack, user }: SongUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [songTitle, setSongTitle] = useState('')
  const [artistName, setArtistName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith('audio/')) {
      setSelectedFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    setError('')

    try {
      // Calculate duration first
      const audio = new Audio(URL.createObjectURL(selectedFile))
      await new Promise((resolve) => {
        audio.onloadedmetadata = resolve
      })
      const duration = Math.floor(audio.duration)

      // Generate UUID for song ID
      const songId = crypto.randomUUID()

      // Upload file to Supabase storage first
      const fileExt = selectedFile.name.split('.').pop()
      const filePath = `${songId}/original.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('songs-audio')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('songs-audio')
        .getPublicUrl(filePath)

      // Insert song record with all data including URL
      const { data: song, error: dbError } = await supabase
        .from('songs')
        .insert({
          id: songId,
          title: songTitle,
          artist: artistName,
          duration: duration,
          uploaded_by: user.id,
          original_audio_url: urlData.publicUrl,
          processing_status: 'pending'
        })
        .select()
        .single()

      if (dbError || !song) throw dbError || new Error('Failed to create song record')

      // Trigger backend processing immediately
      try {
        await fetch(`http://localhost:8000/process/${songId}`, {
          method: 'POST'
        })
      } catch (processError) {
        console.warn('Failed to trigger processing:', processError)
        // Don't fail the upload if processing trigger fails
      }

      // Success!
      alert('Song uploaded successfully! Processing has started.')
      onBack()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload song')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="song-upload-container">
      {/* Header */}
      <div className="song-upload-header">
        <div className="song-upload-header-content">
          <button
            onClick={onBack}
            className="back-button"
          >
            ← Back
          </button>
          <h1 className="song-upload-title">
            Upload Song
          </h1>
          <img 
            src={logo} 
            alt="KaraokeJam Logo" 
            className="header-logo"
          />
        </div>
      </div>

      {/* Upload Form */}
      <div className="upload-form-section">
        <div className="upload-form-content">
          <form onSubmit={handleSubmit} className="upload-form">
            
            {/* File Upload Area */}
            <div
              className={`file-upload-area ${isDragging ? 'dragging' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <>
                  <div className="upload-icon">🎵</div>
                  <p className="upload-text">Drag & Drop your MP3 file here</p>
                  <p className="upload-subtext">or</p>
                  <label htmlFor="file-input" className="browse-button">
                    Browse Files
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav"
                    onChange={handleFileSelect}
                    className="file-input-hidden"
                  />
                  <p className="upload-info">Supported formats: MP3, WAV (Max 50MB)</p>
                </>
              ) : (
                <>
                  <div className="file-selected-icon">✓</div>
                  <p className="file-selected-name">{selectedFile.name}</p>
                  <p className="file-selected-size">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="remove-file-button"
                  >
                    Remove File
                  </button>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message" style={{ 
                color: '#ef4444', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid #ef4444',
                padding: '12px',
                borderRadius: '4px',
                marginTop: '16px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Song Details */}
            <div className="form-fields">
              <div className="form-field">
                <label className="form-label">Song Title *</label>
                <input
                  type="text"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  required
                  className="form-input"
                  placeholder="ENTER SONG TITLE"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Artist Name *</label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                  className="form-input"
                  placeholder="ENTER ARTIST NAME"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedFile || !songTitle || !artistName || uploading}
              className="submit-button"
            >
              {uploading ? 'Uploading...' : 'Upload & Process Song'}
            </button>

            <p className="processing-note">
              * Processing may take 2-4 minutes (vocal separation, lyrics generation, analysis)
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SongUpload
