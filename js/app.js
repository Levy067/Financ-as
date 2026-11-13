/**
 * Finanças - Gestão - Application Controller
 */

// Estado Global
const _initialNow = new Date();
const APP_STATE = {
  currentDate: new Date(_initialNow.getFullYear(), _initialNow.getMonth(), 1),
  incomes: [],
  expenses: [],
  activeTab: 'dashboard',
  expenseFilter: 'all',
  authMode: 'login',
  currentUser: null,
  charts: {}
};

// Formatação Monetária BRL
const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(val) || 0);
};

// Conversão livre de texto para número aceitando vírgulas, pontos e símbolos
const parseCurrencyInput = (val) => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  let str = String(val).trim().replace(/^R\$\s?/i, '').trim();

  // Caso tenha ponto E vírgula (ex: 1.250,50 ou 1,250.50)
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Padrão brasileiro: 1.250,50 -> remove pontos de milhar e substitui vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão americano: 1,250.50 -> remove vírgulas de milhar
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Apenas vírgula: 1250,50 -> 1250.50
    const parts = str.split(',');
    if (parts.length > 2) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (str.includes('.')) {
    // Apenas ponto
    const parts = str.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos (ex: 1.000.000)
      str = str.replace(/\./g, '');
    } else if (parts[1] && parts[1].length === 3 && parts[0].length >= 1) {
      // Ponto único de milhar no Brasil (ex: 1.500)
      str = parts[0] + parts[1];
    }
    // Senão (ex: 1250.50 ou 10.5), mantém o ponto como separador decimal
  }

  // Remove qualquer caractere restante não numérico (exceto hífen e ponto)
  str = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

// Nome do mês em português
const getMonthName = (date) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

// Chave do mês YYYY-MM
const getMonthKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

// Armazenamento Local
const STORAGE_KEY = 'FinancaLar_Data_v1';

const saveToLocalStorage = () => {
  const data = {
    incomes: APP_STATE.incomes,
    expenses: APP_STATE.expenses
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

  // Sincronizar com a nuvem (Firebase) se estiver ativo
  if (window.FirebaseService && FirebaseService.isInitialized) {
    FirebaseService.syncToCloud(APP_STATE.incomes, APP_STATE.expenses);
  }
};

const loadFromLocalStorage = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      APP_STATE.incomes = parsed.incomes || [];
      APP_STATE.expenses = parsed.expenses || [];
      return true;
    } catch (e) {
      console.error('Erro ao ler dados locais:', e);
    }
  }
  return false;
};

// Dados de Exemplo Inicial (para demonstrar a ferramenta pronta ao abrir)
const seedDefaultData = () => {
  const monthKey = getMonthKey(APP_STATE.currentDate);
  APP_STATE.incomes = [
    { id: 'inc_1', desc: 'Salário Principal', amount: 5200, day: 5, category: 'Salário', monthKey },
    { id: 'inc_2', desc: 'Freelance Design', amount: 950, day: 15, category: 'Freelance / Extra', monthKey },
    { id: 'inc_3', desc: 'Vale Alimentação', amount: 600, day: 1, category: 'Benefícios', monthKey }
  ];

  APP_STATE.expenses = [
    { id: 'exp_1', desc: 'Aluguel do Imóvel', amount: 1650, day: 10, category: 'Moradia', paid: true, monthKey },
    { id: 'exp_2', desc: 'Condomínio Residencial', amount: 380, day: 12, category: 'Moradia', paid: true, monthKey },
    { id: 'exp_3', desc: 'Conta de Energia (Luz)', amount: 245, day: 15, category: 'Serviços Essenciais', paid: false, monthKey },
    { id: 'exp_4', desc: 'Conta de Água e Esgoto', amount: 85, day: 18, category: 'Serviços Essenciais', paid: false, monthKey },
    { id: 'exp_5', desc: 'Internet Fibra 500MB', amount: 129.90, day: 20, category: 'Internet & Telefone', paid: true, monthKey },
    { id: 'exp_6', desc: 'Supermercado Mensal', amount: 1200, day: 8, category: 'Alimentação', paid: true, monthKey },
    { id: 'exp_7', desc: 'Combustível / Transporte', amount: 350, day: 22, category: 'Transporte', paid: false, monthKey },
    { id: 'exp_8', desc: 'Plano de Saúde Familiar', amount: 480, day: 25, category: 'Saúde & Seguros', paid: false, monthKey },
    { id: 'exp_9', desc: 'Netflix & Spotify', amount: 79.80, day: 14, category: 'Assinaturas & Lazer', paid: true, monthKey }
  ];

  saveToLocalStorage();
};

// Obter dados do mês ativo
const getCurrentMonthIncomes = () => {
  const mk = getMonthKey(APP_STATE.currentDate);
  return APP_STATE.incomes.filter(i => i.monthKey === mk);
};

const getCurrentMonthExpenses = () => {
  const mk = getMonthKey(APP_STATE.currentDate);
  return APP_STATE.expenses.filter(e => e.monthKey === mk);
};

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', async () => {
  const hasLoaded = loadFromLocalStorage();
  if (!hasLoaded || (APP_STATE.incomes.length === 0 && APP_STATE.expenses.length === 0)) {
    seedDefaultData();
  }

  setupEventListeners();
  updateMonthHeader();
  renderAll();
  calculateSimulation();

  // Inicializar Firebase Auth e Firestore
  if (window.FirebaseService) {
    await FirebaseService.init();
    FirebaseService.initAuth((user) => {
      handleAuthStateChanged(user);
    });
  }

  // Inicializar Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Configuração dos ouvintes de eventos
