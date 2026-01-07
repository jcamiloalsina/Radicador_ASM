import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogOut, FileText, Activity, Users, Menu, X, UserCog, BarChart3, PieChart, MapPin, Map } from 'lucide-react';
import { useState } from 'react';

export default function DashboardLayout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      gestor_auxiliar: 'Gestor Auxiliar',
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 flex-col bg-emerald-900 text-white border-r border-emerald-800 overflow-y-auto">
        <div className="p-6 border-b border-emerald-800 flex-shrink-0">
          <img 
            src="/logo_asomunicipios.jpeg" 
            alt="Asomunicipios Logo" 
            className="w-full mb-3 rounded"
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
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-100 hover:bg-emerald-800/50 hover:text-white'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
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
                  src="/logo_asomunicipios.jpeg" 
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
          <div></div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
