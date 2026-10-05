import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTheme, THEME_SCOPES } from '../../lib/theme';

export default function Login() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuth();
  // Sin sesión no se lee el perfil: se usa el último tema del admin guardado en este navegador
  useDocumentTheme(THEME_SCOPES.admin);
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
      <Card className="w-full max-w-[420px] gap-8 py-10">
        <CardHeader className="px-10">
          <div className="mb-3 flex size-11 items-center justify-center rounded-lg border border-border-strong bg-accent text-brand" aria-hidden="true">
            <LockKeyhole className="size-5" strokeWidth={1.75} />
          </div>
          <CardTitle className="text-[26px] font-bold tracking-tight">Panel de administración</CardTitle>
          <CardDescription className="text-[15px]">Ingresá con tu cuenta de administrador.</CardDescription>
        </CardHeader>

        <CardContent className="px-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          {error && <p className="field__error">{error}</p>}

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={submitting}>
            {submitting ? 'Ingresando…' : <>Ingresar <ArrowRight data-icon="inline-end" /></>}
          </Button>
        </form>
        </CardContent>

        <CardFooter className="justify-center px-10">
          <Button asChild variant="link" size="sm">
            <Link to="/"><ArrowLeft data-icon="inline-start" /> Volver a la tienda</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