const setupEventListeners = () => {
  // Navegação de Abas
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Botões de Mês Anterior / Próximo
  document.getElementById('btn-prev-month').addEventListener('click', () => {
    APP_STATE.currentDate = new Date(
      APP_STATE.currentDate.getFullYear(),
      APP_STATE.currentDate.getMonth() - 1,
      1
    );
    updateMonthHeader();
    renderAll();
  });

  document.getElementById('btn-next-month').addEventListener('click', () => {
    APP_STATE.currentDate = new Date(
      APP_STATE.currentDate.getFullYear(),
      APP_STATE.currentDate.getMonth() + 1,
      1
    );
    updateMonthHeader();
    renderAll();
  });

  // Botões Rápidos do Topo
  document.getElementById('btn-quick-income').addEventListener('click', () => openModal('income'));
  document.getElementById('btn-quick-expense').addEventListener('click', () => openModal('expense'));

  // Submissão do Formulário de Despesas
  document.getElementById('form-expense').addEventListener('submit', (e) => {
    e.preventDefault();
    handleExpenseSubmit();
  });

  // Submissão do Formulário de Receitas
  document.getElementById('form-income').addEventListener('submit', (e) => {
    e.preventDefault();
    handleIncomeSubmit();
  });

  // Submissão do Formulário de Configuração do Firebase
  const formFb = document.getElementById('form-firebase');
  if (formFb) {
    formFb.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFirebaseConfigSubmit();
    });
  }

  // Submissão do Formulário de Autenticação (Login / Cadastro)
  const formAuth = document.getElementById('form-auth');
  if (formAuth) {
    formAuth.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuthSubmit();
    });
  }

  // Copiar do mês anterior
  document.getElementById('btn-copy-prev-month').addEventListener('click', copyExpensesFromPreviousMonth);

  // Exportar / Importar Backup
  document.getElementById('btn-export-backup').addEventListener('click', exportBackupJSON);
  document.getElementById('file-import-backup').addEventListener('change', importBackupJSON);

  // Menu Mobile
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navMenu = document.getElementById('nav-menu');
  if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', () => {
      navMenu.classList.toggle('hidden');
    });
  }
};

// Alternância de Abas Laterais
window.switchTab = (tabName) => {
  APP_STATE.activeTab = tabName;

  // Atualizar botões laterais
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Esconder todas as abas e mostrar a selecionada
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
    tab.classList.remove('active');
  });

  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.classList.remove('hidden');
    targetTab.classList.add('active');
  }

  // Atualizar Título no Cabeçalho
  const titles = {
    dashboard: { title: 'Visão Geral', sub: 'Resumo financeiro e indicadores de saúde do orçamento' },
    receitas: { title: 'Receitas Recebidas no Mês', sub: 'Registro detalhado de salários, rendas extras e benefícios' },
    despesas: { title: 'Despesas Fixas da Casa', sub: 'Controle de contas fixas, parcelas e status de pagamento' },
    economia: { title: 'Dicas de Economia Inteligente', sub: 'Sugestões automáticas calculadas para reduzir custos familiares' },
    simulador: { title: 'Simulador de Investimento & Metas', sub: 'Calcule o poder dos juros compostos com pequenas economias' },
    relatorios: { title: 'Relatórios & Extrato do Mês', sub: 'Visão gráfica da distribuição dos gastos e demonstrativo para impressão' }
  };

  if (titles[tabName]) {
    document.getElementById('page-title').textContent = titles[tabName].title;
    document.getElementById('page-subtitle').textContent = titles[tabName].sub;
  }

  // Redesenhar gráficos ao abrir a aba correspondente
  if (tabName === 'dashboard' || tabName === 'relatorios') {
    setTimeout(renderCharts, 50);
  } else if (tabName === 'simulador') {
    setTimeout(calculateSimulation, 50);
  }

  // Atualizar ícones
  if (window.lucide) window.lucide.createIcons();
};

// Atualiza o mês exibido
const updateMonthHeader = () => {
  const label = getMonthName(APP_STATE.currentDate);
  document.getElementById('current-month-display').textContent = label;

  document.querySelectorAll('.income-banner-month, .expense-banner-month').forEach(el => {
    el.textContent = label;
  });
};

// Renderização Geral
const renderAll = () => {
  const currentIncomes = getCurrentMonthIncomes();
  const currentExpenses = getCurrentMonthExpenses();

  const totalIncome = currentIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenses = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netBalance = totalIncome - totalExpenses;

  // Atualizar Badges do Menu Lateral
  document.getElementById('badge-receitas-count').textContent = currentIncomes.length;
  document.getElementById('badge-despesas-count').textContent = currentExpenses.length;

  // Preview no rodapé da Sidebar
  const sidebarBal = document.getElementById('sidebar-balance-preview');
  sidebarBal.textContent = formatCurrency(netBalance);
  sidebarBal.className = `text-lg font-bold mt-0.5 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const commitmentRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  document.getElementById('sidebar-commitment-rate').textContent = `${commitmentRatio.toFixed(0)}%`;

  // Atualizar Cards da Visão Geral (Dashboard)
  document.getElementById('dash-total-income').textContent = formatCurrency(totalIncome);
  document.getElementById('dash-income-count').textContent = `${currentIncomes.length} entrada(s) registrada(s)`;

  document.getElementById('dash-total-expenses').textContent = formatCurrency(totalExpenses);
  const paidCount = currentExpenses.filter(e => e.paid).length;
  const pendingCount = currentExpenses.length - paidCount;
  document.getElementById('dash-paid-summary').textContent = `${paidCount} pagas`;
  document.getElementById('dash-pending-summary').textContent = `${pendingCount} pendente(s)`;

  const dashBal = document.getElementById('dash-total-balance');
  dashBal.textContent = formatCurrency(netBalance);
  dashBal.className = `text-2xl font-black ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`;

  // Comprometimento e barra de progresso
  const dashCommitment = document.getElementById('dash-commitment-percent');
  const dashBar = document.getElementById('dash-progress-bar');
  const dashBadge = document.getElementById('dash-health-badge');

  dashCommitment.textContent = `${commitmentRatio.toFixed(1)}%`;
  const barWidth = Math.min(commitmentRatio, 100);
  dashBar.style.width = `${barWidth}%`;

  if (commitmentRatio <= 50) {
    dashBar.className = 'bg-emerald-500 h-full rounded-full transition-all duration-500';
    dashBadge.textContent = 'Saudável (<= 50%)';
    dashBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
  } else if (commitmentRatio <= 65) {
    dashBar.className = 'bg-amber-500 h-full rounded-full transition-all duration-500';
    dashBadge.textContent = 'Atenção (50-65%)';
    dashBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800';
  } else {
    dashBar.className = 'bg-rose-500 h-full rounded-full transition-all duration-500';
    dashBadge.textContent = 'Crítico (> 65%)';
    dashBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
  }

  // Cabeçalhos de Receitas e Despesas
  document.getElementById('receitas-header-total').textContent = formatCurrency(totalIncome);
  document.getElementById('receitas-count-label').textContent = `${currentIncomes.length} entrada(s)`;

  document.getElementById('despesas-header-total').textContent = formatCurrency(totalExpenses);

  // Renderizar Tabelas
  renderIncomesTable(currentIncomes);
  renderExpensesTable(currentExpenses);
  renderDashboardExpensesPreview(currentExpenses);

  // Renderizar Inteligência Financeira e Dicas
  renderSmartAnalytics(currentIncomes, currentExpenses, totalIncome, totalExpenses);

  // Renderizar Demonstrativo Financeiro (Relatório)
  renderMonthlyStatement(currentIncomes, currentExpenses, totalIncome, totalExpenses, netBalance);

  // Renderizar Gráficos
  renderCharts();

  if (window.lucide) window.lucide.createIcons();
};

// Renderizar Tabela de Receitas
const renderIncomesTable = (incomes) => {
  const tbody = document.getElementById('incomes-table-body');
  if (incomes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400 text-sm">
          Nenhuma renda cadastrada para este mês. Clique em <strong>"Cadastrar Nova Entrada"</strong> acima para adicionar.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = incomes.map(item => `
    <tr class="hover:bg-slate-50/80 transition-colors">
      <td class="py-3 px-4 font-semibold text-slate-800">${escapeHtml(item.desc)}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          ${escapeHtml(item.category || 'Outros')}
        </span>
      </td>
      <td class="py-3 px-4 text-slate-500 text-xs">Dia ${String(item.day).padStart(2, '0')}</td>
      <td class="py-3 px-4 text-right font-bold text-emerald-600">${formatCurrency(item.amount)}</td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="editIncome('${item.id}')" title="Editar" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteIncome('${item.id}')" title="Excluir" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
};

