import { useState } from 'react'
import ProfileFields from './ProfileFields.jsx'
import { emptyProfile } from './accountProfile.js'
import InfoHint from './InfoHint.jsx'

function LoginPage({ error, message, busy, configured, onAuthenticate, onResetPassword, onClearFeedback }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [profile, setProfile] = useState(emptyProfile)
  const handleSubmit = (event) => {
    event.preventDefault()
    onAuthenticate({ email: email.trim(), password, creatingAccount, profile })
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Shuttle Match Desk">
        <div className="login-brand">
          <div className="brand-mark" aria-hidden="true">S</div>
          <span>SHUTTLE<br />MATCH DESK</span>
        </div>
        <div className="login-story-copy">
          <p className="eyebrow">Every rally, remembered</p>
          <h1>Make every<br />match count.</h1>
          <p>One clear view of the score, the serve, and the story of your game.</p>
        </div>
        <div className="court-art" aria-hidden="true">
          <div className="court-lines">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="shuttle-art"><i /><b /><em /></div>
          <span className="court-caption">PLAY · COMPETE · CELEBRATE</span>
        </div>
        <p className="login-story-footer">MBA / SHUTTLE MATCH DESK</p>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-form-wrap">
          <p className="eyebrow">WELCOME TO THE COURT</p>
          <h2 id="login-title">{creatingAccount ? 'Create your account' : 'Welcome back'}</h2>
          <p className="login-intro">
            {creatingAccount ? 'Add your basic details to get started.' : 'Sign in to get back to your match desk.'}
          </p>

          <InfoHint label="Shared names & privacy">
            <p>Sign in with a Firebase account to save and reuse player names across devices.</p>
            <p>Saved names are visible to every signed-in user. Do not save private information.</p>
            <p>Your profile's full name is automatically included in player-name suggestions when you sign in, unless an admin has removed it.</p>
            <p>Your private profile and shared player names are saved in Firebase. Saved final results and player performance are shared in the leaderboard. Photos and unsaved games stay on this device until reload or sign-out.</p>
          </InfoHint>

          <form className="login-form" onSubmit={handleSubmit}>
            {creatingAccount && (
              <ProfileFields value={profile} onChange={setProfile} disabled={!configured || busy} />
            )}
            <label htmlFor="login-email">Email address</label>
            <input
              autoComplete="email"
              id="login-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={!configured || busy}
              type="email"
              value={email}
            />

            <div className="password-label-row">
              <label htmlFor="login-password">Password</label>
              {!creatingAccount && (
                <button
                  className="forgot-password"
                  type="button"
                  disabled={!configured || busy}
                  onClick={() => onResetPassword(email.trim())}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              autoComplete={creatingAccount ? 'new-password' : 'current-password'}
              id="login-password"
              minLength={6}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              disabled={!configured || busy}
              type="password"
              value={password}
            />

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-success" role="status">{message}</p>}
            {!configured && <p className="auth-error" role="alert">Firebase is not configured. Set the VITE_FIREBASE environment variables and rebuild the app.</p>}

            <button className="login-submit" type="submit" disabled={!configured || busy}>
              {busy ? 'Please wait...' : creatingAccount ? 'Create account' : 'Sign in'}
              <span aria-hidden="true">-&gt;</span>
            </button>
          </form>

          <p className="login-toggle">
            {creatingAccount ? 'Already have an account? ' : 'New to the match desk? '}
            <button type="button" disabled={busy || !configured} onClick={() => {
              setCreatingAccount(!creatingAccount)
              onClearFeedback()
            }}>
              {creatingAccount ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
