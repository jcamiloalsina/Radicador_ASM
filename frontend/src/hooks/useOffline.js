import { useState, useEffect, useCallback } from 'react';

// IndexedDB for offline data storage
const DB_NAME = 'asomunicipios-offline';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for cached predios
      if (!db.objectStoreNames.contains('predios')) {
        const prediosStore = db.createObjectStore('predios', { keyPath: 'id' });
        prediosStore.createIndex('municipio', 'municipio', { unique: false });
        prediosStore.createIndex('codigo_predial_nacional', 'codigo_predial_nacional', { unique: false });
      }
      
      // Store for cached map tiles
      if (!db.objectStoreNames.contains('mapTiles')) {
        db.createObjectStore('mapTiles', { keyPath: 'url' });
      }
      
      // Store for user preferences
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
      }
    };
  });
};

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState({
    prediosCount: 0,
    lastSync: null
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline data stats
    loadOfflineStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineStats = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('predios', 'readonly');
      const store = tx.objectStore('predios');
      const count = await new Promise((resolve) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
      });
      
      const prefTx = db.transaction('preferences', 'readonly');
      const prefStore = prefTx.objectStore('preferences');
      const lastSync = await new Promise((resolve) => {
        const request = prefStore.get('lastSync');
        request.onsuccess = () => resolve(request.result?.value);
      });
      
      setOfflineData({ prediosCount: count, lastSync });
    } catch (error) {
      console.error('Error loading offline stats:', error);
    }
  };

  // Save predios for offline use
  const savePrediosOffline = useCallback(async (predios) => {
    try {
      const db = await openDB();
      const tx = db.transaction('predios', 'readwrite');
      const store = tx.objectStore('predios');
      
      for (const predio of predios) {
        store.put(predio);
      }
      
      // Save last sync time
      const prefTx = db.transaction('preferences', 'readwrite');
      const prefStore = prefTx.objectStore('preferences');
      prefStore.put({ key: 'lastSync', value: new Date().toISOString() });
      
      await loadOfflineStats();
      console.log(`[Offline] Guardados ${predios.length} predios para uso offline`);
      return true;
    } catch (error) {
      console.error('Error saving predios offline:', error);
      return false;
    }
  }, []);

  // Get predios from offline storage
  const getPrediosOffline = useCallback(async (municipio = null) => {
    try {
      const db = await openDB();
      const tx = db.transaction('predios', 'readonly');
      const store = tx.objectStore('predios');
      
      if (municipio) {
        const index = store.index('municipio');
        return new Promise((resolve) => {
          const request = index.getAll(municipio);
          request.onsuccess = () => resolve(request.result);
        });
      }
      
      return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.error('Error getting offline predios:', error);
      return [];
    }
  }, []);

  // Get single predio by ID
  const getPredioOffline = useCallback(async (id) => {
    try {
      const db = await openDB();
      const tx = db.transaction('predios', 'readonly');
      const store = tx.objectStore('predios');
      
      return new Promise((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
      });
    } catch (error) {
      console.error('Error getting offline predio:', error);
      return null;
    }
  }, []);

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('predios', 'readwrite');
      const store = tx.objectStore('predios');
      store.clear();
      
      await loadOfflineStats();
      console.log('[Offline] Datos offline eliminados');
      return true;
    } catch (error) {
      console.error('Error clearing offline data:', error);
      return false;
    }
  }, []);

  return {
    isOnline,
    offlineData,
    savePrediosOffline,
    getPrediosOffline,
    getPredioOffline,
    clearOfflineData,
    refreshStats: loadOfflineStats
  };
}

export default useOffline;
