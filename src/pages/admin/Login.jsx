import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionLoading && session) navigate('/admin', { replace: true });
  }, [session, sessionLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError('Credenciales inválidas. Verificá email y contraseña.');
      return;
    }
    navigate('/admin', { replace: true });
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Panel de administración</h1>
        <p className="body">Ingresá con tu cuenta de MJ STORE.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="field__error" style={{ marginTop: 8 }}>{error}</p>}

          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          <Link to="/">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
}
