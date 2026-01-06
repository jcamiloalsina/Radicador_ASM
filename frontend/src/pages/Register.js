import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'ciudadano'
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.full_name, formData.role);
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
              <div>
                <Label htmlFor="role" className="text-slate-700">Tipo de Usuario</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="mt-1 focus:ring-emerald-600" data-testid="register-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ciudadano" data-testid="role-ciudadano">Ciudadano</SelectItem>
                    <SelectItem value="atencion_usuario" data-testid="role-atencion">Atención al Usuario</SelectItem>
                    <SelectItem value="coordinador" data-testid="role-coordinador">Coordinador</SelectItem>
                  </SelectContent>
                </Select>
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
