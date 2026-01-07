import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
      toast.success('Se ha enviado un enlace de recuperación a tu correo');
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('No existe una cuenta con ese correo electrónico');
      } else if (error.response?.status === 503) {
        toast.error('El servicio de correo no está configurado. Contacte al administrador.');
      } else {
        toast.error(error.response?.data?.detail || 'Error al enviar el correo de recuperación');
      }
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
            src="/logo_asomunicipios.jpeg" 
            alt="Asomunicipios Logo" 
            className="w-64 mx-auto mb-6 rounded-lg shadow-lg"
          />
          <h2 className="text-xl font-bold font-outfit leading-tight">Asociación de Municipios del Catatumbo,</h2>
          <p className="text-emerald-100 mt-1 text-lg leading-relaxed">Provincia de Ocaña y Sur del Cesar</p>
          <p className="text-emerald-200 mt-2 text-base font-bold tracking-wide">– Asomunicipios –</p>
        </div>
        <div className="relative z-10 text-center">
          <p className="text-emerald-100 text-lg font-semibold">
            CatastroYa
          </p>
          <p className="text-emerald-200 text-sm mt-1">
            Tu radicador catastral en línea
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          {sent ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-outfit">
                  ¡Correo Enviado!
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Hemos enviado un enlace de recuperación a <strong>{email}</strong>
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
                </p>
              </div>
              <Link to="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="forgot-password-title">
                  Recuperar Contraseña
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6" data-testid="forgot-password-form">
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
                      data-testid="forgot-email-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-md transition-all active:scale-95"
                  data-testid="forgot-submit-button"
                >
                  {loading ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Enviar enlace de recuperación
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-600">
                <Link to="/login" className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
