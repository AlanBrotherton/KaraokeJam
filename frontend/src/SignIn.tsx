import { useState } from 'react'
import './SignIn.css'
import logo from './assets/logo.png'

interface SignInProps {
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
}

function SignIn({ onSignIn, onSignUp }: SignInProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await onSignUp(email, password, firstName, lastName)
      } else {
        await onSignIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setLastName('')
  }

  return (
    <div className="signin-container">
      <div className="signin-content">
        {/* Logo */}
        <div className="signin-logo-container">
          <img 
            src={logo} 
            alt="KaraokeJam Logo" 
            className="signin-logo"
          />
        </div>

        {/* Sign In Form */}
        <div className="signin-form-card">
          <h1 className="signin-title">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          
          <form onSubmit={handleSubmit} className="signin-form">
            {/* Name Fields (Sign Up only) */}
            {isSignUp && (
              <>
                <div className="form-field">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="form-input"
                    placeholder="ENTER YOUR FIRST NAME"
                    disabled={loading}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="form-input"
                    placeholder="ENTER YOUR LAST NAME"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                placeholder="ENTER YOUR EMAIL"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="form-field">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="form-input"
                placeholder="ENTER YOUR PASSWORD"
                disabled={loading}
              />
            </div>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div className="form-field">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="form-input"
                  placeholder="CONFIRM YOUR PASSWORD"
                  disabled={loading}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          {/* Toggle Sign In/Sign Up */}
          <div className="toggle-mode">
            <p className="toggle-text">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <button
              type="button"
              onClick={toggleMode}
              className="toggle-button"
              disabled={loading}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="signin-info">
          Sign in to upload songs and track your karaoke scores
        </p>
      </div>
    </div>
  )
}

export default SignIn
