import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { Plus, Search, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MyPetitions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [petitions, setPetitions] = useState([]);
  const [filteredPetitions, setFilteredPetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPetitions();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = petitions.filter(
        (p) =>
          p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.tipo_tramite.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.radicado.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPetitions(filtered);
    } else {
      setFilteredPetitions(petitions);
    }
  }, [searchTerm, petitions]);

  const fetchPetitions = async () => {
    try {
      // Usar el endpoint específico para "mis peticiones" (creadas por el usuario actual)
      const response = await axios.get(`${API}/petitions/mis-peticiones`);
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

  // For usuarios, only show relevant statuses
  const getUsuarioStatusLabel = (status) => {
    const relevantStatuses = ['radicado', 'asignado', 'rechazado', 'finalizado'];
    if (relevantStatuses.includes(status)) {
      return getStatusBadge(status);
    }
    // For other statuses, show as "En Proceso"
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">En Proceso</Badge>;
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

  const pageTitle = user?.role === 'usuario' ? 'Mis Radicados' : 'Mis Peticiones';
  const pageDescription = user?.role === 'usuario' 
    ? 'Consulta el estado de tus trámites catastrales' 
    : 'Gestiona y da seguimiento a tus trámites';

  return (
    <div className="space-y-6" data-testid="my-petitions-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="page-heading">
            {pageTitle}
          </h2>
          <p className="text-slate-600 mt-1">{pageDescription}</p>
        </div>
        <Button
          onClick={() => navigate('/dashboard/peticiones/nueva')}
          className="bg-emerald-700 hover:bg-emerald-800 text-white"
          data-testid="new-petition-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Petición
        </Button>
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por radicado, nombre, tipo de trámite o municipio..."
              className="pl-10 focus-visible:ring-emerald-600"
              data-testid="search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Petitions List */}
      {filteredPetitions.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-600" data-testid="no-petitions-message">
              {searchTerm ? 'No se encontraron peticiones con ese criterio de búsqueda.' : `No tienes ${user?.role === 'usuario' ? 'radicados' : 'peticiones'} aún.`}
            </p>
            {!searchTerm && user?.role === 'usuario' && (
              <Button
                onClick={() => navigate('/dashboard/peticiones/nueva')}
                className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-white"
                data-testid="create-first-petition-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Petición
              </Button>
            )}
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
                  {user?.role === 'usuario' ? getUsuarioStatusLabel(petition.estado) : getStatusBadge(petition.estado)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                </div>
                {petition.estado === 'rechazado' && user?.role === 'usuario' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">⚠️ Este trámite requiere subsanación</p>
                    <p className="text-xs text-red-700 mt-1">Haz clic en "Ver Detalles" para cargar los documentos solicitados</p>
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
                    Ver Detalles
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
