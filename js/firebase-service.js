/**
 * Firebase Database Service (Cloud Firestore)
 * Gerencia a sincronização em tempo real entre o app e o banco de dados na nuvem.
 */

const FirebaseService = {
  db: null,
  isInitialized: false,
  unsubscribeSnapshot: null,
  status: 'disconnected', // 'connected' | 'connecting' | 'disconnected' | 'error'

  /**
   * Obtém a configuração ativa (prioriza o que foi salvo pelo modal ou arquivo)
   */
  getConfig() {
    const saved = localStorage.getItem('Firebase_User_Config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId && parsed.apiKey) return parsed;
      } catch (e) {
        console.error('Erro ao ler configuração salva do Firebase:', e);
      }
    }

    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId && window.FIREBASE_CONFIG.apiKey) {
      return window.FIREBASE_CONFIG;
    }

    return null;
  },

  /**
   * Salva uma nova configuração de credenciais
   */
  saveConfig(config) {
    localStorage.setItem('Firebase_User_Config', JSON.stringify(config));
    return this.init();
  },

  /**
   * Desconecta o Firebase e volta para modo local
   */
  disconnect() {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    localStorage.removeItem('Firebase_User_Config');
    this.isInitialized = false;
    this.db = null;
    this.status = 'disconnected';
    this.updateUIStatus();
  },

  /**
   * Inicializa a conexão com o Firebase e Firestore
   */
  async init(onDataCallback) {
    const config = this.getConfig();

    if (!config || !config.apiKey || !config.projectId) {
      this.status = 'disconnected';
      this.updateUIStatus();
      return false;
    }

    if (typeof firebase === 'undefined') {
      console.warn('SDK do Firebase não encontrado.');
      this.status = 'error';
      this.updateUIStatus('SDK não carregado');
      return false;
    }

    try {
      this.status = 'connecting';
      this.updateUIStatus('Conectando...');

      // Inicializa se ainda não houver app inicializado
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      this.db = firebase.firestore();

      // Habilitar persistência offline local do Firestore se possível
      try {
        await this.db.enablePersistence({ synchronizeTabs: true });
      } catch (err) {
        // Ignora erro se já ativado ou em abas múltiplas
      }

      this.isInitialized = true;
      this.status = 'connected';
      this.updateUIStatus();

      // Inicia escuta em tempo real
      if (onDataCallback) {
        this.startRealtimeListener(onDataCallback);
      }

      return true;
    } catch (error) {
      console.error('Erro ao conectar ao Firebase:', error);
      this.status = 'error';
      this.updateUIStatus('Erro na conexão');
      return false;
    }
  },

  /**
   * Escuta alterações em tempo real no banco de dados Firestore
   */
  startRealtimeListener(callback) {
    if (!this.db) return;

    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
    }

    const docRef = this.db.collection('financas_app').doc('principal');

    this.unsubscribeSnapshot = docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data && (Array.isArray(data.incomes) || Array.isArray(data.expenses))) {
          callback(data.incomes || [], data.expenses || [], false);
        }
      } else {
        // Documento ainda não existe na nuvem: envia dados locais para inicializar
        this.syncToCloud(APP_STATE.incomes, APP_STATE.expenses);
      }
    }, (error) => {
      console.warn('Aviso no listener do Firestore:', error);
      // Se for permissão de regras do Firestore, orientar o usuário
      if (error.code === 'permission-denied') {
        this.updateUIStatus('Ajuste as Regras no Firebase');
      }
    });
  },

  /**
   * Sincroniza dados locais para a nuvem
   */
  async syncToCloud(incomes, expenses) {
    if (!this.isInitialized || !this.db) {
      return false;
    }

    try {
      const docRef = this.db.collection('financas_app').doc('principal');
      await docRef.set({
        incomes: incomes,
        expenses: expenses,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Erro ao enviar dados para a nuvem:', error);
      return false;
    }
  },

  /**
   * Atualiza a pílula de status visual na barra superior
   */
  updateUIStatus(customText) {
    const pill = document.getElementById('firebase-status-pill');
    const dot = document.getElementById('firebase-status-dot');
    const label = document.getElementById('firebase-status-label');

    if (!pill || !dot || !label) return;

    if (this.status === 'connected') {
      pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm cursor-pointer hover:bg-emerald-100 transition';
      dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      label.textContent = customText || 'Nuvem Conectada';
    } else if (this.status === 'connecting') {
      pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-sm cursor-pointer';
      dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
      label.textContent = customText || 'Conectando à Nuvem...';
    } else if (this.status === 'error') {
      pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 shadow-sm cursor-pointer hover:bg-rose-100 transition';
      dot.className = 'w-2 h-2 rounded-full bg-rose-500';
      label.textContent = customText || 'Erro Nuvem (Verificar)';
    } else {
      // Disconnected
      pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300 shadow-sm cursor-pointer hover:bg-stone-200 transition';
      dot.className = 'w-2 h-2 rounded-full bg-stone-400';
      label.textContent = customText || 'Conectar Firebase';
    }
  }
};
