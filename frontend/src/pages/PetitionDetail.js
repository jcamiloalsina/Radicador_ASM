import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, Save, Mail, Phone, MapPin, FileText, Calendar, Upload, Download, UserPlus, X, XCircle, CheckCircle } from 'lucide-react';
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
  const [editData, setEditData] = useState({});
  const [files, setFiles] = useState([]);
  const [gestores, setGestores] = useState([]);
  const [selectedGestor, setSelectedGestor] = useState('');
  const [showGestorDialog, setShowGestorDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    fetchPetition();
    if (user?.role !== 'ciudadano') {
      fetchGestores();
    }
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

  const fetchGestores = async () => {
    try {
      const response = await axios.get(`${API}/gestores`);
      setGestores(response.data);
    } catch (error) {
      console.error('Error fetching gestores:', error);
    }
  };

  const handleUpdate = async () => {
    try {
      const updatePayload = user.role === 'coordinador' || user.role === 'administrador' ? editData : {
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

  const handleFileUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecciona al menos un archivo');
      return;
    }

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      await axios.post(`${API}/petitions/${id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Archivos subidos exitosamente');
      setFiles([]);
      setShowUploadDialog(false);
      fetchPetition();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al subir archivos');
    }
  };

  const handleAssignGestor = async () => {
    if (!selectedGestor) {
      toast.error('Selecciona un gestor');
      return;
    }

    try {
      await axios.post(`${API}/petitions/${id}/assign-gestor`, {
        petition_id: id,
        gestor_id: selectedGestor,
        is_auxiliar: false
      });
      toast.success('Gestor asignado exitosamente');
      setShowGestorDialog(false);
      fetchPetition();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al asignar gestor');
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

  const canEdit = user?.role !== 'ciudadano';
  const canEditAllFields = ['coordinador', 'administrador'].includes(user?.role);
  const canAssignGestor = ['atencion_usuario', 'gestor', 'coordinador', 'administrador'].includes(user?.role);

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
              <CardTitle className="text-2xl font-outfit" data-testid="petition-radicado">
                {petition.radicado}
              </CardTitle>
              <p className="text-emerald-100 text-sm mt-1">Detalles completos de la petición</p>
            </div>
            {getStatusBadge(petition.estado)}
          </div>
        </CardHeader>
      </Card>

      {/* Alert for rejected petitions - Citizens can upload files */}
      {petition.estado === 'rechazado' && petition.user_id === user?.id && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Trámite Rechazado - Requiere Subsanación</h3>
                <p className="text-sm text-red-800 mb-3">
                  Su trámite ha sido rechazado. Por favor, revise las notas del gestor y cargue los documentos solicitados para subsanar.
                </p>
                {petition.notas && (
                  <div className="bg-white p-3 rounded-md border border-red-200 mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-1">Motivo del Rechazo:</p>
                    <p className="text-sm text-slate-900">{petition.notas}</p>
                  </div>
                )}
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700 text-white" data-testid="subsanar-button">
                      <Upload className="w-4 h-4 mr-2" />
                      Cargar Documentos de Subsanación
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Subir Documentos de Subsanación</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-slate-600">
                        Sube los documentos corregidos o adicionales solicitados por el gestor.
                      </p>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                        data-testid="upload-files-input"
                      />
                      {files.length > 0 && (
                        <div className="space-y-2">
                          {files.map((file, idx) => (
                            <div key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {file.name}
                            </div>
                          ))}
                        </div>
                      )}
                      <Button onClick={handleFileUpload} className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="confirm-upload-button">
                        Subir Archivos
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {canEdit && !editing && (
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => setEditing(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
            data-testid="edit-button"
          >
            Editar
          </Button>
          <Button
            onClick={() => {
              const url = `${API}/petitions/${id}/export-pdf`;
              window.open(url, '_blank');
              toast.success('Descargando PDF...');
            }}
            variant="outline"
            className="border-emerald-700 text-emerald-700 hover:bg-emerald-50"
            data-testid="export-pdf-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          {user?.role !== 'ciudadano' && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="staff-upload-button">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Archivos
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir Archivos al Trámite</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-slate-600">
                    Los archivos que subas estarán disponibles para el ciudadano.
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    data-testid="staff-upload-input"
                  />
                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, idx) => (
                        <div key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button onClick={handleFileUpload} className="w-full bg-emerald-700 hover:bg-emerald-800" data-testid="confirm-staff-upload">
                    Subir Archivos
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canAssignGestor && (
            <Dialog open={showGestorDialog} onOpenChange={setShowGestorDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="assign-gestor-button">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Asignar Gestor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Asignar Gestor</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={selectedGestor} onValueChange={setSelectedGestor}>
                    <SelectTrigger data-testid="gestor-select">
                      <SelectValue placeholder="Selecciona un gestor" />
                    </SelectTrigger>
                    <SelectContent>
                      {gestores.map((gestor) => (
                        <SelectItem key={gestor.id} value={gestor.id}>
                          {gestor.full_name} ({gestor.role === 'gestor' ? 'Gestor' : 'Gestor Auxiliar'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssignGestor} className="w-full" data-testid="confirm-assign-button">
                    Asignar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Gestores Asignados */}
      {petition.gestores_asignados && petition.gestores_asignados.length > 0 && user?.role !== 'ciudadano' && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900 font-outfit">Gestores Asignados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {petition.gestores_asignados.map((gestorId, idx) => {
                const gestor = gestores.find(g => g.id === gestorId);
                return gestor ? (
                  <Badge key={idx} className="bg-blue-100 text-blue-800" data-testid={`gestor-badge-${idx}`}>
                    {gestor.full_name}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 font-outfit">Información del Solicitante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {editing ? (
            <div className="space-y-4">
              {canEditAllFields && (
                <>
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
                    <SelectItem value="radicado">Radicado</SelectItem>
                    <SelectItem value="asignado">Asignado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                    <SelectItem value="revision">En Revisión</SelectItem>
                    <SelectItem value="devuelto">Devuelto</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
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

      {/* Files Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-slate-900 font-outfit">Documentos Adjuntos</CardTitle>
            {petition.user_id === user?.id && (
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="upload-more-button">
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Más
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Subir Archivos</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files))}
                      data-testid="upload-files-input"
                    />
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, idx) => (
                          <div key={idx} className="text-sm text-slate-700">{file.name}</div>
                        ))}
                      </div>
                    )}
                    <Button onClick={handleFileUpload} className="w-full" data-testid="confirm-upload-button">
                      Subir Archivos
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {petition.archivos && petition.archivos.length > 0 ? (
            <div className="space-y-2">
              {petition.archivos.map((archivo, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-md" data-testid={`file-${idx}`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{archivo.original_name}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay archivos adjuntos</p>
          )}
        </CardContent>
      </Card>

      {/* Historial Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900 font-outfit">Historial del Trámite</CardTitle>
        </CardHeader>
        <CardContent>
          {petition.historial && petition.historial.length > 0 ? (
            <div className="relative space-y-6" data-testid="historial-timeline">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
              
              {petition.historial.map((entry, idx) => {
                const fecha = new Date(entry.fecha);
                const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                // Determine icon and color based on action
                let IconComponent = Calendar;
                let iconBgColor = 'bg-blue-100';
                let iconColor = 'text-blue-600';
                
                if (entry.accion.includes('Radicado')) {
                  IconComponent = FileText;
                  iconBgColor = 'bg-indigo-100';
                  iconColor = 'text-indigo-600';
                } else if (entry.accion.includes('asignado') || entry.accion.includes('Asignado')) {
                  IconComponent = UserPlus;
                  iconBgColor = 'bg-yellow-100';
                  iconColor = 'text-yellow-600';
                } else if (entry.estado_nuevo === 'finalizado') {
                  IconComponent = CheckCircle;
                  iconBgColor = 'bg-emerald-100';
                  iconColor = 'text-emerald-600';
                } else if (entry.estado_nuevo === 'rechazado') {
                  IconComponent = XCircle;
                  iconBgColor = 'bg-red-100';
                  iconColor = 'text-red-600';
                } else if (entry.accion.includes('archivos') || entry.accion.includes('Archivos')) {
                  IconComponent = Upload;
                  iconBgColor = 'bg-purple-100';
                  iconColor = 'text-purple-600';
                }
                
                return (
                  <div key={idx} className="relative flex gap-4 pl-10" data-testid={`historial-entry-${idx}`}>
                    {/* Timeline dot/icon */}
                    <div className={`absolute left-0 ${iconBgColor} p-2 rounded-full`}>
                      <IconComponent className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium text-slate-900">{entry.accion}</p>
                          <span className="text-xs text-slate-500">{fechaFormateada}</span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          Por: <span className="font-medium">{entry.usuario}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({entry.usuario_rol === 'atencion_usuario' ? 'Atención al Usuario' : 
                              entry.usuario_rol === 'gestor_auxiliar' ? 'Gestor Auxiliar' : 
                              entry.usuario_rol.charAt(0).toUpperCase() + entry.usuario_rol.slice(1)})
                          </span>
                        </p>
                        {entry.notas && (
                          <p className="text-sm text-slate-700 mt-2 p-2 bg-white rounded border border-slate-200">
                            {entry.notas}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay historial disponible</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
