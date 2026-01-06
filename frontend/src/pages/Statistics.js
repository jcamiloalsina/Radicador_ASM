import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { MapPin, FileText, Users, TrendingUp, Calendar, CheckCircle, UserCog, Shield } from 'lucide-react';

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

export default function Statistics() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [byMunicipality, setByMunicipality] = useState([]);
  const [byTramite, setByTramite] = useState([]);
  const [byGestor, setByGestor] = useState([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [summaryRes, municipalityRes, tramiteRes, gestorRes] = await Promise.all([
        axios.get(`${API}/stats/summary`, { headers }),
        axios.get(`${API}/stats/by-municipality`, { headers }),
        axios.get(`${API}/stats/by-tramite`, { headers }),
        axios.get(`${API}/stats/by-gestor`, { headers })
      ]);
      
      setSummary(summaryRes.data);
      setByMunicipality(municipalityRes.data);
      setByTramite(tramiteRes.data);
      setByGestor(gestorRes.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
      console.error(error);
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

  // Prepare pie chart data for status distribution
  const statusPieData = summary ? [
    { name: 'Radicado', value: summary.status_counts.radicado, color: STATUS_COLORS.radicado },
    { name: 'Asignado', value: summary.status_counts.asignado, color: STATUS_COLORS.asignado },
    { name: 'En Revisión', value: summary.status_counts.revision, color: STATUS_COLORS.revision },
    { name: 'Finalizado', value: summary.status_counts.finalizado, color: STATUS_COLORS.finalizado },
    { name: 'Rechazado', value: summary.status_counts.rechazado, color: STATUS_COLORS.rechazado },
    { name: 'Devuelto', value: summary.status_counts.devuelto, color: STATUS_COLORS.devuelto }
  ].filter(item => item.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-outfit">Estadísticas</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Trámites</p>
                <p className="text-3xl font-bold text-slate-900">{summary?.total_petitions || 0}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Usuarios</p>
                <p className="text-3xl font-bold text-slate-900">{summary?.total_users || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tasa Finalización</p>
                <p className="text-3xl font-bold text-emerald-700">{summary?.completion_rate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Últimos 30 días</p>
                <p className="text-3xl font-bold text-slate-900">{summary?.recent_petitions_30_days || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 font-outfit flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-700" />
              Distribución por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Municipality Bar Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 font-outfit flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-700" />
              Trámites por Municipio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMunicipality} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="municipio" type="category" tick={{ fontSize: 12 }} width={75} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="finalizado" stackId="a" fill={STATUS_COLORS.finalizado} name="Finalizado" />
                  <Bar dataKey="revision" stackId="a" fill={STATUS_COLORS.revision} name="Revisión" />
                  <Bar dataKey="asignado" stackId="a" fill={STATUS_COLORS.asignado} name="Asignado" />
                  <Bar dataKey="radicado" stackId="a" fill={STATUS_COLORS.radicado} name="Radicado" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Tramite Type Bar Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 font-outfit flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              Trámites por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTramite} layout="vertical" margin={{ left: 150 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="tipo_tramite" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    width={145}
                    tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                  />
                  <Tooltip />
                  <Bar dataKey="total" fill="#047857" name="Total" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Gestor Bar Chart */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 font-outfit flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              Rendimiento por Gestor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byGestor.length > 0 ? (
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byGestor} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="gestor_name" 
                      type="category" 
                      tick={{ fontSize: 12 }} 
                      width={95}
                      tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="finalizado" stackId="a" fill={STATUS_COLORS.finalizado} name="Finalizado" />
                    <Bar dataKey="revision" stackId="a" fill={STATUS_COLORS.revision} name="Revisión" />
                    <Bar dataKey="asignado" stackId="a" fill={STATUS_COLORS.asignado} name="Asignado" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center text-slate-500">
                <p>No hay gestores asignados aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 gap-6">
        {/* Municipality Details Table */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 font-outfit">Detalle por Municipio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Municipio</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Total</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Radicado</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Asignado</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Revisión</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Finalizado</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Rechazado</th>
                  </tr>
                </thead>
                <tbody>
                  {byMunicipality.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{row.municipio}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline">{row.total}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-indigo-100 text-indigo-800">{row.radicado}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-yellow-100 text-yellow-800">{row.asignado}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-purple-100 text-purple-800">{row.revision}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800">{row.finalizado}</Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-red-100 text-red-800">{row.rechazado}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Gestor Details Table */}
        {byGestor.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 font-outfit">Detalle por Gestor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Gestor</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Rol</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Total</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Finalizado</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">En Proceso</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-700">Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byGestor.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{row.gestor_name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.gestor_role}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline">{row.total}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className="bg-emerald-100 text-emerald-800">{row.finalizado}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className="bg-blue-100 text-blue-800">{row.asignado + row.revision}</Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={row.completion_rate >= 70 ? "bg-emerald-100 text-emerald-800" : row.completion_rate >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                            {row.completion_rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
