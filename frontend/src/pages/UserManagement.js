import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';
import { UserCog, Search, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(
        (u) =>
          u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.patch(`${API}/users/role`, {
        user_id: userId,
        new_role: newRole
      });
      toast.success('Rol actualizado exitosamente');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar rol');
    }
  };

  const handleGdbPermissionChange = async (userId, canUpdate) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API}/users/${userId}/gdb-permission?puede_actualizar=${canUpdate}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(canUpdate ? 'Permiso GDB otorgado' : 'Permiso GDB revocado');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar permiso');
    }
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      ciudadano: { label: 'Ciudadano', className: 'bg-blue-100 text-blue-800' },
      atencion_usuario: { label: 'Atención al Usuario', className: 'bg-purple-100 text-purple-800' },
      gestor: { label: 'Gestor', className: 'bg-green-100 text-green-800' },
      gestor_auxiliar: { label: 'Gestor Auxiliar', className: 'bg-teal-100 text-teal-800' },
      coordinador: { label: 'Coordinador', className: 'bg-orange-100 text-orange-800' },
      administrador: { label: 'Administrador', className: 'bg-red-100 text-red-800' },
    };
    const config = roleConfig[role] || roleConfig.ciudadano;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit" data-testid="page-heading">
          Gestión de Usuarios
        </h2>
        <p className="text-slate-600 mt-1">Administra roles y permisos de usuarios</p>
      </div>

      {/* Search */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="pl-10 focus-visible:ring-emerald-600"
              data-testid="search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-600" data-testid="no-users-message">
              No se encontraron usuarios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="border-slate-200 hover:shadow-md transition-shadow" data-testid={`user-card-${user.id}`}>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-outfit text-slate-900" data-testid={`user-name-${user.id}`}>
                      {user.full_name}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1" data-testid={`user-email-${user.id}`}>
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(user.role)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {user.id !== currentUser.id && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`role-${user.id}`} className="text-slate-700">Cambiar Rol</Label>
                      <Select 
                        value={user.role} 
                        onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                      >
                        <SelectTrigger className="focus:ring-emerald-600" data-testid={`role-select-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ciudadano">Ciudadano</SelectItem>
                          <SelectItem value="atencion_usuario">Atención al Usuario</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="gestor_auxiliar">Gestor Auxiliar</SelectItem>
                          <SelectItem value="coordinador">Coordinador</SelectItem>
                          <SelectItem value="administrador">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Permiso GDB solo para gestores */}
                    {user.role === 'gestor' && ['coordinador', 'administrador'].includes(currentUser.role) && (
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2">
                          <Map className="w-4 h-4 text-amber-700" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Permiso Actualizar Base Gráfica</p>
                            <p className="text-xs text-amber-600">Permite subir archivos .gdb al sistema</p>
                          </div>
                        </div>
                        <Switch
                          checked={user.puede_actualizar_gdb || false}
                          onCheckedChange={(checked) => handleGdbPermissionChange(user.id, checked)}
                        />
                      </div>
                    )}
                  </div>
                )}
                {user.id === currentUser.id && (
                  <p className="text-sm text-slate-500 italic">No puedes cambiar tu propio rol</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
