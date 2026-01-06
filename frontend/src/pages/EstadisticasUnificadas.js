import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  MapPin, FileText, Users, TrendingUp, Calendar, CheckCircle, UserCog, Shield,
  Download, Clock, BarChart3, PieChartIcon, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#047857', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];
const STATUS_COLORS = {
  radicado: '#6366f1',
  asignado: '#f59e0b',
  revision: '#8b5cf6',
  finalizado: '#10b981',
  rechazado: '#ef4444',
  devuelto: '#f97316'
};

const STAFF_COLORS = {
  coordinadores: '#047857',
  gestores: '#10b981',
  gestores_auxiliares: '#34d399',
  atencion_usuario: '#6366f1',
  administradores: '#8b5cf6',
  ciudadanos: '#94a3b8'
};

export default function EstadisticasUnificadas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  
  // Statistics data
  const [summary, setSummary] = useState(null);
  const [byMunicipality, setByMunicipality] = useState([]);
  const [byTramite, setByTramite] = useState([]);
  const [byGestor, setByGestor] = useState([]);
  
  // Productivity data
  const [productivityData, setProductivityData] = useState([]);

  useEffect(() => {
    if (user && !['administrador', 'coordinador', 'atencion_usuario'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }
    fetchAllData();
  }, [user, navigate]);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [summaryRes, municipalityRes, tramiteRes, gestorRes, productivityRes] = await Promise.all([
        axios.get(`${API}/stats/summary`, { headers }),
        axios.get(`${API}/stats/by-municipality`, { headers }),
        axios.get(`${API}/stats/by-tramite`, { headers }),
        axios.get(`${API}/stats/by-gestor`, { headers }),
        axios.get(`${API}/reports/gestor-productivity`, { headers })
      ]);
      
      setSummary(summaryRes.data);
      setByMunicipality(municipalityRes.data);
      setByTramite(tramiteRes.data);
      setByGestor(gestorRes.data);
      setProductivityData(productivityRes.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      window.open(`${API}/reports/gestor-productivity/export-pdf`, '_blank');
      toast.success('Descargando reporte PDF...');
    } catch (error) {
      toast.error('Error al exportar PDF');
    }
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

  // Prepare pie chart data for status distribution
  const statusPieData = summary ? [
    { name: 'Radicado', value: summary.status_counts.radicado, color: STATUS_COLORS.radicado },
    { name: 'Asignado', value: summary.status_counts.asignado, color: STATUS_COLORS.asignado },
    { name: 'Revisión', value: summary.status_counts.revision, color: STATUS_COLORS.revision },
    { name: 'Finalizado', value: summary.status_counts.finalizado, color: STATUS_COLORS.finalizado },
    { name: 'Rechazado', value: summary.status_counts.rechazado, color: STATUS_COLORS.rechazado },
    { name: 'Devuelto', value: summary.status_counts.devuelto, color: STATUS_COLORS.devuelto }
  ].filter(d => d.value > 0) : [];

  // Staff distribution data
  const staffPieData = summary ? [
    { name: 'Coordinadores', value: summary.staff_counts.coordinadores, color: STAFF_COLORS.coordinadores },
    { name: 'Gestores', value: summary.staff_counts.gestores, color: STAFF_COLORS.gestores },
    { name: 'Gestores Aux.', value: summary.staff_counts.gestores_auxiliares, color: STAFF_COLORS.gestores_auxiliares },
    { name: 'Atención', value: summary.staff_counts.atencion_usuario, color: STAFF_COLORS.atencion_usuario },
    { name: 'Admins', value: summary.staff_counts.administradores, color: STAFF_COLORS.administradores }
  ].filter(d => d.value > 0) : [];

  // Productivity summary
  const productivitySummary = {
    totalGestores: productivityData.length,
    totalAssigned: productivityData.reduce((sum, g) => sum + g.total_assigned, 0),
    totalCompleted: productivityData.reduce((sum, g) => sum + g.completed, 0),
    avgCompletionRate: productivityData.length > 0 
      ? (productivityData.reduce((sum, g) => sum + g.completion_rate, 0) / productivityData.length).toFixed(1)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-outfit">Estadísticas y Reportes</h1>
          <p className="text-sm text-slate-500">Panel de análisis y productividad del sistema</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Productividad PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Peticiones</p>
                <p className="text-2xl font-bold text-emerald-800">{summary?.total_petitions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Usuarios</p>
                <p className="text-2xl font-bold text-blue-800">{summary?.total_users || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserCog className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Gestores</p>
                <p className="text-2xl font-bold text-purple-800">{productivitySummary.totalGestores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tasa Promedio</p>
                <p className="text-2xl font-bold text-amber-800">{productivitySummary.avgCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="municipios" className="gap-2">
            <MapPin className="w-4 h-4" />
            Municipios
          </TabsTrigger>
          <TabsTrigger value="tramites" className="gap-2">
            <FileText className="w-4 h-4" />
            Trámites
          </TabsTrigger>
          <TabsTrigger value="productividad" className="gap-2">
            <Activity className="w-4 h-4" />
            Productividad
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-emerald-700" />
                  Distribución por Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Staff Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  Distribución de Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={staffPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {staffPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status counts summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Estados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: 'Radicado', value: summary?.status_counts.radicado, color: 'bg-indigo-100 text-indigo-800' },
                  { label: 'Asignado', value: summary?.status_counts.asignado, color: 'bg-amber-100 text-amber-800' },
                  { label: 'Revisión', value: summary?.status_counts.revision, color: 'bg-purple-100 text-purple-800' },
                  { label: 'Finalizado', value: summary?.status_counts.finalizado, color: 'bg-emerald-100 text-emerald-800' },
                  { label: 'Rechazado', value: summary?.status_counts.rechazado, color: 'bg-red-100 text-red-800' },
                  { label: 'Devuelto', value: summary?.status_counts.devuelto, color: 'bg-orange-100 text-orange-800' }
                ].map((stat, idx) => (
                  <div key={idx} className="text-center p-3 rounded-lg bg-slate-50">
                    <Badge className={stat.color}>{stat.value || 0}</Badge>
                    <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Municipalities Tab */}
        <TabsContent value="municipios" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                Peticiones por Municipio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={byMunicipality} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="municipio" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#047857" />
                  <Bar dataKey="finalizado" name="Finalizados" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tramites Tab */}
        <TabsContent value="tramites" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                Peticiones por Tipo de Trámite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={byTramite}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo_tramite" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#047857" />
                  <Bar dataKey="finalizado" name="Finalizados" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productividad" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-200 rounded-lg">
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Total Gestores</p>
                    <p className="text-xl font-bold text-emerald-800">{productivitySummary.totalGestores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Trámites Asignados</p>
                    <p className="text-xl font-bold text-blue-800">{productivitySummary.totalAssigned}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Finalizados</p>
                    <p className="text-xl font-bold text-green-800">{productivitySummary.totalCompleted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-200 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Tasa Promedio</p>
                    <p className="text-xl font-bold text-amber-800">{productivitySummary.avgCompletionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Productivity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-700" />
                Desempeño por Gestor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productivityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="gestor_name" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_assigned" name="Asignados" fill="#94a3b8" />
                  <Bar dataKey="completed" name="Finalizados" fill="#10b981" />
                  <Bar dataKey="in_process" name="En Proceso" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Productivity Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalle de Productividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-semibold">Gestor</th>
                      <th className="text-left py-3 px-4 font-semibold">Rol</th>
                      <th className="text-center py-3 px-4 font-semibold">Asignados</th>
                      <th className="text-center py-3 px-4 font-semibold">Finalizados</th>
                      <th className="text-center py-3 px-4 font-semibold">En Proceso</th>
                      <th className="text-center py-3 px-4 font-semibold">Promedio (días)</th>
                      <th className="text-center py-3 px-4 font-semibold">Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivityData.map((gestor, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-emerald-700 font-semibold text-xs">
                                {gestor.gestor_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </span>
                            </div>
                            <span className="font-medium">{gestor.gestor_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {gestor.gestor_role === 'gestor' ? 'Gestor' : 'Gestor Auxiliar'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{gestor.total_assigned}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-emerald-600 font-medium">{gestor.completed}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-amber-600 font-medium">{gestor.in_process}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{gestor.avg_completion_days || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getCompletionRateColor(gestor.completion_rate)}>
                            {gestor.completion_rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
