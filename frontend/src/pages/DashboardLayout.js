import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { LogOut, FileText, Activity, Users, Menu, X } from 'lucide-react';
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
      coordinador: 'Coordinador'
    };
    return roles[role] || role;
  };

  const menuItems = [
    { path: '/dashboard', label: 'Inicio', icon: Activity },
    { path: '/dashboard/peticiones', label: 'Peticiones', icon: FileText },
  ];

  if (user.role !== 'ciudadano') {
    menuItems.push({ path: '/dashboard/todas-peticiones', label: 'Todas las Peticiones', icon: Users });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex w-64 flex-col bg-emerald-900 text-white border-r border-emerald-800">
        <div className="p-6 border-b border-emerald-800">
          <h2 className="text-2xl font-bold font-outfit" data-testid="sidebar-title">Gestoría Catastral</h2>
          <p className="text-emerald-100 text-sm mt-1">{getRoleName(user.role)}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2" data-testid="sidebar-nav">
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

        <div className="p-4 border-t border-emerald-800">
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
            <div className="p-6 border-b border-emerald-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold font-outfit">Gestoría Catastral</h2>
                <p className="text-emerald-100 text-sm mt-1">{getRoleName(user.role)}</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-white">
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