// Renderizar Tabela de Despesas Fixas
const renderExpensesTable = (expenses) => {
  const tbody = document.getElementById('expenses-table-body');

  let filtered = expenses;
  if (APP_STATE.expenseFilter === 'paid') {
    filtered = expenses.filter(e => e.paid);
  } else if (APP_STATE.expenseFilter === 'pending') {
    filtered = expenses.filter(e => !e.paid);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 text-sm">
          Nenhuma despesa fixa encontrada com o filtro selecionado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr class="hover:bg-slate-50/80 transition-colors ${item.paid ? 'opacity-75 bg-slate-50/40' : ''}">
      <td class="py-3 px-4 text-center">
        <input type="checkbox" ${item.paid ? 'checked' : ''} onchange="toggleExpensePaid('${item.id}')"
          class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" title="Marcar como paga">
      </td>
      <td class="py-3 px-4">
        <span class="font-semibold text-slate-800 ${item.paid ? 'line-through text-slate-500' : ''}">
          ${escapeHtml(item.desc)}
        </span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          ${escapeHtml(item.category || 'Outros')}
        </span>
      </td>
      <td class="py-3 px-4 text-slate-500 text-xs">Dia ${String(item.day).padStart(2, '0')}</td>
      <td class="py-3 px-4 text-right font-bold ${item.paid ? 'text-slate-500' : 'text-rose-600'}">
        ${formatCurrency(item.amount)}
      </td>
      <td class="py-3 px-4 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="editExpense('${item.id}')" title="Editar" class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteExpense('${item.id}')" title="Excluir" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
};

// Renderizar Prévia de Despesas no Dashboard
const renderDashboardExpensesPreview = (expenses) => {
  const container = document.getElementById('dash-expenses-list');
  if (expenses.length === 0) {
    container.innerHTML = `<p class="text-center py-8 text-sm text-slate-400">Nenhuma despesa fixa cadastrada para este mês.</p>`;
    return;
  }

  // Ordenar: primeiro as pendentes por dia de vencimento, depois as pagas
  const sorted = [...expenses].sort((a, b) => {
    if (a.paid === b.paid) return a.day - b.day;
    return a.paid ? 1 : -1;
  });

  const topItems = sorted.slice(0, 6);

  container.innerHTML = topItems.map(item => `
    <div class="py-2.5 flex items-center justify-between gap-3 text-sm">
      <div class="flex items-center gap-3">
        <input type="checkbox" ${item.paid ? 'checked' : ''} onchange="toggleExpensePaid('${item.id}')"
          class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer">
        <div>
          <p class="font-medium text-slate-800 ${item.paid ? 'line-through text-slate-400' : ''}">
            ${escapeHtml(item.desc)}
          </p>
          <span class="text-[11px] text-slate-400">Venc. Dia ${String(item.day).padStart(2, '0')} &bull; ${escapeHtml(item.category)}</span>
        </div>
      </div>
      <div class="text-right">
        <p class="font-bold ${item.paid ? 'text-slate-400' : 'text-rose-600'}">${formatCurrency(item.amount)}</p>
        <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
          ${item.paid ? 'Pago' : 'Pendente'}
        </span>
      </div>
    </div>
  `).join('');
};

// Renderizar Análise Financeira & Dicas
const renderSmartAnalytics = (incomes, expenses, totalIncome, totalExpenses) => {
  const health = FinancialAnalytics.evaluateBudgetHealth(totalIncome, totalExpenses);

  // Card 50/30/20
  document.getElementById('badge-rule-verdict').textContent = health.badgeText;
  document.getElementById('badge-rule-verdict').className = `text-xs px-2.5 py-1 rounded-full font-bold ${health.badgeClass}`;
  document.getElementById('rule-actual-percent').textContent = `${health.ratio.toFixed(1)}% da renda`;
  
  const bar = document.getElementById('rule-actual-bar');
  bar.style.width = `${Math.min(health.ratio, 100)}%`;
  bar.className = `h-full rounded-full transition-all duration-700 ${health.barColor}`;

  document.getElementById('rule-advice-box').innerHTML = `<p>${health.message}</p>`;

  // Banner Inteligente de Destaque no Dashboard
  const topBanner = document.getElementById('top-smart-banner');
  const bannerTag = document.getElementById('banner-tag');
  const bannerTitle = document.getElementById('banner-title');
  const bannerDesc = document.getElementById('banner-desc');

  if (totalExpenses > 0) {
    bannerTag.textContent = health.badgeText;
    if (health.status === 'excelente') {
      bannerTitle.textContent = 'Orçamento Equilibrado e Sob Controle';
      bannerDesc.textContent = `Suas contas fixas representam apenas ${health.ratio.toFixed(1)}% do total recebido. Excelente margem para poupar e investir!`;
    } else if (health.status === 'atencao') {
      bannerTitle.textContent = 'Ponto de Otimização Detectado';
      bannerDesc.textContent = 'Seus gastos fixos ultrapassaram levemente o teto de 50%. Pequenos ajustes nas contas de consumo e assinaturas restauram o equilíbrio.';
    } else {
      bannerTitle.textContent = 'Alerta de Comprometimento Excessivo';
      bannerDesc.textContent = `Suas contas fixas absorvem ${health.ratio.toFixed(1)}% da renda. Confira as sugestões práticas na aba Dicas para liberar fluxo de caixa.`;
    }
  }

  // Reserva de Emergência
  const emergency = FinancialAnalytics.calculateEmergencyFund(totalExpenses);
  document.getElementById('emergency-fixed-cost').textContent = formatCurrency(emergency.monthlyFixed);
  document.getElementById('emergency-3-months').textContent = formatCurrency(emergency.threeMonths);
  document.getElementById('emergency-6-months').textContent = formatCurrency(emergency.sixMonths);

  // Dicas Específicas Personalizadas
  const tips = FinancialAnalytics.generatePersonalizedTips(incomes, expenses);
  const container = document.getElementById('recommendations-container');

  if (tips.length === 0) {
    container.innerHTML = `<p class="col-span-3 text-center py-6 text-slate-400 text-sm">Adicione suas receitas e despesas para ver dicas personalizadas de economia.</p>`;
    return;
  }

  container.innerHTML = tips.map(tip => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="w-9 h-9 rounded-xl ${tip.iconBg} flex items-center justify-center">
            <i data-lucide="${tip.icon}" class="w-5 h-5"></i>
          </div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            ${tip.tag}
          </span>
        </div>
        <h5 class="font-bold text-slate-800 text-sm mb-1">${escapeHtml(tip.title)}</h5>
        <p class="text-xs text-slate-600 leading-relaxed">${tip.desc}</p>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/70 p-2 rounded-xl">
        <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"></i>
        <span>${escapeHtml(tip.potentialSaving)}</span>
      </div>
    </div>
  `).join('');
};

// Renderizar Demonstrativo Financeiro (Aba Relatórios)
const renderMonthlyStatement = (incomes, expenses, totalIncome, totalExpenses, netBalance) => {
  const container = document.getElementById('monthly-statement-content');

  // Total por categoria
  const categoryMap = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + Number(e.amount);
  });

  const categoryRows = Object.keys(categoryMap).map(cat => {
    const amt = categoryMap[cat];
    const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
    return `
      <tr class="text-xs">
        <td class="py-2 px-3 text-slate-700">${cat}</td>
        <td class="py-2 px-3 text-right font-medium text-slate-800">${formatCurrency(amt)}</td>
        <td class="py-2 px-3 text-right text-slate-500">${pct.toFixed(1)}%</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div>
        <span class="text-xs text-slate-500">Total Recebido:</span>
        <p class="text-lg font-bold text-emerald-600">${formatCurrency(totalIncome)}</p>
      </div>
      <div>
        <span class="text-xs text-slate-500">Total Despesas Fixas:</span>
        <p class="text-lg font-bold text-rose-600">${formatCurrency(totalExpenses)}</p>
      </div>
      <div>
        <span class="text-xs text-slate-500">Saldo Disponível:</span>
        <p class="text-lg font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}">${formatCurrency(netBalance)}</p>
      </div>
    </div>

    <div class="mt-4">
      <h5 class="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Detalhamento por Categoria</h5>
      <table class="w-full text-left border border-slate-200 rounded-xl overflow-hidden">
        <thead class="bg-slate-100 text-[11px] text-slate-600 uppercase font-semibold">
          <tr>
            <th class="py-2 px-3">Categoria</th>
            <th class="py-2 px-3 text-right">Valor Consolidado</th>
            <th class="py-2 px-3 text-right">% do Total de Despesas</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${categoryRows || '<tr><td colspan="3" class="p-3 text-center text-xs text-slate-400">Nenhum gasto fixo para detalhar.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
};

// Renderização dos Gráficos via Chart.js
const renderCharts = () => {
  const currentExpenses = getCurrentMonthExpenses();
  const currentIncomes = getCurrentMonthIncomes();

  const totalIncome = currentIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = currentExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const netBalance = Math.max(0, totalIncome - totalExpenses);

  // Categorias
  const catMap = {};
  currentExpenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
  });

  const catLabels = Object.keys(catMap);
  const catValues = Object.values(catMap);

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#64748b', '#14b8a6', '#f97316'
  ];

  // 1. Mini Chart na Visão Geral
  const miniCanvas = document.getElementById('miniCategoryChart');
  const emptyMsg = document.getElementById('chart-empty-msg');

  if (miniCanvas) {
    if (APP_STATE.charts.mini) APP_STATE.charts.mini.destroy();

    if (catValues.length === 0) {
      if (emptyMsg) emptyMsg.classList.remove('hidden');
    } else {
      if (emptyMsg) emptyMsg.classList.add('hidden');
      APP_STATE.charts.mini = new Chart(miniCanvas, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          cutout: '65%'
        }
      });
    }
  }

  // 2. Gráfico Completo na aba Relatórios
  const fullCanvas = document.getElementById('categoryDetailChart');
  if (fullCanvas) {
    if (APP_STATE.charts.detail) APP_STATE.charts.detail.destroy();
    if (catValues.length > 0) {
      APP_STATE.charts.detail = new Chart(fullCanvas, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{
            data: catValues,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }
  }

  // 3. Gráfico de Barras: Renda vs Despesa vs Saldo
  const barCanvas = document.getElementById('balanceBarChart');
  if (barCanvas) {
    if (APP_STATE.charts.balanceBar) APP_STATE.charts.balanceBar.destroy();
    APP_STATE.charts.balanceBar = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels: ['Receita Total', 'Despesas Fixas', 'Saldo Disponível'],
        datasets: [{
          label: 'Valor (R$)',
          data: [totalIncome, totalExpenses, netBalance],
          backgroundColor: ['#10b981', '#f43f5e', '#3b82f6'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => 'R$ ' + value
            }
          }
        }
      }
    });
  }
};

