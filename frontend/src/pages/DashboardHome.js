import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/petitions/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total de Peticiones',
      value: stats?.total || 0,
      icon: FileText,
      color: 'bg-blue-500',
      testId: 'stat-total'
    },
    {
      title: 'Pendientes',
      value: stats?.pendientes || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      testId: 'stat-pendientes'
    },
    {
      title: 'Aprobadas',
      value: stats?.aprobadas || 0,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      testId: 'stat-aprobadas'
    },
    {
      title: 'Rechazadas',
      value: stats?.rechazadas || 0,
      icon: XCircle,
      color: 'bg-red-500',
      testId: 'stat-rechazadas'
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard-home">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="welcome-message">
          Bienvenido, {user?.full_name}
        </h2>
        <p className="text-slate-600 mt-2">
          {user?.role === 'ciudadano'
            ? 'Gestiona tus peticiones catastrales desde aquí'
            : 'Panel de control de peticiones catastrales'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={stat.testId}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
                <div className={`${stat.color} p-2 rounded-md`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900" data-testid={`${stat.testId}-value`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 font-outfit">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.role === 'ciudadano' && (
            <Button
              onClick={() => {
                navigate('/dashboard/peticiones/nueva');
              }}
              className="w-full md:w-auto bg-emerald-700 hover:bg-emerald-800 text-white"
              data-testid="create-petition-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Petición
            </Button>
          )}
          <Button
            onClick={() => navigate('/dashboard/peticiones')}
            variant="outline"
            className="w-full md:w-auto ml-0 md:ml-2"
            data-testid="view-petitions-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Ver Mis Peticiones
          </Button>
          {user?.role !== 'ciudadano' && (
            <Button
              onClick={() => navigate('/dashboard/todas-peticiones')}
              variant="outline"
              className="w-full md:w-auto ml-0 md:ml-2"
              data-testid="view-all-petitions-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Todas las Peticiones
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <p className="text-sm text-emerald-900">
            {user?.role === 'ciudadano'
              ? 'Puedes crear nuevas peticiones y hacer seguimiento al estado de tus trámites desde esta plataforma.'
              : user?.role === 'atencion_usuario'
              ? 'Como personal de atención, puedes revisar y actualizar el estado de las peticiones.'
              : 'Como coordinador, tienes acceso completo para gestionar y modificar todas las peticiones del sistema.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
