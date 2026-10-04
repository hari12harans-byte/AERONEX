import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Logo } from '../components/ui.jsx';
import HeroScene from '../components/HeroScene.jsx';

function AuthForm({ mode }) {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [v, setV] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={loc.state?.from || '/dashboard'} replace />;
  const reg = mode === 'register';
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (reg) await register(v.name, v.email, v.password); else await login(v.email, v.password);
      nav(loc.state?.from || '/dashboard', { replace: true });
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth">
      <HeroScene />
      <form className="card auth-card" onSubmit={submit}>
        <Link to="/"><Logo /></Link>
        <h1>{reg ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">{reg ? 'Start monitoring your journey.' : 'Log in to your passenger command center.'}</p>
        {reg && <label className="field"><span>Full name</span><input value={v.name} onChange={set('name')} required minLength={2} maxLength={80} autoComplete="name" /></label>}
        <label className="field"><span>Email</span><input type="email" value={v.email} onChange={set('email')} required autoComplete="email" /></label>
        <label className="field"><span>Password</span><input type="password" value={v.password} onChange={set('password')} required minLength={reg ? 8 : 1} autoComplete={reg ? 'new-password' : 'current-password'} /></label>
        {err && <p className="form-err" role="alert">{err}</p>}
        <button className="btn primary lg" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</button>
        {reg && <p className="auth-legal">By creating an account you agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>}
        <p className="muted center">{reg ? <>Already registered? <Link className="textlink" to="/login">Log in</Link></> : <>New to AeroNex? <Link className="textlink" to="/register">Create an account</Link></>}</p>
        <p className="auth-legal"><Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></p>
      </form>
    </div>
  );
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