// Simulador de Investimento / Economia
window.calculateSimulation = () => {
  const monthlySave = parseCurrencyInput(document.getElementById('sim-monthly-save').value) || 200;
  const annualRate = parseCurrencyInput(document.getElementById('sim-interest-rate').value) || 10;

  const sim1y = FinancialAnalytics.calculateCompoundGrowth(monthlySave, annualRate, 1);
  const sim3y = FinancialAnalytics.calculateCompoundGrowth(monthlySave, annualRate, 3);
  const sim5y = FinancialAnalytics.calculateCompoundGrowth(monthlySave, annualRate, 5);

  document.getElementById('sim-res-1y').textContent = formatCurrency(sim1y.finalBalance);
  document.getElementById('sim-profit-1y').textContent = `+${formatCurrency(sim1y.profit)} de juros`;

  document.getElementById('sim-res-3y').textContent = formatCurrency(sim3y.finalBalance);
  document.getElementById('sim-profit-3y').textContent = `+${formatCurrency(sim3y.profit)} de juros`;

  document.getElementById('sim-res-5y').textContent = formatCurrency(sim5y.finalBalance);
  document.getElementById('sim-profit-5y').textContent = `+${formatCurrency(sim5y.profit)} de juros`;

  // Gráfico da Simulação
  const simCanvas = document.getElementById('simulationChart');
  if (simCanvas) {
    if (APP_STATE.charts.simulation) APP_STATE.charts.simulation.destroy();

    const labels = ['Hoje', 'Ano 1', 'Ano 2', 'Ano 3', 'Ano 4', 'Ano 5'];
    const dataInvested = [0];
    const dataAccumulated = [0];

    for (let yr = 1; yr <= 5; yr++) {
      const calc = FinancialAnalytics.calculateCompoundGrowth(monthlySave, annualRate, yr);
      dataInvested.push(calc.totalInvested);
      dataAccumulated.push(calc.finalBalance);
    }

    APP_STATE.charts.simulation = new Chart(simCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Patrimônio Total Acumulado (Com Juros)',
            data: dataAccumulated,
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2.5
          },
          {
            label: 'Total Tirado do Bolso (Sem Juros)',
            data: dataInvested,
            borderColor: '#94a3b8',
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => 'R$ ' + v
            }
          }
        }
      }
    });
  }
};

