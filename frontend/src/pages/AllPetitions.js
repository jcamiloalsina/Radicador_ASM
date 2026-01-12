import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { Search, Eye, Filter, Download, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AllPetitions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [petitions, setPetitions] = useState([]);
  const [filteredPetitions, setFilteredPetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('estado') || 'todos');

  useEffect(() => {
    if (user?.role === 'usuario') {
      navigate('/dashboard');
    } else {
      fetchPetitions();
    }
  }, [user]);

  // Update URL when filter changes
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    if (value === 'todos') {
      searchParams.delete('estado');
    } else {
      searchParams.set('estado', value);
    }
    setSearchParams(searchParams);
  };

  useEffect(() => {
    // Read initial filter from URL
    const estadoFromUrl = searchParams.get('estado');
    if (estadoFromUrl && estadoFromUrl !== statusFilter) {
      setStatusFilter(estadoFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    let filtered = [...petitions];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          (p.nombre_completo || p.creator_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.tipo_tramite || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.municipio || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.radicado || p.radicado_id || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'todos') {
      filtered = filtered.filter((p) => p.estado === statusFilter);
    }

    setFilteredPetitions(filtered);
  }, [searchTerm, statusFilter, petitions]);

  const fetchPetitions = async () => {
    try {
      const response = await axios.get(`${API}/petitions`);
      setPetitions(response.data);
      setFilteredPetitions(response.data);
    } catch (error) {
      toast.error('Error al cargar peticiones');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      radicado: { label: 'Radicado', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
      asignado: { label: 'Asignado', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      rechazado: { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200' },
      revision: { label: 'En Revisión', className: 'bg-purple-100 text-purple-800 border-purple-200' },
      devuelto: { label: 'Devuelto', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      finalizado: { label: 'Finalizado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    };
    const config = statusConfig[status] || statusConfig.radicado;
    return <Badge className={config.className} data-testid={`badge-${status}`}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="all-petitions-page">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="page-heading">
          Todas las Peticiones
        </h2>
        <p className="text-slate-600 mt-1">Gestiona todas las peticiones del sistema</p>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, tipo de trámite o municipio..."
                className="pl-10 focus-visible:ring-emerald-600"
                data-testid="search-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="focus:ring-emerald-600" data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Estados</SelectItem>
                  <SelectItem value="radicado">Radicado</SelectItem>
                  <SelectItem value="asignado">Asignado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="revision">En Revisión</SelectItem>
                  <SelectItem value="devuelto">Devuelto</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count and Export */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-slate-600" data-testid="results-count">
          Mostrando {filteredPetitions.length} de {petitions.length} peticiones
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              let url = `${API}/reports/listado-tramites/export-pdf`;
              const params = new URLSearchParams();
              if (statusFilter && statusFilter !== 'todos') {
                params.append('estado', statusFilter);
              }
              if (params.toString()) {
                url += `?${params.toString()}`;
              }
              
              const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (!response.ok) throw new Error('Error al generar PDF');
              
              const blob = await response.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `Listado_Tramites_${new Date().toISOString().split('T')[0]}.pdf`;
              a.click();
              window.URL.revokeObjectURL(downloadUrl);
              toast.success('Listado de trámites descargado');
            } catch (error) {
              toast.error('Error al exportar listado de trámites');
            }
          }}
        >
          <FileText className="w-4 h-4 mr-2" />
          Exportar Listado PDF
        </Button>
      </div>

      {/* Petitions List - Simplified View */}
      {filteredPetitions.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-600" data-testid="no-petitions-message">
              No se encontraron peticiones con los criterios de búsqueda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Radicado</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700">Estado</th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 hidden md:table-cell">Fecha</th>
                  <th className="text-center py-4 px-6 font-semibold text-slate-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPetitions.map((petition) => (
                  <tr 
                    key={petition.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/peticiones/${petition.id}`)}
                    data-testid={`petition-row-${petition.id}`}
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-emerald-700 text-lg" data-testid={`petition-radicado-${petition.id}`}>
                        {petition.radicado || petition.radicado_id}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {petition.tipo_tramite}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(petition.estado)}
                      </div>
                    </td>
                    <td className="py-4 px-6 hidden md:table-cell">
                      <div className="text-slate-600 text-sm">
                        {formatDate(petition.created_at)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/peticiones/${petition.id}`);
                        }}
                        variant="outline"
                        size="sm"
                        className="text-emerald-700 border-emerald-700 hover:bg-emerald-50"
                        data-testid={`view-details-${petition.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
