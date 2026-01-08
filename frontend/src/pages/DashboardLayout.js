import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogOut, FileText, Activity, Users, Menu, X, UserCog, BarChart3, PieChart, MapPin, Map, Clock, Bell, Shield } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DashboardLayout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cambiosPendientesCount, setCambiosPendientesCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotificaciones();
      // Verificar alerta GDB
      checkGdbAlert();
      // Cargar conteo de cambios pendientes si es coordinador o admin
      if (['administrador', 'coordinador'].includes(user.role)) {
        fetchCambiosPendientes();
      }
    }
  }, [user]);

  const fetchCambiosPendientes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/predios/cambios/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCambiosPendientesCount(response.data.total_pendientes || 0);
    } catch (error) {
      console.error('Error fetching pending changes:', error);
    }
  };

  const fetchNotificaciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificaciones(response.data.notificaciones || []);
      setNoLeidas(response.data.no_leidas || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const checkGdbAlert = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/gdb/verificar-alerta-mensual`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.mostrar_alerta) {
        toast.warning('Recordatorio: Es momento de cargar la base gráfica mensual', {
          duration: 10000,
          action: {
            label: 'Ir a Visor',
            onClick: () => window.location.href = '/dashboard/visor-predios'
          }
        });
      }
    } catch (error) {
      console.error('Error checking GDB alert:', error);
    }
  };

  const marcarLeida = async (notificacionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/notificaciones/${notificacionId}/leer`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificaciones();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/notificaciones/marcar-todas-leidas`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotificaciones();
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  const getRoleName = (role) => {
    const roles = {
      ciudadano: 'Ciudadano',
      atencion_usuario: 'Atención al Usuario',
      gestor: 'Gestor',
      coordinador: 'Coordinador',
      administrador: 'Administrador'
    };
    return roles[role] || role;
  };

  const menuItems = [
    { path: '/dashboard', label: 'Inicio', icon: Activity },
    { path: '/dashboard/peticiones', label: 'Mis Peticiones', icon: FileText },
  ];

  if (user.role !== 'ciudadano') {
    menuItems.push({ path: '/dashboard/todas-peticiones', label: 'Todas las Peticiones', icon: Users });
    menuItems.push({ path: '/dashboard/predios', label: 'Gestión de Predios', icon: MapPin });
    menuItems.push({ path: '/dashboard/visor-predios', label: 'Visor de Predios', icon: Map });
  }

  if (['administrador', 'coordinador'].includes(user.role)) {
    menuItems.push({ path: '/dashboard/pendientes', label: 'Pendientes', icon: Clock });
  }

  if (['administrador', 'coordinador', 'atencion_usuario'].includes(user.role)) {
    menuItems.push({ path: '/dashboard/usuarios', label: 'Gestión de Usuarios', icon: UserCog });
    menuItems.push({ path: '/dashboard/estadisticas', label: 'Estadísticas y Reportes', icon: BarChart3 });
  }

  if (['administrador', 'coordinador'].includes(user.role)) {
    menuItems.push({ path: '/dashboard/permisos', label: 'Gestión de Permisos', icon: Shield });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 flex-col bg-emerald-900 text-white border-r border-emerald-800 overflow-y-auto">
        <div className="p-4 border-b border-emerald-800 flex-shrink-0">
          <img 
            src="/logo-asomunicipios.png" 
            alt="Asomunicipios Logo" 
            className="w-24 mx-auto mb-2 rounded"
            data-testid="sidebar-logo"
          />
          <h2 className="text-xs font-bold font-outfit leading-tight text-center" data-testid="sidebar-title">
            Asociación de Municipios del Catatumbo, Provincia de Ocaña y Sur del Cesar
          </h2>
          <p className="text-emerald-200 text-xs mt-1 text-center font-semibold">– Asomunicipios –</p>
          <p className="text-emerald-100 text-xs mt-2 text-center">{getRoleName(user.role)}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" data-testid="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            // Mostrar badge para Pendientes si hay cambios
            const showBadge = item.path === '/dashboard/pendientes' && cambiosPendientesCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-100 hover:bg-emerald-800/50 hover:text-white'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center">
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </div>
                {showBadge && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {cambiosPendientesCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800 flex-shrink-0">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-medium text-white" data-testid="user-name">{user.full_name}</p>
            <p className="text-xs text-emerald-200" data-testid="user-email">{user.email}</p>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-emerald-100 hover:bg-emerald-800 hover:text-white"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-emerald-900 text-white">
            <div className="p-6 border-b border-emerald-800 flex justify-between items-start">
              <div className="flex-1">
                <img 
                  src="/logo-asomunicipios.png" 
                  alt="Asomunicipios Logo" 
                  className="w-full mb-2 rounded"
                />
                <h2 className="text-xs font-bold font-outfit leading-tight text-center">Asociación de Municipios del Catatumbo, Provincia de Ocaña y Sur del Cesar</h2>
                <p className="text-emerald-200 text-xs mt-1 text-center">– Asomunicipios –</p>
                <p className="text-emerald-100 text-xs mt-1">{getRoleName(user.role)}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white ml-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                      isActive
                        ? 'bg-emerald-800 text-white'
                        : 'text-emerald-100 hover:bg-emerald-800/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-emerald-800">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm font-medium text-white">{user.full_name}</p>
                <p className="text-xs text-emerald-200">{user.email}</p>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                className="w-full justify-start text-emerald-100 hover:bg-emerald-800 hover:text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="h-16 border-b border-slate-200 bg-white flex items-center px-6 justify-between" data-testid="dashboard-header">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-slate-700"
            data-testid="mobile-menu-button"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-slate-900 font-outfit" data-testid="page-title">
            {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
          </h1>
          
          {/* Notificaciones */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {noLeidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>
            
            {/* Dropdown de notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Notificaciones</h3>
                  {noLeidas > 0 && (
                    <button
                      onClick={marcarTodasLeidas}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No hay notificaciones
                    </div>
                  ) : (
                    notificaciones.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!notif.leida ? 'bg-emerald-50' : ''}`}
                        onClick={() => marcarLeida(notif.id)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            notif.tipo === 'warning' ? 'bg-amber-500' :
                            notif.tipo === 'success' ? 'bg-emerald-500' :
                            notif.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{notif.titulo}</p>
                            <p className="text-xs text-slate-500 line-clamp-2">{notif.mensaje}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(notif.fecha).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
