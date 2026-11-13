/**
 * Firebase Database & Authentication Service
 * Gerencia a sincronização em tempo real e autenticação segura com o Google Firebase.
 */

const FirebaseService = {
  db: null,
  auth: null,
  currentUser: null,
  isInitialized: false,
  unsubscribeSnapshot: null,
  unsubscribePermissions: null,
  status: 'disconnected', // 'connected' | 'connecting' | 'disconnected' | 'error'

  /**
   * Obtém a configuração ativa (prioriza o arquivo de configuração oficial)
   */
  getConfig() {
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId && window.FIREBASE_CONFIG.apiKey) {
      return window.FIREBASE_CONFIG;
    }

    const saved = localStorage.getItem('Firebase_User_Config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId && parsed.apiKey) return parsed;
      } catch (e) {
        console.error('Erro ao ler configuração salva do Firebase:', e);
      }
    }

    return null;
  },

  /**
   * Garante que o SDK Auth esteja inicializado de forma resiliente
   */
  async getAuth() {
    if (this.auth) return this.auth;

    const config = this.getConfig();
    if (!config || !config.apiKey || !config.projectId) {
      throw new Error('Configuração do Firebase não encontrada. Verifique as credenciais do projeto.');
    }

    if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
      throw new Error('Carregando biblioteca do Firebase... Aguarde 2 segundos e tente novamente.');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    this.auth = firebase.auth();
    if (firebase.firestore && !this.db) {
      this.db = firebase.firestore();
    }
    this.isInitialized = true;
    this.status = 'connected';
    this.updateUIStatus();
    return this.auth;
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
    if (this.unsubscribePermissions) {
      this.unsubscribePermissions();
      this.unsubscribePermissions = null;
    }
    localStorage.removeItem('Firebase_User_Config');
    this.isInitialized = false;
    this.db = null;
    this.auth = null;
    this.currentUser = null;
    this.status = 'disconnected';
    this.updateUIStatus();
  },

  /**
   * Inicializa a conexão com o Firebase, Firestore e Auth
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

      if (typeof firebase.auth === 'function') {
        this.auth = firebase.auth();
      }

      if (typeof firebase.firestore === 'function') {
        this.db = firebase.firestore();
      }

      this.isInitialized = true;
      this.status = 'connected';
      this.updateUIStatus();

      // Inicia escuta em tempo real se solicitado e já autenticado
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
   * Inicializa o observador de estado de autenticação
   */
  async initAuth(onAuthChange) {
    try {
      const auth = await this.getAuth();
      auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        if (onAuthChange) onAuthChange(user);
      });
    } catch (err) {
      console.warn('Aviso ao inicializar Auth observer:', err);
    }
  },

  /**
   * Login com Email e Senha
   */
  async signIn(email, password) {
    const auth = await this.getAuth();
    return await auth.signInWithEmailAndPassword(email, password);
  },

  /**
   * Criar nova conta familiar
   */
  async signUp(email, password) {
    const auth = await this.getAuth();
    return await auth.createUserWithEmailAndPassword(email, password);
  },

  /**
   * Desconectar usuário
   */
  async signOut() {
    if (this.unsubscribeSnapshot) {
      try { this.unsubscribeSnapshot(); } catch (e) {}
      this.unsubscribeSnapshot = null;
    }
    if (this.unsubscribePermissions) {
      try { this.unsubscribePermissions(); } catch (e) {}
      this.unsubscribePermissions = null;
    }
    try {
      const auth = await this.getAuth();
      if (auth) {
        await auth.signOut();
      }
    } catch (e) {
      console.warn('Erro ao deslogar do Firebase Auth:', e);
    }
    this.currentUser = null;
  },

  /**
   * Enviar email de redefinição de senha
   */
  async sendPasswordReset(email) {
    const auth = await this.getAuth();
    return await auth.sendPasswordResetEmail(email);
  },

  /**
   * Traduz erros do Firebase Auth para português amigável
   */
  formatAuthError(error) {
    const code = error.code || '';
    if (code === 'auth/invalid-email') return 'Formato de email inválido.';
    if (code === 'auth/user-not-found') return 'Nenhuma conta encontrada com este email.';
    if (code === 'auth/wrong-password') return 'Senha incorreta. Tente novamente.';
    if (code === 'auth/email-already-in-use') return 'Este email já está cadastrado. Alterne para a aba "Entrar".';
    if (code === 'auth/weak-password') return 'A senha deve ter no mínimo 6 caracteres.';
    if (code === 'auth/invalid-credential') return 'Email ou senha incorretos.';
    if (code === 'auth/operation-not-allowed') return 'O provedor de E-mail/Senha precisa ser ativado no Firebase Console (Menu: Authentication -> Sign-in method -> E-mail/senha).';
    if (code === 'auth/too-many-requests') return 'Muitas tentativas incorretas. Aguarde alguns instantes.';
    return error.message || 'Erro ao autenticar.';
  },

  /**
   * Registra ou verifica a permissão do usuário no Firestore
   */
  async checkAndRegisterPermission(user) {
    if (!this.db || !user) return { status: 'approved', role: 'admin' };

    const permDoc = this.db.collection('financas_app').doc('permissoes');
    try {
      const snap = await permDoc.get();
      let data = snap.exists ? (snap.data() || {}) : {};

      // Verificar se já existe algum Administrador aprovado no sistema
      const hasApprovedAdmin = Object.values(data).some(u => u.role === 'admin' && u.status === 'approved');

      if (!hasApprovedAdmin || !data[user.uid]) {
        // Se ainda não houver nenhum admin aprovado, este usuário É o Administrador mestre!
        if (!hasApprovedAdmin) {
          data[user.uid] = {
            email: user.email,
            status: 'approved',
            role: 'admin',
            createdAt: Date.now()
          };
        } else {
          // Já existe um admin: este novo membro entra como pending para aprovação
          data[user.uid] = {
            email: user.email,
            status: 'pending',
            role: 'member',
            createdAt: Date.now()
          };
        }
        await permDoc.set(data);
        return data[user.uid];
      }

      return data[user.uid];
    } catch (e) {
      console.error('Erro ao verificar permissão:', e);
      // Em caso de falha de conexão ou primeira inicialização, permitir acesso seguro ao usuário autenticado
      return { status: 'approved', role: 'admin' };
    }
  },

  /**
   * Escuta atualizações de permissões em tempo real
   */
  startPermissionsListener(callback) {
    if (!this.db) return;
    if (this.unsubscribePermissions) {
      this.unsubscribePermissions();
    }
    const permDoc = this.db.collection('financas_app').doc('permissoes');
    this.unsubscribePermissions = permDoc.onSnapshot((snap) => {
      if (snap.exists) {
        callback(snap.data() || {});
      }
    }, (err) => {
      console.warn('Aviso no listener de permissões:', err);
    });
  },

  /**
   * Admin autoriza um membro
   */
  async approveMember(uid) {
    if (!this.db) return false;
    const permDoc = this.db.collection('financas_app').doc('permissoes');
    const snap = await permDoc.get();
    if (snap.exists) {
      const data = snap.data();
      if (data[uid]) {
        data[uid].status = 'approved';
        await permDoc.set(data);
        return true;
      }
    }
    return false;
  },

  /**
   * Admin bloqueia um membro
   */
  async blockMember(uid) {
    if (!this.db) return false;
    const permDoc = this.db.collection('financas_app').doc('permissoes');
    const snap = await permDoc.get();
    if (snap.exists) {
      const data = snap.data();
      if (data[uid]) {
        data[uid].status = 'blocked';
        await permDoc.set(data);
        return true;
      }
    }
    return false;
  },

  /**
   * Admin remove um membro da lista
   */
  async deleteMember(uid) {
    if (!this.db) return false;
    const permDoc = this.db.collection('financas_app').doc('permissoes');
    const snap = await permDoc.get();
    if (snap.exists) {
      const data = snap.data();
      delete data[uid];
      await permDoc.set(data);
      return true;
    }
    return false;
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
        const appState = window.APP_STATE || (typeof APP_STATE !== 'undefined' ? APP_STATE : null);
        if (appState && (appState.incomes.length > 0 || appState.expenses.length > 0)) {
          this.syncToCloud(appState.incomes, appState.expenses);
        }
      }
    }, (error) => {
      console.warn('Aviso no listener do Firestore:', error);
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
      console.warn('syncToCloud ignorado: Firebase não inicializado.');
      return false;
    }

    try {
      this.updateUIStatus('Salvando...');

      // Sanitizar dados para garantir objetos JSON puros sem undefined
      const cleanIncomes = JSON.parse(JSON.stringify(incomes || []));
      const cleanExpenses = JSON.parse(JSON.stringify(expenses || []));

      const docRef = this.db.collection('financas_app').doc('principal');
      await docRef.set({
        incomes: cleanIncomes,
        expenses: cleanExpenses,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      this.updateUIStatus('Nuvem Sincronizada');
      return true;
    } catch (error) {
      console.error('Erro ao enviar dados para a nuvem:', error);
      this.updateUIStatus('Erro ao salvar');
      return false;
    }
  },

  /**
   * Atualiza a pílula de status visual na barra superior (Desktop e Mobile)
   */
  updateUIStatus(customText) {
    const pill = document.getElementById('firebase-status-pill');
    const dot = document.getElementById('firebase-status-dot');
    const label = document.getElementById('firebase-status-label');

    const dotMob = document.getElementById('firebase-status-dot-mob');
    const labelMob = document.getElementById('firebase-status-label-mob');

    let dotClass = 'w-2 h-2 rounded-full bg-stone-400';
    let labelMobText = 'Nuvem';

    if (this.status === 'connected') {
      if (pill) pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm cursor-pointer hover:bg-emerald-100 transition';
      dotClass = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      if (label) label.textContent = customText || 'Nuvem Conectada';
      labelMobText = 'Online';
    } else if (this.status === 'connecting') {
      if (pill) pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-sm cursor-pointer';
      dotClass = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
      if (label) label.textContent = customText || 'Conectando à Nuvem...';
      labelMobText = 'Conectando';
    } else if (this.status === 'error') {
      if (pill) pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300 shadow-sm cursor-pointer hover:bg-rose-100 transition';
      dotClass = 'w-2 h-2 rounded-full bg-rose-500';
      if (label) label.textContent = customText || 'Erro Nuvem (Verificar)';
      labelMobText = 'Erro';
    } else {
      // Disconnected
      if (pill) pill.className = 'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-300 shadow-sm cursor-pointer hover:bg-stone-200 transition';
      dotClass = 'w-2 h-2 rounded-full bg-stone-400';
      if (label) label.textContent = customText || 'Conectar Firebase';
      labelMobText = 'Offline';
    }

    if (dot) dot.className = dotClass;
    if (dotMob) dotMob.className = dotClass;
    if (labelMob) labelMob.textContent = labelMobText;
  }
};

// Exportar explicitamente para o objeto window global
window.FirebaseService = FirebaseService;
