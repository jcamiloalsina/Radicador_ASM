import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { Download, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProductivityReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only allow admin, coordinador, and atencion_usuario
    if (user && !['administrador', 'coordinador', 'atencion_usuario'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }
    fetchProductivityData();
  }, [user, navigate]);

  const fetchProductivityData = async () => {
    try {
      const response = await axios.get(`${API}/reports/gestor-productivity`);
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar reportes de productividad');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const url = `${API}/reports/gestor-productivity/export-pdf`;
    window.open(url, '_blank');
    toast.success('Descargando reporte PDF...');
  };

  const getCompletionRateColor = (rate) => {
    if (rate >= 80) return 'bg-emerald-100 text-emerald-800';
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalGestores = data.length;
  const totalAssigned = data.reduce((sum, g) => sum + g.total_assigned, 0);
  const totalCompleted = data.reduce((sum, g) => sum + g.completed, 0);
  const avgCompletionRate = totalGestores > 0 
    ? (data.reduce((sum, g) => sum + g.completion_rate, 0) / totalGestores).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6" data-testid="productivity-reports-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="page-heading">
            Reportes de Productividad
          </h2>
          <p className="text-slate-600 mt-1">Análisis de desempeño de gestores y auxiliares</p>
        </div>
        <Button
          onClick={handleExportPDF}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
          data-testid="export-pdf-button"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar a PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Gestores</CardTitle>
            <Users className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900" data-testid="total-gestores">{totalGestores}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Asignados</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900" data-testid="total-assigned">{totalAssigned}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Finalizados</CardTitle>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900" data-testid="total-completed">{totalCompleted}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Tasa Promedio</CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900" data-testid="avg-rate">{avgCompletionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Table */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 font-outfit">Desempeño por Gestor</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-center text-slate-600 py-8">No hay datos de gestores disponibles</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="productivity-table">
                <thead className="bg-slate-100 border-b-2 border-slate-200">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-700">Gestor</th>
                    <th className="text-left p-3 font-semibold text-slate-700">Rol</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Total Asignados</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Finalizados</th>
                    <th className="text-center p-3 font-semibold text-slate-700">En Proceso</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Rechazados</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Tiempo Prom. (días)</th>
                    <th className="text-center p-3 font-semibold text-slate-700">Tasa Finalización</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((gestor, idx) => (
                    <tr 
                      key={gestor.gestor_id} 
                      className="border-b border-slate-200 hover:bg-slate-50"
                      data-testid={`gestor-row-${idx}`}
                    >
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-slate-900">{gestor.gestor_name}</p>
                          <p className="text-xs text-slate-500">{gestor.gestor_email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-blue-100 text-blue-800">
                          {gestor.gestor_role === 'gestor' ? 'Gestor' : 'Gestor Auxiliar'}
                        </Badge>
                      </td>
                      <td className="text-center p-3 font-medium">{gestor.total_assigned}</td>
                      <td className="text-center p-3 text-emerald-700 font-medium">{gestor.completed}</td>
                      <td className="text-center p-3 text-yellow-700 font-medium">{gestor.in_process}</td>
                      <td className="text-center p-3 text-red-700 font-medium">{gestor.rejected}</td>
                      <td className="text-center p-3 font-medium">{gestor.avg_completion_days}</td>
                      <td className="text-center p-3">
                        <Badge className={getCompletionRateColor(gestor.completion_rate)}>
                          {gestor.completion_rate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <p className="text-sm text-emerald-900 mb-2 font-medium">Indicadores de Tasa de Finalización:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500"></div>
              <span className="text-slate-700">≥ 80% - Excelente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-slate-700">60-79% - Bueno</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-slate-700">< 60% - Necesita Mejora</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
