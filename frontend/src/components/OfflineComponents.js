import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Download, X, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useOffline } from '../hooks/useOffline';

// Offline Status Indicator
export function OfflineIndicator() {
  const { isOnline, offlineData } = useOffline();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm font-medium">
        Sin conexión - Modo offline
        {offlineData.prediosCount > 0 && (
          <span className="text-amber-100 ml-1">
            ({offlineData.prediosCount} predios disponibles)
          </span>
        )}
      </span>
    </div>
  );
}

// Online Status Restored
export function OnlineIndicator() {
  const { isOnline } = useOffline();
  const [showOnline, setShowOnline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowOnline(true);
      const timer = setTimeout(() => {
        setShowOnline(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);
  
  if (!showOnline) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <Wifi className="w-4 h-4" />
      <span className="text-sm font-medium">Conexión restaurada</span>
    </div>
  );
}

// PWA Install Prompt
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    
    // Check localStorage for dismissed prompt
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show for 7 days after dismissal
      }
    }
    
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // Also show after 30 seconds if not installed
    const timer = setTimeout(() => {
      if (!isInstalled && deferredPrompt) {
        setShowPrompt(true);
      }
    }, 30000);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [isInstalled, deferredPrompt]);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };
  
  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString());
    setShowPrompt(false);
  };
  
  if (!showPrompt || isInstalled) return null;
  
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 bg-white border border-emerald-200 rounded-lg shadow-xl p-4">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-emerald-100 p-2 rounded-lg">
          <Download className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 text-sm">
            Instalar Asomunicipios
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Instala la app para acceder más rápido y usar sin conexión
          </p>
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              onClick={handleInstall}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              Instalar
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs"
            >
              Ahora no
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sync Button for offline data
export function SyncButton({ onSync, municipio }) {
  const { isOnline, savePrediosOffline, offlineData } = useOffline();
  const [syncing, setSyncing] = useState(false);
  
  const handleSync = async () => {
    if (!isOnline || syncing) return;
    
    setSyncing(true);
    try {
      const data = await onSync(municipio);
      if (data && data.length > 0) {
        await savePrediosOffline(data);
      }
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={!isOnline || syncing}
      className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
      title={offlineData.lastSync ? `Última sincronización: ${new Date(offlineData.lastSync).toLocaleString()}` : 'Guardar para uso offline'}
    >
      <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Sincronizando...' : 'Guardar offline'}
    </Button>
  );
}

export default OfflineIndicator;
