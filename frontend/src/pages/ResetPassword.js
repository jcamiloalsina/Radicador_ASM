import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Lock, CheckCircle, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [validating, setValidating] = useState(true);

  const token = searchParams.get('token');

  useEffect(() => {
    // Validar el token
    const validateToken = async () => {
      if (!token) {
        setTokenValid(false);
        setValidating(false);
        return;
      }
      
      try {
        await axios.get(`${API}/auth/validate-reset-token?token=${token}`);
        setTokenValid(true);
      } catch (error) {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };
    
    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('¡Contraseña actualizada exitosamente!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

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
            Tu radicador catastral en línea
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          {!tokenValid ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">
                  Enlace Inválido
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  El enlace de recuperación ha expirado o no es válido.
                </p>
              </div>
              <Link to="/forgot-password">
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
                  Solicitar nuevo enlace
                </Button>
              </Link>
              <Link to="/login" className="block text-sm text-emerald-700 hover:text-emerald-800 font-medium">
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">
                  ¡Contraseña Actualizada!
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Tu contraseña ha sido restablecida exitosamente.
                </p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full bg-emerald-700 hover:bg-emerald-800">
                Iniciar Sesión
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">
                  Nueva Contraseña
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Ingresa tu nueva contraseña
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="password" className="text-slate-700">Nueva Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="mt-1 focus-visible:ring-emerald-600"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Puedes usar letras, números y caracteres especiales (!@#$%^&*)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-slate-700">Confirmar Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="mt-1 focus-visible:ring-emerald-600"
                      placeholder="Repite la contraseña"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-md transition-all active:scale-95"
                >
                  {loading ? (
                    'Actualizando...'
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Restablecer Contraseña
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
