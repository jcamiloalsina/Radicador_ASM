import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.full_name);
      toast.success('¡Registro exitoso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
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
            src="https://images.unsplash.com/photo-1662140246046-fc44f41e4362?q=85&w=1920"
            alt="Mapa Catastral"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 text-center">
          <img 
            src="/logo-asomunicipios.png" 
            alt="Asomunicipios Logo" 
            className="w-64 mx-auto mb-6 rounded-lg shadow-lg"
            data-testid="register-logo"
          />
          <h2 className="text-xl font-bold font-outfit leading-tight">Asociación de Municipios del Catatumbo,</h2>
          <p className="text-emerald-100 mt-1 text-lg leading-relaxed">Provincia de Ocaña y Sur del Cesar</p>
          <p className="text-emerald-200 mt-2 text-base font-bold tracking-wide">– Asomunicipios –</p>
        </div>
        <div className="relative z-10 text-center">
          <p className="text-emerald-100 text-lg font-semibold">
            Asomunicipios en línea
          </p>
          <p className="text-emerald-200 text-sm mt-1">
            Tu radicador catastral
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="register-title">
              Crear Cuenta
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Completa el formulario para registrarte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6" data-testid="register-form">
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-slate-700">Nombre Completo</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="mt-1 focus-visible:ring-emerald-600"
                  placeholder="Juan Pérez"
                  data-testid="register-name-input"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-slate-700">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="mt-1 focus-visible:ring-emerald-600"
                  placeholder="tu@correo.com"
                  data-testid="register-email-input"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-700">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="mt-1 focus-visible:ring-emerald-600"
                  placeholder="••••••••"
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-md transition-all active:scale-95"
              data-testid="register-submit-button"
            >
              {loading ? (
                'Registrando...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Cuenta
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-medium" data-testid="login-link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
