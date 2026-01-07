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
    if (user?.role === 'ciudadano') {
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
          p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tipo_tramite.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.municipio.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Petitions List */}
      {filteredPetitions.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-600" data-testid="no-petitions-message">
              No se encontraron peticiones con los criterios de búsqueda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPetitions.map((petition) => (
            <Card key={petition.id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`petition-card-${petition.id}`}>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <CardTitle className="text-lg font-outfit text-slate-900" data-testid={`petition-radicado-${petition.id}`}>
                      {petition.radicado}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{petition.nombre_completo}</p>
                    <p className="text-xs text-slate-500 mt-1" data-testid={`petition-date-${petition.id}`}>
                      Creada el {formatDate(petition.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(petition.estado)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Tipo de Trámite</p>
                    <p className="font-medium text-slate-900" data-testid={`petition-tramite-${petition.id}`}>{petition.tipo_tramite}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Municipio</p>
                    <p className="font-medium text-slate-900" data-testid={`petition-municipio-${petition.id}`}>{petition.municipio}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Teléfono</p>
                    <p className="font-medium text-slate-900" data-testid={`petition-telefono-${petition.id}`}>{petition.telefono}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Correo</p>
                    <p className="font-medium text-slate-900 truncate" data-testid={`petition-correo-${petition.id}`}>{petition.correo}</p>
                  </div>
                </div>
                {petition.notas && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-md">
                    <p className="text-xs text-slate-500 mb-1">Notas:</p>
                    <p className="text-sm text-slate-700" data-testid={`petition-notas-${petition.id}`}>{petition.notas}</p>
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => navigate(`/dashboard/peticiones/${petition.id}`)}
                    variant="outline"
                    size="sm"
                    className="text-emerald-700 border-emerald-700 hover:bg-emerald-50"
                    data-testid={`view-details-${petition.id}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver/Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
