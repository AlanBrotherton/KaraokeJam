import { useState } from 'react'
import './SongUpload.css'
import logo from './assets/logo.png'

interface SongUploadProps {
  onBack: () => void
}

function SongUpload({ onBack }: SongUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [songTitle, setSongTitle] = useState('')
  const [artistName, setArtistName] = useState('')
  const [isDragging, setIsDragging] = useState(false)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Handle upload logic
    console.log('Uploading:', { selectedFile, songTitle, artistName })
    alert('Upload functionality coming soon!')
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
              disabled={!selectedFile || !songTitle || !artistName}
              className="submit-button"
            >
              Upload & Process Song
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
