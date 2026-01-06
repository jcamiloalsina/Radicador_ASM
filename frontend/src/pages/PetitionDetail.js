import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Save, Mail, Phone, MapPin, FileText, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PetitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [petition, setPetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    estado: '',
    notas: '',
    nombre_completo: '',
    correo: '',
    telefono: '',
    tipo_tramite: '',
    municipio: ''
  });

  useEffect(() => {
    fetchPetition();
  }, [id]);

  const fetchPetition = async () => {
    try {
      const response = await axios.get(`${API}/petitions/${id}`);
      setPetition(response.data);
      setEditData({
        estado: response.data.estado,
        notas: response.data.notas || '',
        nombre_completo: response.data.nombre_completo,
        correo: response.data.correo,
        telefono: response.data.telefono,
        tipo_tramite: response.data.tipo_tramite,
        municipio: response.data.municipio
      });
    } catch (error) {
      toast.error('Error al cargar la petición');
      navigate('/dashboard/peticiones');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const updatePayload = user.role === 'coordinador' ? editData : {
        estado: editData.estado,
        notas: editData.notas
      };
      await axios.patch(`${API}/petitions/${id}`, updatePayload);
      toast.success('¡Petición actualizada exitosamente!');
      setEditing(false);
      fetchPetition();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar la petición');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pendiente: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      en_revision: { label: 'En Revisión', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      aprobada: { label: 'Aprobada', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      rechazada: { label: 'Rechazada', className: 'bg-red-100 text-red-800 border-red-200' },
    };
    const config = statusConfig[status] || statusConfig.pendiente;
    return <Badge className={config.className} data-testid="petition-status-badge">{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  if (!petition) {
    return null;
  }

  const canEdit = user?.role !== 'ciudadano';
  const canEditAllFields = user?.role === 'coordinador';

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="petition-detail-page">
      <Button
        onClick={() => navigate(-1)}
        variant="ghost"
        className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
        data-testid="back-button"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>

      {/* Header Card */}
      <Card className="border-slate-200">
        <CardHeader className="bg-gradient-to-br from-emerald-800 to-emerald-600 text-white rounded-t-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-outfit" data-testid="petition-title">
                Petición #{petition.id.substring(0, 8)}
              </CardTitle>
              <p className="text-emerald-100 text-sm mt-1">Detalles completos de la petición</p>
            </div>
            {getStatusBadge(petition.estado)}
          </div>
        </CardHeader>
      </Card>

      {/* Information Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-slate-900 font-outfit">Información del Solicitante</CardTitle>
            {canEdit && !editing && (
              <Button
                onClick={() => setEditing(true)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                data-testid="edit-button"
              >
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <div className="space-y-4">
              {canEditAllFields && (
                <>
                  <div>
                    <Label htmlFor="nombre_completo">Nombre Completo</Label>
                    <Input
                      id="nombre_completo"
                      value={editData.nombre_completo}
                      onChange={(e) => setEditData({ ...editData, nombre_completo: e.target.value })}
                      data-testid="edit-nombre"
                    />
                  </div>
                  <div>
                    <Label htmlFor="correo">Correo Electrónico</Label>
                    <Input
                      id="correo"
                      type="email"
                      value={editData.correo}
                      onChange={(e) => setEditData({ ...editData, correo: e.target.value })}
                      data-testid="edit-correo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={editData.telefono}
                      onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                      data-testid="edit-telefono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_tramite">Tipo de Trámite</Label>
                    <Input
                      id="tipo_tramite"
                      value={editData.tipo_tramite}
                      onChange={(e) => setEditData({ ...editData, tipo_tramite: e.target.value })}
                      data-testid="edit-tipo-tramite"
                    />
                  </div>
                  <div>
                    <Label htmlFor="municipio">Municipio</Label>
                    <Input
                      id="municipio"
                      value={editData.municipio}
                      onChange={(e) => setEditData({ ...editData, municipio: e.target.value })}
                      data-testid="edit-municipio"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select value={editData.estado} onValueChange={(value) => setEditData({ ...editData, estado: value })}>
                  <SelectTrigger data-testid="edit-estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_revision">En Revisión</SelectItem>
                    <SelectItem value="aprobada">Aprobada</SelectItem>
                    <SelectItem value="rechazada">Rechazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={editData.notas}
                  onChange={(e) => setEditData({ ...editData, notas: e.target.value })}
                  rows={4}
                  placeholder="Agregue notas sobre esta petición..."
                  data-testid="edit-notas"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleUpdate}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                  data-testid="save-button"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  variant="outline"
                  className="flex-1"
                  data-testid="cancel-edit-button"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nombre Completo</p>
                    <p className="font-medium text-slate-900" data-testid="petition-nombre">{petition.nombre_completo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Correo Electrónico</p>
                    <p className="font-medium text-slate-900" data-testid="petition-correo">{petition.correo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Phone className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Teléfono</p>
                    <p className="font-medium text-slate-900" data-testid="petition-telefono">{petition.telefono}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-orange-700" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Municipio</p>
                    <p className="font-medium text-slate-900" data-testid="petition-municipio">{petition.municipio}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500">Tipo de Trámite</p>
                    <p className="font-medium text-slate-900" data-testid="petition-tipo-tramite">{petition.tipo_tramite}</p>
                  </div>
                </div>
              </div>

              {petition.notas && (
                <div className="border-t border-slate-200 pt-6">
                  <p className="text-sm text-slate-500 mb-2">Notas</p>
                  <p className="text-slate-900" data-testid="petition-notas">{petition.notas}</p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-slate-500">Creada</p>
                      <p className="font-medium text-slate-900" data-testid="petition-created-at">{formatDate(petition.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="text-slate-500">Última actualización</p>
                      <p className="font-medium text-slate-900" data-testid="petition-updated-at">{formatDate(petition.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
