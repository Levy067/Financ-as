/**
 * Analytics & Financial Intelligence Engine
 * Algoritmo de análise para diagnóstico financeiro doméstico e geração de economia
 */

const FinancialAnalytics = {
  /**
   * Avalia o orçamento baseado na regra de ouro 50/30/20
   */
  evaluateBudgetHealth(totalIncome, totalExpenses) {
    if (totalIncome <= 0) {
      return {
        ratio: 0,
        status: 'sem_renda',
        badgeText: 'Sem Renda Registrada',
        badgeClass: 'bg-slate-100 text-slate-600',
        barColor: 'bg-slate-300',
        message: 'Cadastre suas receitas do mês para avaliarmos a saúde do seu orçamento familiar.'
      };
    }

    const ratio = (totalExpenses / totalIncome) * 100;

    if (ratio <= 50) {
      return {
        ratio,
        status: 'excelente',
        badgeText: 'Excelente (Equilibrado)',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        barColor: 'bg-emerald-500',
        message: `Parabéns! Suas despesas fixas consomem <strong>${ratio.toFixed(1)}%</strong> da sua renda. Você está dentro do teto ideal de 50%, garantindo folga para imprevistos, lazer e construção de patrimônio.`
      };
    } else if (ratio <= 60) {
      return {
        ratio,
        status: 'atencao',
        badgeText: 'Atenção Leve',
        badgeClass: 'bg-amber-100 text-amber-800',
        barColor: 'bg-amber-500',
        message: `Suas despesas fixas estão em <strong>${ratio.toFixed(1)}%</strong> da sua renda. É um patamar aceitável, mas qualquer imprevisto pode apertar o orçamento. O ideal é tentar reduzir cerca de R$ ${(totalExpenses - (totalIncome * 0.5)).toFixed(2)} em contas renegociáveis.`
      };
    } else if (ratio <= 75) {
      return {
        ratio,
        status: 'alerta',
        badgeText: 'Alerta Alto',
        badgeClass: 'bg-orange-100 text-orange-800',
        barColor: 'bg-orange-500',
        message: `Cuidado: <strong>${ratio.toFixed(1)}%</strong> da sua receita está comprometida com contas fixas. Sua margem de manobra é muito estreita. Se houver atraso ou despesa médica, o risco de endividamento aumenta.`
      };
    } else {
      return {
        ratio,
        status: 'critico',
        badgeText: 'Crítico (Engessado)',
        badgeClass: 'bg-rose-100 text-rose-800',
        barColor: 'bg-rose-500',
        message: `Atenção máxima: <strong>${ratio.toFixed(1)}%</strong> da sua receita já está consumida por contas fixas. O orçamento familiar está estrangulado. É recomendada a renegociação urgente de planos e a eliminação de assinaturas dispensáveis.`
      };
    }
  },

  /**
   * Calcula as metas da Reserva de Emergência
   */
  calculateEmergencyFund(totalExpenses) {
    return {
      monthlyFixed: totalExpenses,
      threeMonths: totalExpenses * 3,
      sixMonths: totalExpenses * 6
    };
  },

  /**
   * Gera recomendações dinâmicas personalizadas com base nos gastos reais
   */
  generatePersonalizedTips(incomes, expenses) {
    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const tips = [];

    // Agrupar despesas por categoria
    const categoryTotals = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    // 1. Dica de Assinaturas & Streaming
    const subTotal = categoryTotals['Assinaturas & Lazer'] || 0;
    if (subTotal > 90) {
      const estimatedSavingYear = subTotal * 0.5 * 12;
      tips.push({
        id: 'streaming-rotation',
        priority: 'high',
        tag: 'Assinaturas & Lazer',
        icon: 'film',
        iconBg: 'bg-purple-100 text-purple-600',
        title: 'Técnica do Rodízio de Streaming',
        desc: `Você gasta R$ ${subTotal.toFixed(2)}/mês em assinaturas. Em vez de assinar vários streamings juntos, mantenha apenas 1 ativo por mês e cancele os outros.`,
        potentialSaving: `Economia estimada de ~R$ ${estimatedSavingYear.toFixed(2)} ao ano.`
      });
    }

    // 2. Dica de Internet, Celular e TV
    const telecomTotal = categoryTotals['Internet & Telefone'] || 0;
    if (telecomTotal > 140) {
      tips.push({
        id: 'telecom-renegotiation',
        priority: 'medium',
        tag: 'Telefonia & Internet',
        icon: 'phone-call',
        iconBg: 'bg-sky-100 text-sky-600',
        title: 'Renegociação Anual de Planos',
        desc: `Planos de fibra e telefonia móvel baixam de preço a cada 12 meses para novos clientes. Ligue para a sua operadora e solicite equiparação com as promoções vigentes.`,
        potentialSaving: `Geralmente rende desconto de 20% a 35% na fatura mensal.`
      });
    }

    // 3. Dica de Contas de Consumo (Luz, Água, Gás)
    const utilitiesTotal = categoryTotals['Serviços Essenciais'] || 0;
    if (utilitiesTotal > 200 || (totalIncome > 0 && (utilitiesTotal / totalIncome) > 0.08)) {
      tips.push({
        id: 'utilities-efficiency',
        priority: 'medium',
        tag: 'Contas de Consumo',
        icon: 'zap',
        iconBg: 'bg-amber-100 text-amber-600',
        title: 'Auditoria de Aparelhos em Standby e Chuveiro',
        desc: `Aparelhos com luz vermelha acesa (standby) podem representar até 12% da conta de luz. Banhos de 15 min no modo 'Inverno' consomem quase 4 vezes mais energia do que no modo 'Verão'.`,
        potentialSaving: `Redução potencial de R$ 40 a R$ 90/mês na conta de luz.`
      });
    }

    // 4. Dica de Moradia se pesar muito
    const housingTotal = categoryTotals['Moradia'] || 0;
    if (totalIncome > 0 && (housingTotal / totalIncome) > 0.35) {
      tips.push({
        id: 'housing-warning',
        priority: 'high',
        tag: 'Moradia',
        icon: 'home',
        iconBg: 'bg-rose-100 text-rose-600',
        title: 'Alerta de Custo de Moradia Elevado',
        desc: `Sua moradia está absorvendo ${((housingTotal / totalIncome) * 100).toFixed(0)}% da renda familiar (o teto recomendado é 30%). Avalie negociar reajuste do aluguel pelo IPCA ou revisar cotas de condomínio.`,
        potentialSaving: `Priorize manter o restante dos gastos enxutos.`
      });
    }

    // 5. Dica de Supermercado & Alimentação
    const foodTotal = categoryTotals['Alimentação'] || 0;
    if (foodTotal > 500) {
      tips.push({
        id: 'smart-grocery',
        priority: 'medium',
        tag: 'Alimentação',
        icon: 'shopping-cart',
        iconBg: 'bg-emerald-100 text-emerald-600',
        title: 'Compras Estratégicas em Atacarejo',
        desc: `Comprar itens não-perecíveis e produtos de limpeza em atacados quinzenais/mensais com lista fechada reduz em média 18% o gasto total de supermercado.`,
        potentialSaving: `Evite fazer compras no mercado sem lista ou com fome.`
      });
    }

    // 6. Dica Geral de "Pague-se Primeiro"
    if (totalIncome > totalExpenses) {
      const leftover = totalIncome - totalExpenses;
      const suggestedSaving = (leftover * 0.4).toFixed(2);
      tips.push({
        id: 'pay-yourself-first',
        priority: 'low',
        tag: 'Hábito Financeiro',
        icon: 'piggy-bank',
        iconBg: 'bg-teal-100 text-teal-600',
        title: 'Princípio do "Pague-se Primeiro"',
        desc: `Não espere o final do mês para guardar o que sobrar. No dia em que a receita cair na conta, separe imediatamente R$ ${suggestedSaving} e transfira para sua conta de investimento.`,
        potentialSaving: `Garante a formação contínua da sua reserva financeira.`
      });
    } else {
      tips.push({
        id: 'deficit-warning',
        priority: 'critical',
        tag: 'Ação Emergencial',
        icon: 'alert-triangle',
        iconBg: 'bg-rose-100 text-rose-600',
        title: 'Déficit no Orçamento Familiar',
        desc: `Suas despesas fixas superam o valor recebido no mês. É indispensável pausar cartões de crédito e focar exclusivamente nas contas indispensáveis para sobrevivência.`,
        potentialSaving: `Evite entrar no cheque especial ou rotativo.`
      });
    }

    return tips;
  },

  /**
   * Simulação de Juros Compostos para Economia Mensal
   * @param {number} monthlySaving Valor guardado por mês
   * @param {number} annualRate Taxa anual em porcentagem (ex: 10.5)
   * @param {number} years Anos
   */
  calculateCompoundGrowth(monthlySaving, annualRate, years) {
    const monthlyRate = Math.pow(1 + (annualRate / 100), 1 / 12) - 1;
    const months = years * 12;
    
    let totalInvested = 0;
    let balance = 0;
    const progression = [];

    for (let m = 1; m <= months; m++) {
      balance = (balance + monthlySaving) * (1 + monthlyRate);
      totalInvested += monthlySaving;

      if (m % 12 === 0 || m === months) {
        progression.push({
          year: m / 12,
          invested: totalInvested,
          balance: balance,
          profit: balance - totalInvested
        });
      }
    }

    return {
      finalBalance: balance,
      totalInvested: totalInvested,
      profit: balance - totalInvested,
      progression: progression
    };
  }
};
