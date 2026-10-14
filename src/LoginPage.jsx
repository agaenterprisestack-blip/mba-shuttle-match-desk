import { useState } from 'react'

function LoginPage({ credentials, error, onAuthenticate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const handleSubmit = (event) => {
    event.preventDefault()
    onAuthenticate({ email: email.trim(), password })
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
          <h2 id="login-title">Welcome back</h2>
          <p className="login-intro">
            Sign in to get back to your match desk.
          </p>

          <div className="auth-notice">
            <strong>Temporary demo access</strong>
            <span>Email: <code>{credentials.email}</code></span>
            <span>Password: <code>{credentials.password}</code></span>
            <span>Public demo login only, not secure authentication. Firebase integration is paused.</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              autoComplete="email"
              id="login-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />

            <div className="password-label-row">
              <label htmlFor="login-password">Password</label>
            </div>
            <input
              autoComplete="current-password"
              id="login-password"
              minLength={6}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit">
              Sign in
              <span aria-hidden="true">-&gt;</span>
            </button>
          </form>

          <p className="login-privacy">Account creation and password reset are unavailable in demo mode.</p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