// Filtro de Despesas
window.filterExpenses = (status) => {
  APP_STATE.expenseFilter = status;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.getAttribute('data-status') === status) {
      btn.classList.add('active', 'bg-terracotta-800', 'text-white');
      btn.classList.remove('bg-[#F3EFEA]', 'text-slate-700');
    } else {
      btn.classList.remove('active', 'bg-terracotta-800', 'text-white');
      btn.classList.add('bg-[#F3EFEA]', 'text-slate-700');
    }
  });

  renderExpensesTable(getCurrentMonthExpenses());
};

// Alternar status de pago de uma despesa
window.toggleExpensePaid = (id) => {
  const expense = APP_STATE.expenses.find(e => e.id === id);
  if (expense) {
    expense.paid = !expense.paid;
    saveToLocalStorage();
    renderAll();

    if (expense.paid) {
      showToast(`Despesa "${expense.desc}" marcada como paga!`);
      // Celebrar com confete se todas foram pagas
      const current = getCurrentMonthExpenses();
      if (current.length > 0 && current.every(e => e.paid)) {
        triggerCelebration();
      }
    }
  }
};

// Modal de Abertura / Fechamento
window.openModal = (type) => {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) {
    modal.classList.remove('hidden');
    if (type === 'expense') {
      document.getElementById('form-expense').reset();
      document.getElementById('expense-id').value = '';
      document.getElementById('modal-expense-title').textContent = 'Cadastrar Despesa Fixa';
      document.getElementById('expense-desc').focus();
    } else if (type === 'income') {
      document.getElementById('form-income').reset();
      document.getElementById('income-id').value = '';
      document.getElementById('modal-income-title').textContent = 'Cadastrar Receita / Renda';
      document.getElementById('income-desc').focus();
    } else if (type === 'firebase') {
      const cfg = FirebaseService.getConfig();
      if (cfg) {
        document.getElementById('fb-apiKey').value = cfg.apiKey || '';
        document.getElementById('fb-projectId').value = cfg.projectId || '';
        document.getElementById('fb-authDomain').value = cfg.authDomain || '';
        document.getElementById('fb-storageBucket').value = cfg.storageBucket || '';
        document.getElementById('fb-messagingSenderId').value = cfg.messagingSenderId || '';
        document.getElementById('fb-appId').value = cfg.appId || '';
      }
      const isConnected = FirebaseService.isInitialized;
      document.getElementById('modal-status-dot').className = isConnected ? 'w-2.5 h-2.5 rounded-full bg-emerald-500' : 'w-2.5 h-2.5 rounded-full bg-stone-400';
      document.getElementById('modal-status-text').textContent = isConnected ? 'Conectado à nuvem (Firestore)' : 'Nenhum banco de dados conectado (Usando LocalStorage)';
      document.getElementById('btn-disconnect-firebase').classList.toggle('hidden', !isConnected);
    } else if (type === 'members') {
      renderMembersList(APP_STATE.allPermissions || {});
    }
    if (window.lucide) window.lucide.createIcons();
  }
};

window.closeModal = (type) => {
  const modal = document.getElementById(`modal-${type}`);
  if (modal) modal.classList.add('hidden');
};

// Configuração do Firebase via Modal
const handleFirebaseConfigSubmit = async () => {
  const rawText = document.getElementById('firebase-raw-json').value.trim();
  let config = {};

  if (rawText) {
    // Tentar extrair do texto colado (código JS ou JSON)
    const getField = (name) => {
      const match = rawText.match(new RegExp(`["']?${name}["']?\\s*:\\s*["']([^"']+)["']`));
      return match ? match[1] : '';
    };

    config = {
      apiKey: getField('apiKey') || document.getElementById('fb-apiKey').value.trim(),
      authDomain: getField('authDomain') || document.getElementById('fb-authDomain').value.trim(),
      projectId: getField('projectId') || document.getElementById('fb-projectId').value.trim(),
      storageBucket: getField('storageBucket') || document.getElementById('fb-storageBucket').value.trim(),
      messagingSenderId: getField('messagingSenderId') || document.getElementById('fb-messagingSenderId').value.trim(),
      appId: getField('appId') || document.getElementById('fb-appId').value.trim()
    };
  } else {
    // Ler dos inputs individuais
    config = {
      apiKey: document.getElementById('fb-apiKey').value.trim(),
      authDomain: document.getElementById('fb-authDomain').value.trim(),
      projectId: document.getElementById('fb-projectId').value.trim(),
      storageBucket: document.getElementById('fb-storageBucket').value.trim(),
      messagingSenderId: document.getElementById('fb-messagingSenderId').value.trim(),
      appId: document.getElementById('fb-appId').value.trim()
    };
  }

  if (!config.apiKey || !config.projectId) {
    alert('Por favor, informe ao menos a API Key e o Project ID do Firebase.');
    return;
  }

  const ok = await FirebaseService.saveConfig(config);
  if (ok) {
    // Iniciar listener
    FirebaseService.startRealtimeListener((cloudIncomes, cloudExpenses) => {
      APP_STATE.incomes = cloudIncomes;
      APP_STATE.expenses = cloudExpenses;
      renderAll();
      showToast('Nuvem atualizada em tempo real!');
    });

    // Enviar dados locais para o Firestore
    await FirebaseService.syncToCloud(APP_STATE.incomes, APP_STATE.expenses);

    closeModal('firebase');
    showToast('Conectado ao Firebase com sucesso! Dados sincronizados.');
  } else {
    alert('Não foi possível conectar com essas credenciais. Verifique a API Key e o Project ID.');
  }
};

