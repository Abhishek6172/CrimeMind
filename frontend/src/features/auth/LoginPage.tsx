import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../store/AppContext';
import {
  CrimeMindLogoIcon,
  GoogleIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckIcon,
  RefreshIcon,
  KeyIcon,
} from '../../components/icons/Icons';
import { authApi } from '../../services/api/authApi';

export const LoginPage: React.FC = () => {
  const {
    login,
    loginWithGoogle,
    loginWithGoogleCode,
    googleConfig,
    setActivePage,
    addToast,
    isAuthenticated,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  // If already authenticated, redirect to tactical dashboard
  useEffect(() => {
    if (isAuthenticated) {
      setActivePage('dashboard');
    }
  }, [isAuthenticated, setActivePage]);

  // Check URL parameters for OAuth redirect codes or errors
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || undefined;
    const authError = searchParams.get('error') || searchParams.get('auth_error');

    if (authError) {
      if (authError === 'access_denied') {
        setErrorMessage('Google authentication was cancelled by user.');
      } else {
        setErrorMessage(`Authentication error: ${authError.replace(/_/g, ' ')}`);
      }
      // Clean query parameters from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      setIsGoogleLoading(true);
      window.history.replaceState({}, document.title, window.location.pathname);

      loginWithGoogleCode(code, state)
        .then(() => {
          addToast('Google verification complete. Clearance granted.', 'success');
          setActivePage('dashboard');
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Failed to complete Google authentication code exchange.');
        })
        .finally(() => {
          setIsGoogleLoading(false);
        });
    }
  }, [loginWithGoogleCode, setActivePage, addToast]);

  // Initialize official Google Identity Services (GIS) if available
  useEffect(() => {
    const clientId = googleConfig?.client_id;
    if (!clientId || clientId.startsWith('your_')) return;

    const setupGoogleGis = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response?.credential) {
              setIsGoogleLoading(true);
              setErrorMessage(null);
              try {
                await loginWithGoogle(response.credential);
                setActivePage('dashboard');
              } catch (err: any) {
                setErrorMessage(err.message || 'Google token validation failed on backend server.');
              } finally {
                setIsGoogleLoading(false);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render GIS button into container if available
        if (googleButtonContainerRef.current) {
          google.accounts.id.renderButton(googleButtonContainerRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'rectangular',
            width: 380,
            text: 'continue_with',
          });
        }
      } catch (err) {
        console.warn('Google Identity Services initialization notice:', err);
      }
    };

    if ((window as any).google?.accounts?.id) {
      setupGoogleGis();
    } else {
      // Dynamically load Google Identity Services SDK
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = setupGoogleGis;
      document.head.appendChild(script);
    }
  }, [googleConfig, loginWithGoogle, setActivePage]);

  // Handle direct Google button click (OAuth redirect flow fallback)
  const handleDirectGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    // First attempt popup if Google SDK is loaded
    const google = (window as any).google;
    if (google?.accounts?.id) {
      try {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // If One Tap is suppressed or blocked, seamlessly trigger redirect flow
            triggerGoogleOAuthRedirect();
          }
        });
        setIsGoogleLoading(false);
        return;
      } catch (e) {
        // Fallback to OAuth redirect
      }
    }

    triggerGoogleOAuthRedirect();
  };

  const triggerGoogleOAuthRedirect = async () => {
    try {
      const redirectUri = googleConfig?.redirect_uri || (window.location.origin + '/auth/google/callback');
      const authUrlData = await authApi.getGoogleAuthUrl(redirectUri);
      if (authUrlData.authorization_url) {
        window.location.href = authUrlData.authorization_url;
      }
    } catch (err: any) {
      // If backend is unreachable, fallback to direct Google OAuth URL using configured client ID
      const clientId = googleConfig?.client_id || '888824302509-u2geafh9b1hn9sob0tp9d8iuai91v83n.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(googleConfig?.redirect_uri || (window.location.origin + '/auth/google/callback'));
      const fallbackState = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const directUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile&state=${fallbackState}&access_type=offline&prompt=select_account`;
      window.location.href = directUrl;
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!username.trim()) {
      errors.username = mode === 'login' ? 'Officer username or email is required' : 'Username is required';
    }
    if (!password) {
      errors.password = 'Security password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'register') {
      if (!fullName.trim()) errors.fullName = 'Full investigator name is required';
      if (!email.trim()) {
        errors.email = 'Official department email is required';
      } else if (!email.includes('@')) {
        errors.email = 'Please provide a valid email address';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
        setActivePage('dashboard');
      } else {
        await authApi.register({
          username: username.trim(),
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          badge_number: badgeNumber.trim() || undefined,
        });
        addToast('Investigator profile registered. Authenticating...', 'success');
        await login(username.trim(), password);
        setActivePage('dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication rejected. Verify credentials or role clearance.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (demoUser: string) => {
    setUsername(demoUser);
    setPassword('crimeMind2024!');
    setErrorMessage(null);
    setValidationErrors({});
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--navbar-height))',
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem 4rem',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      className="bg-vignette bg-grid-pattern"
    >
      {/* Ambient Cyber Noir Background Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '650px',
          height: '420px',
          background: 'radial-gradient(circle, rgba(255, 42, 66, 0.12) 0%, rgba(229, 9, 20, 0.03) 50%, transparent 80%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: '450px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Glassmorphism Login Card */}
      <div
        className="glass-panel-elevated crimson-corner"
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: 'var(--radius-xl, 20px)',
          padding: '2.5rem 2.25rem',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 42, 66, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Card Header & Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 42, 66, 0.10)',
              border: '1px solid rgba(255, 42, 66, 0.40)',
              boxShadow: '0 0 20px rgba(255, 42, 66, 0.35)',
              marginBottom: '1rem',
            }}
          >
            <CrimeMindLogoIcon size={34} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
              }}
            >
              CRIME<span style={{ color: 'var(--crimson-neon)' }}>MIND</span>
            </span>
            <span
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: 'var(--crimson-bright)',
                backgroundColor: 'rgba(255, 42, 66, 0.15)',
                border: '1px solid rgba(255, 42, 66, 0.35)',
                padding: '0.15rem 0.45rem',
                borderRadius: 'var(--radius-xs)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              SECURE ACCESS
            </span>
          </div>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              margin: '0.2rem 0 0 0',
            }}
          >
            Tactical Intelligence Platform & Forensic Vault
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(10, 13, 20, 0.85)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md, 10px)',
            padding: '4px',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '0.55rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm, 6px)',
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              backgroundColor: mode === 'login' ? 'rgba(255, 42, 66, 0.18)' : 'transparent',
              border: mode === 'login' ? '1px solid rgba(255, 42, 66, 0.45)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
            }}
          >
            Officer Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(null); }}
            style={{
              flex: 1,
              padding: '0.55rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm, 6px)',
              color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              backgroundColor: mode === 'register' ? 'rgba(255, 42, 66, 0.18)' : 'transparent',
              border: mode === 'register' ? '1px solid rgba(255, 42, 66, 0.45)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
            }}
          >
            Request Clearance
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              backgroundColor: 'rgba(255, 42, 66, 0.12)',
              border: '1px solid rgba(255, 42, 66, 0.5)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8125rem',
              color: '#FF6B7D',
            }}
          >
            <AlertTriangleIcon size={18} color="#FF334B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, lineHeight: 1.4 }}>{errorMessage}</div>
          </div>
        )}

        {/* Google OAuth Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          {/* Branded Continue with Google Button */}
          <button
            type="button"
            onClick={handleDirectGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1.25rem',
              backgroundColor: 'rgba(18, 22, 32, 0.90)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isGoogleLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.65)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(66, 133, 244, 0.35)';
              e.currentTarget.style.backgroundColor = 'rgba(26, 32, 46, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.35)';
              e.currentTarget.style.backgroundColor = 'rgba(18, 22, 32, 0.90)';
            }}
          >
            {isGoogleLoading ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 16,
                  border: '2px solid var(--crimson-bright)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'radarSweep 0.8s linear infinite',
                }}
              />
            ) : (
              <GoogleIcon size={20} />
            )}
            <span>{isGoogleLoading ? 'Verifying with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Hidden Google GIS render container for native One Tap prompt */}
          <div ref={googleButtonContainerRef} style={{ display: 'none' }} />
        </div>

        {/* Divider with Noir Glow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1.25rem 0',
            color: 'var(--text-tertiary)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-medium))' }} />
          <span style={{ padding: '0 0.85rem' }}>OR INVESTIGATOR CREDENTIALS</span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--border-medium), transparent)' }} />
        </div>

        {/* Credential Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {mode === 'register' && (
            <>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Det. Sarah Vance"
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(11, 14, 22, 0.85)',
                      border: validationErrors.fullName ? '1px solid #FF334B' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                {validationErrors.fullName && (
                  <span style={{ fontSize: '0.72rem', color: '#FF4D63', marginTop: '0.2rem', display: 'block' }}>
                    {validationErrors.fullName}
                  </span>
                )}
              </div>

              {/* Department Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Department Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah.vance@crimemind.internal"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(11, 14, 22, 0.85)',
                    border: validationErrors.email ? '1px solid #FF334B' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {validationErrors.email && (
                  <span style={{ fontSize: '0.72rem', color: '#FF4D63', marginTop: '0.2rem', display: 'block' }}>
                    {validationErrors.email}
                  </span>
                )}
              </div>

              {/* Badge Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Badge Number (Optional)
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="e.g. 4419"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(11, 14, 22, 0.85)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </>
          )}

          {/* Username / Identifier */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              {mode === 'login' ? 'Officer ID or Email' : 'Officer Username'}
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                <UserIcon size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'login' ? 'investigator / admin or email' : 'sarah_vance'}
                autoComplete="username"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(11, 14, 22, 0.85)',
                  border: validationErrors.username ? '1px solid #FF334B' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-crimson)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 42, 66, 0.25)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = validationErrors.username ? '#FF334B' : 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {validationErrors.username && (
              <span style={{ fontSize: '0.72rem', color: '#FF4D63', marginTop: '0.2rem', display: 'block' }}>
                {validationErrors.username}
              </span>
            )}
          </div>

          {/* Password with Show/Hide Toggle */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Security Clearance Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--crimson-bright)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  Forgot Key?
                </button>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '0.85rem', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                <LockIcon size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(11, 14, 22, 0.85)',
                  border: validationErrors.password ? '1px solid #FF334B' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 2.6rem 0.65rem 2.4rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-crimson)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 42, 66, 0.25)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = validationErrors.password ? '#FF334B' : 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide security key' : 'Show security key'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  color: showPassword ? 'var(--crimson-bright)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
            {validationErrors.password && (
              <span style={{ fontSize: '0.72rem', color: '#FF4D63', marginTop: '0.2rem', display: 'block' }}>
                {validationErrors.password}
              </span>
            )}
          </div>

          {/* Remember Clearance Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                accentColor: 'var(--crimson-neon)',
                cursor: 'pointer',
                width: 14,
                height: 14,
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Persist Cryptographic Session Token
            </label>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              marginTop: '0.5rem',
              background: 'linear-gradient(135deg, #FF2A42 0%, #D40816 100%)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 42, 66, 0.6)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.925rem',
              fontWeight: 700,
              boxShadow: '0 0 18px rgba(255, 42, 66, 0.45)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 16,
                    height: 16,
                    border: '2px solid #FFFFFF',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'radarSweep 0.8s linear infinite',
                  }}
                />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Authenticate Access' : 'Create Investigator Profile'}</span>
                <ArrowRightIcon size={16} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast-Login Assist Chips */}
        {mode === 'login' && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.85rem',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '0.5rem' }}>
              <KeyIcon size={12} color="var(--accent-amber)" />
              <span>STANDBY DEMO PROFILES</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => fillDemoAccount('investigator')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(255, 42, 66, 0.08)',
                  border: '1px solid rgba(255, 42, 66, 0.3)',
                  color: 'var(--crimson-bright)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Lead Investigator
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                style={{
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(0, 212, 255, 0.08)',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Admin Supervisor
              </button>
            </div>
          </div>
        )}

        {/* Footer Security Badges */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheckIcon size={13} color="var(--accent-emerald)" />
            <span>FIPS 140-3 Cryptographic Vault</span>
          </div>
          <span>•</span>
          <span>Google OAuth 2.0</span>
        </div>
      </div>

      {/* Password Recovery Modal */}
      {showRecoveryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 1000,
          }}
          onClick={() => setShowRecoveryModal(false)}
        >
          <div
            className="glass-panel-elevated"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <KeyIcon size={20} color="var(--crimson-neon)" />
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Credential Recovery
              </h3>
            </div>

            {recoverySent ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 230, 153, 0.15)',
                    border: '1px solid var(--accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckIcon size={22} color="var(--accent-emerald)" />
                </div>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
                  Recovery Instruction Dispatched
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.5, margin: 0 }}>
                  If an active investigator account matches <strong>{recoveryEmail}</strong>, an encrypted reset token has been routed through internal dispatch.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowRecoveryModal(false); setRecoverySent(false); }}
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.6rem 1.2rem',
                    backgroundColor: 'var(--glass-bg-subtle)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  Enter your registered department email address to receive cryptographic verification instructions.
                </p>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="officer@crimemind.internal"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(11, 14, 22, 0.85)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.65rem 0.85rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    marginBottom: '1rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    style={{
                      padding: '0.55rem 1rem',
                      background: 'none',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (recoveryEmail.includes('@')) {
                        setRecoverySent(true);
                      }
                    }}
                    style={{
                      padding: '0.55rem 1.25rem',
                      background: 'linear-gradient(135deg, #FF2A42 0%, #D40816 100%)',
                      border: '1px solid rgba(255, 42, 66, 0.6)',
                      borderRadius: 'var(--radius-md)',
                      color: '#FFF',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    Dispatch Key
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
