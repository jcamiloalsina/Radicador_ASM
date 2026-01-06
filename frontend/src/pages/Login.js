import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen w-full">
      {/* Left Panel - Image */}
      <div className="hidden lg:flex flex-col justify-between bg-emerald-900 p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/8408699/pexels-photo-8408699.jpeg"
            alt="Modern Green Glass Corporate Building"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold font-outfit">Gestoría Catastral</h2>
          <p className="text-emerald-100 mt-2">Sistema de gestión de peticiones y radicaciones</p>
        </div>
        <div className="relative z-10">
          <p className="text-emerald-100 text-sm">
            Plataforma profesional para la gestión eficiente de trámites catastrales
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="login-title">
              Iniciar Sesión
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" data-testid="login-form">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-slate-700">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 focus-visible:ring-emerald-600"
                  placeholder="tu@correo.com"
                  data-testid="login-email-input"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 focus-visible:ring-emerald-600"
                  placeholder="••••••••"
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-md transition-all active:scale-95"
              data-testid="login-submit-button"
            >
              {loading ? (
                'Iniciando sesión...'
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="text-emerald-700 hover:text-emerald-800 font-medium" data-testid="register-link">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