// Desconectar Firebase
window.disconnectFirebase = () => {
  if (confirm('Deseja desconectar do Firebase? O aplicativo voltará a salvar apenas localmente no navegador.')) {
    FirebaseService.disconnect();
    closeModal('firebase');
    showToast('Firebase desconectado. Modo local ativado.');
  }
};

// Envio do formulário de Despesa
const handleExpenseSubmit = () => {
  const id = document.getElementById('expense-id').value;
  const desc = document.getElementById('expense-desc').value.trim();
  const rawAmount = document.getElementById('expense-val').value;
  const amount = parseCurrencyInput(rawAmount);
  const day = parseInt(document.getElementById('expense-day').value);
  const category = document.getElementById('expense-category').value;
  const paid = document.getElementById('expense-paid').checked;
  const monthKey = getMonthKey(APP_STATE.currentDate);

  if (!desc || isNaN(amount) || amount <= 0) {
    alert('Por favor, informe uma descrição e um valor válido maior que zero (Ex: 150,00 ou 1.250,50).');
    return;
  }

  if (id) {
    // Editar
    const item = APP_STATE.expenses.find(e => e.id === id);
    if (item) {
      item.desc = desc;
      item.amount = amount;
      item.day = day;
      item.category = category;
      item.paid = paid;
    }
    showToast('Despesa atualizada com sucesso!');
  } else {
    // Criar nova
    APP_STATE.expenses.push({
      id: 'exp_' + Date.now(),
      desc,
      amount,
      day: day || 1,
      category,
      paid,
      monthKey
    });
    showToast('Nova despesa cadastrada!');
  }

  saveToLocalStorage();
  closeModal('expense');
  renderAll();
};

// Envio do formulário de Receita
const handleIncomeSubmit = () => {
  const id = document.getElementById('income-id').value;
  const desc = document.getElementById('income-desc').value.trim();
  const rawAmount = document.getElementById('income-val').value;
  const amount = parseCurrencyInput(rawAmount);
  const day = parseInt(document.getElementById('income-day').value);
  const category = document.getElementById('income-category').value;
  const monthKey = getMonthKey(APP_STATE.currentDate);

  if (!desc || isNaN(amount) || amount <= 0) {
    alert('Por favor, informe uma descrição e um valor válido maior que zero (Ex: 1500,00 ou 5.200,00).');
    return;
  }

  if (id) {
    const item = APP_STATE.incomes.find(i => i.id === id);
    if (item) {
      item.desc = desc;
      item.amount = amount;
      item.day = day;
      item.category = category;
    }
    showToast('Receita atualizada com sucesso!');
  } else {
    APP_STATE.incomes.push({
      id: 'inc_' + Date.now(),
      desc,
      amount,
      day: day || 1,
      category,
      monthKey
    });
    showToast('Nova receita adicionada!');
  }

  saveToLocalStorage();
  closeModal('income');
  renderAll();
};

// Editar Despesa
window.editExpense = (id) => {
  const exp = APP_STATE.expenses.find(e => e.id === id);
  if (!exp) return;

  document.getElementById('expense-id').value = exp.id;
  document.getElementById('expense-desc').value = exp.desc;
  document.getElementById('expense-val').value = Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('expense-day').value = exp.day;
  document.getElementById('expense-category').value = exp.category;
  document.getElementById('expense-paid').checked = exp.paid;

  document.getElementById('modal-expense-title').textContent = 'Editar Despesa Fixa';
  document.getElementById('modal-expense').classList.remove('hidden');
};

// Excluir Despesa
window.deleteExpense = (id) => {
  if (confirm('Tem certeza que deseja remover esta despesa?')) {
    APP_STATE.expenses = APP_STATE.expenses.filter(e => e.id !== id);
    saveToLocalStorage();
    renderAll();
    showToast('Despesa removida.');
  }
};

// Editar Receita
window.editIncome = (id) => {
  const inc = APP_STATE.incomes.find(i => i.id === id);
  if (!inc) return;

  document.getElementById('income-id').value = inc.id;
  document.getElementById('income-desc').value = inc.desc;
  document.getElementById('income-val').value = Number(inc.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('income-day').value = inc.day;
  document.getElementById('income-category').value = inc.category;

  document.getElementById('modal-income-title').textContent = 'Editar Receita';
  document.getElementById('modal-income').classList.remove('hidden');
};

// Excluir Receita
window.deleteIncome = (id) => {
  if (confirm('Tem certeza que deseja remover esta receita?')) {
    APP_STATE.incomes = APP_STATE.incomes.filter(i => i.id !== id);
    saveToLocalStorage();
    renderAll();
    showToast('Receita removida.');
  }
};

// Copiar despesas do mês anterior (recurso prático de produtividade)
function copyExpensesFromPreviousMonth() {
  const currentKey = getMonthKey(APP_STATE.currentDate);
  const prevDate = new Date(APP_STATE.currentDate.getFullYear(), APP_STATE.currentDate.getMonth() - 1, 1);
  const prevKey = getMonthKey(prevDate);

  const prevExpenses = APP_STATE.expenses.filter(e => e.monthKey === prevKey);

  if (prevExpenses.length === 0) {
    alert(`Não foram encontradas despesas no mês anterior (${getMonthName(prevDate)}) para copiar.`);
    return;
  }

  const existingInCurrent = APP_STATE.expenses.filter(e => e.monthKey === currentKey);
  if (existingInCurrent.length > 0) {
    if (!confirm(`Este mês já possui ${existingInCurrent.length} despesa(s). Deseja copiar as contas do mês anterior mantendo as que você já cadastrou?`)) {
      return;
    }
  }

  prevExpenses.forEach(item => {
    APP_STATE.expenses.push({
      id: 'exp_' + Math.random().toString(36).substr(2, 9),
      desc: item.desc,
      amount: item.amount,
      day: item.day,
      category: item.category,
      paid: false, // Inicia pendente para o novo mês
      monthKey: currentKey
    });
  });

  saveToLocalStorage();
  renderAll();
  showToast(`${prevExpenses.length} despesas copiadas do mês anterior!`);
}

// Exportar Backup em JSON
function exportBackupJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    incomes: APP_STATE.incomes,
    expenses: APP_STATE.expenses
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_financas_casa_${getMonthKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado com sucesso!');
}

// Importar Backup JSON
function importBackupJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed.incomes) && Array.isArray(parsed.expenses)) {
        APP_STATE.incomes = parsed.incomes;
        APP_STATE.expenses = parsed.expenses;
        saveToLocalStorage();
        renderAll();
        showToast('Backup restaurado com sucesso!');
      } else {
        alert('Formato de arquivo de backup inválido.');
      }
    } catch (err) {
      alert('Erro ao processar arquivo: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// Notificação Toast
const showToast = (msg) => {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (toast && toastMsg) {
    toastMsg.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-20', 'pointer-events-none');
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-20', 'pointer-events-none');
    }, 3200);
  }
};

// Efeito de confetes quando paga todas as contas
const triggerCelebration = () => {
  if (window.confetti) {
    window.confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
};

// Escape contra injeção de HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   CONTROLE DE AUTENTICAÇÃO E SEGURANÇA (FIREBASE AUTH)
   ========================================================= */

// Trata mudança de estado de autenticação (usuário logado / deslogado)
async function handleAuthStateChanged(user) {
  APP_STATE.currentUser = user;
  const overlay = document.getElementById('auth-overlay');
  const userBadge = document.getElementById('user-profile-badge');
  const userEmail = document.getElementById('user-display-email');
  const userInitials = document.getElementById('user-avatar-initials');
  const pendingOverlay = document.getElementById('pending-approval-overlay');
  const navBtnMembers = document.getElementById('nav-btn-members');

  if (user) {
    if (overlay) overlay.classList.add('hidden');
    if (userEmail) userEmail.textContent = user.email || 'Usuário';
    if (userInitials) {
      const initial = (user.email ? user.email.charAt(0) : 'U').toUpperCase();
      userInitials.textContent = initial;
    }

    // 1. Registrar ou checar permissão deste usuário
    await FirebaseService.checkAndRegisterPermission(user);

    // 2. Escutar permissões em tempo real
    FirebaseService.startPermissionsListener((perms) => {
      onPermissionsRealtimeUpdate(perms, user);
    });

  } else {
    // Usuário deslogado
    if (overlay) overlay.classList.remove('hidden');
    if (pendingOverlay) pendingOverlay.classList.add('hidden');
    if (userBadge) userBadge.classList.add('hidden');
    if (navBtnMembers) navBtnMembers.classList.add('hidden');
  }

  if (window.lucide) window.lucide.createIcons();
}

// Atualização de permissões em tempo real
function onPermissionsRealtimeUpdate(perms, user) {
  APP_STATE.allPermissions = perms;
  const myPerm = perms[user.uid] || { status: 'pending', role: 'member' };
  APP_STATE.currentRole = myPerm.role;

  const overlay = document.getElementById('auth-overlay');
  const pendingOverlay = document.getElementById('pending-approval-overlay');
  const userBadge = document.getElementById('user-profile-badge');
  const navBtnMembers = document.getElementById('nav-btn-members');
  const badgePending = document.getElementById('badge-pending-members');

  if (myPerm.status === 'approved') {
    // Usuário APROVADO: Acesso liberado ao aplicativo
    if (overlay) overlay.classList.add('hidden');
    if (pendingOverlay) pendingOverlay.classList.add('hidden');
    if (userBadge) userBadge.classList.remove('hidden');

    // Se for admin, exibe botão de membros e contador de pendentes
    if (myPerm.role === 'admin' && navBtnMembers) {
      navBtnMembers.classList.remove('hidden');

      const pendingCount = Object.keys(perms).filter(uid => perms[uid].status === 'pending').length;
      if (badgePending) {
        if (pendingCount > 0) {
          badgePending.textContent = pendingCount;
          badgePending.classList.remove('hidden');
        } else {
          badgePending.classList.add('hidden');
        }
      }

      // Se o modal de membros estiver aberto, atualiza a lista em tempo real
      const modalMembers = document.getElementById('modal-members');
      if (modalMembers && !modalMembers.classList.contains('hidden')) {
        renderMembersList(perms);
      }
    } else if (navBtnMembers) {
      navBtnMembers.classList.add('hidden');
    }

    // Iniciar escuta dos dados financeiros em tempo real
    FirebaseService.startRealtimeListener((cloudIncomes, cloudExpenses) => {
      APP_STATE.incomes = cloudIncomes;
      APP_STATE.expenses = cloudExpenses;
      const data = {
        incomes: APP_STATE.incomes,
        expenses: APP_STATE.expenses
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      renderAll();
    });

  } else if (myPerm.status === 'pending') {
    // Usuário PENDENTE: Bloqueia acesso e exibe aviso de aprovação do administrador
    if (overlay) overlay.classList.add('hidden');
    if (pendingOverlay) pendingOverlay.classList.remove('hidden');
    if (userBadge) userBadge.classList.add('hidden');
    const pendingEmailSpan = document.getElementById('pending-user-email');
    if (pendingEmailSpan) pendingEmailSpan.textContent = user.email;

  } else if (myPerm.status === 'blocked') {
    // Usuário BLOQUEADO
    alert('Seu acesso a este aplicativo foi bloqueado pelo administrador.');
    FirebaseService.signOut();
  }

  if (window.lucide) window.lucide.createIcons();
}

// Renderiza a lista de membros no modal do Admin
function renderMembersList(perms) {
  const container = document.getElementById('members-list-container');
  const countBadge = document.getElementById('members-count-badge');
  if (!container) return;

  const uids = Object.keys(perms);
  if (countBadge) countBadge.textContent = `${uids.length} membro(s)`;

  if (uids.length === 0) {
    container.innerHTML = `<p class="py-6 text-center text-xs text-slate-400">Nenhuma solicitação ou usuário registrado ainda.</p>`;
    return;
  }

  // Ordenar: pendentes primeiro, depois aprovados
  const sortedUids = [...uids].sort((a, b) => {
    if (perms[a].status === 'pending') return -1;
    if (perms[b].status === 'pending') return 1;
    return 0;
  });

  const currentUid = APP_STATE.currentUser ? APP_STATE.currentUser.uid : null;

  container.innerHTML = sortedUids.map(uid => {
    const m = perms[uid];
    const isSelf = uid === currentUid;
    const isPending = m.status === 'pending';
    const isApproved = m.status === 'approved';
    const isBlocked = m.status === 'blocked';
    const initial = (m.email ? m.email.charAt(0) : 'U').toUpperCase();

    let statusPill = '';
    if (isApproved) {
      statusPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Autorizado</span>`;
    } else if (isPending) {
      statusPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">Aguardando Aprovação</span>`;
    } else {
      statusPill = `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Bloqueado</span>`;
    }

    let actionsHtml = '';
    if (isSelf) {
      actionsHtml = `<span class="text-[11px] text-slate-400 italic">Você (Admin)</span>`;
    } else if (isPending) {
      actionsHtml = `
        <div class="flex items-center gap-1.5">
          <button onclick="approveUser('${uid}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="check" class="w-3.5 h-3.5"></i> Autorizar
          </button>
          <button onclick="blockUser('${uid}')" class="px-2 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition">
            Recusar
          </button>
        </div>
      `;
    } else if (isApproved) {
      actionsHtml = `
        <button onclick="blockUser('${uid}')" class="px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition" title="Bloquear Acesso">
          Bloquear
        </button>
      `;
    } else {
      actionsHtml = `
        <button onclick="approveUser('${uid}')" class="px-2.5 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold transition">
          Reativar
        </button>
      `;
    }

    return `
      <div class="py-3 flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl ${m.role === 'admin' ? 'bg-terracotta-800 text-white' : 'bg-slate-100 text-slate-700'} flex items-center justify-center font-bold text-xs">
            ${initial}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-800">${escapeHtml(m.email)}</span>
              ${m.role === 'admin' ? '<span class="text-[9px] bg-terracotta-100 text-terracotta-800 font-bold px-1.5 py-0.2 rounded">ADMIN</span>' : ''}
            </div>
            <div class="mt-0.5">${statusPill}</div>
          </div>
        </div>
        <div>${actionsHtml}</div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// Ações do Administrador
window.approveUser = async (uid) => {
  const ok = await FirebaseService.approveMember(uid);
  if (ok) {
    showToast('Acesso autorizado com sucesso!');
  } else {
    alert('Erro ao autorizar usuário.');
  }
};

window.blockUser = async (uid) => {
  if (confirm('Deseja bloquear o acesso deste usuário?')) {
    const ok = await FirebaseService.blockMember(uid);
    if (ok) {
      showToast('Usuário bloqueado.');
    } else {
      alert('Erro ao bloquear usuário.');
    }
  }
};

window.checkApprovalStatusAgain = async () => {
  if (APP_STATE.currentUser) {
    await FirebaseService.checkAndRegisterPermission(APP_STATE.currentUser);
    showToast('Status verificado.');
  }
};

// Alternar entre modo "Entrar" e "Criar Acesso"
window.setAuthMode = (mode) => {
  APP_STATE.authMode = mode;
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const confirmContainer = document.getElementById('auth-confirm-container');
  const forgotLink = document.getElementById('auth-forgot-link');
  const submitLabel = document.getElementById('btn-auth-label');
  const errBox = document.getElementById('auth-error');
  const succBox = document.getElementById('auth-success');

  if (errBox) errBox.classList.add('hidden');
  if (succBox) succBox.classList.add('hidden');

  if (mode === 'register') {
    tabLogin.className = 'py-2 rounded-lg transition text-slate-600 hover:text-slate-900';
    tabRegister.className = 'py-2 rounded-lg transition bg-white text-slate-800 shadow-sm';
    confirmContainer.classList.remove('hidden');
    forgotLink.classList.add('hidden');
    submitLabel.textContent = 'Criar Conta e Acessar';
  } else {
    tabLogin.className = 'py-2 rounded-lg transition bg-white text-slate-800 shadow-sm';
    tabRegister.className = 'py-2 rounded-lg transition text-slate-600 hover:text-slate-900';
    confirmContainer.classList.add('hidden');
    forgotLink.classList.remove('hidden');
    submitLabel.textContent = 'Entrar no Finanças';
  }

  if (window.lucide) window.lucide.createIcons();
};

// Submissão do formulário de autenticação
async function handleAuthSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const confirmPass = document.getElementById('auth-confirm-password').value;
  const submitBtn = document.getElementById('btn-auth-submit');
  const submitLabel = document.getElementById('btn-auth-label');
  const errBox = document.getElementById('auth-error');
  const errMsg = document.getElementById('auth-error-msg');
  const succBox = document.getElementById('auth-success');

  if (errBox) errBox.classList.add('hidden');
  if (succBox) succBox.classList.add('hidden');

  if (!email || !password) {
    showAuthError('Preencha seu email e senha.');
    return;
  }

  if (APP_STATE.authMode === 'register') {
    if (password.length < 6) {
      showAuthError('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPass) {
      showAuthError('As senhas digitadas não coincidem.');
      return;
    }
  }

  // Estado de carregamento
  submitBtn.disabled = true;
  const originalText = submitLabel.textContent;
  submitLabel.textContent = 'Verificando...';

  try {
    if (APP_STATE.authMode === 'register') {
      await FirebaseService.signUp(email, password);
      showToast('Conta criada com sucesso!');
    } else {
      await FirebaseService.signIn(email, password);
      showToast('Bem-vindo(a) ao Finanças!');
    }
  } catch (error) {
    console.error('Erro de autenticação:', error);
    const friendlyMsg = FirebaseService.formatAuthError(error);
    showAuthError(friendlyMsg);
  } finally {
    submitBtn.disabled = false;
    submitLabel.textContent = originalText;
  }
}

// Exibir mensagem de erro de autenticação
function showAuthError(msg) {
  const errBox = document.getElementById('auth-error');
  const errMsg = document.getElementById('auth-error-msg');
  if (errBox && errMsg) {
    errMsg.textContent = msg;
    errBox.classList.remove('hidden');
  }
  if (window.lucide) window.lucide.createIcons();
}

// Esqueceu a senha
window.handleForgotPassword = async () => {
  const emailInput = document.getElementById('auth-email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showAuthError('Digite seu email no campo acima para enviarmos o link de redefinição.');
    if (emailInput) emailInput.focus();
    return;
  }

  try {
    await FirebaseService.sendPasswordReset(email);
    const succBox = document.getElementById('auth-success');
    const succMsg = document.getElementById('auth-success-msg');
    const errBox = document.getElementById('auth-error');
    if (errBox) errBox.classList.add('hidden');
    if (succBox && succMsg) {
      succMsg.textContent = `Enviamos um link de redefinição para ${email}. Verifique sua caixa de entrada e spam.`;
      succBox.classList.remove('hidden');
    }
    showToast('Email de redefinição enviado!');
  } catch (err) {
    showAuthError(FirebaseService.formatAuthError(err));
  }
};

// Logout
window.handleLogout = async () => {
  if (confirm('Deseja realmente sair da sua conta no Finanças?')) {
    await FirebaseService.signOut();
    showToast('Você saiu da sua conta.');
  }
};
