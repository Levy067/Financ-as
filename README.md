# Finanças - Gestão 🏠💰

Uma aplicação moderna, intuitiva e completa para controle financeiro doméstico, focada em organização de despesas fixas, acompanhamento de receitas recebidas e sugestões inteligentes para economia familiar.

Agora com **sincronização em nuvem via Google Firebase (Cloud Firestore)** e pronta para **hospedagem gratuita na web**!

---

## ☁️ Conexão com o Banco de Dados Firebase

O aplicativo suporta sincronização automática em tempo real entre celulares, tablets e computadores usando o **Google Cloud Firestore**.

### Passo a passo para ativar seu banco de dados:

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e faça login com sua conta Google.
2. Clique em **Adicionar projeto** e dê um nome (ex: `Financas-Casa`).
3. No menu lateral esquerdo, vá em **Criação** &rarr; **Cloud Firestore** &rarr; clique em **Criar banco de dados**.
4. Escolha o local do servidor (ex: `southamerica-east1` ou padrão) e inicie no **Modo de teste**.
5. Em **Configurações do Projeto** (ícone de engrenagem no topo esquerdo) &rarr; aba **Geral**:
   - Role até a seção *Seus aplicativos* e clique no ícone Web **`</>`**.
   - Dê um apelido (ex: `Financas Web`) e clique em Registrar aplicativo.
   - Copie o bloco de código `firebaseConfig`.
6. Abra o aplicativo **Finanças**, clique no botão **"Conectar Firebase"** na barra superior e cole o código copiado!
7. Pronto! Seus dados agora são salvos na nuvem instantaneamente em tempo real.

---

## 🌐 Subir para o GitHub e Publicar na Web (GitHub Pages)

O repositório Git local já está inicializado e com o primeiro commit pronto! Para enviar ao seu GitHub:

### 1. Crie o repositório no GitHub:
1. Acesse [github.com/new](https://github.com/new).
2. Dê o nome do repositório (ex: `financas`).
3. Deixe como **Public** ou **Private** (não marque inicializar com README).
4. Clique em **Create repository**.

### 2. Vincule e envie os arquivos no terminal:
Abra o terminal na pasta deste projeto e execute:
```bash
git remote add origin https://github.com/Levy067/financas.git
git push -u origin main
```
*(Substitua `financas` pelo nome que você deu ao repositório, caso seja diferente).*

### 3. Ativar Hospedagem Gratuita na Web (GitHub Pages):
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Na seção **Branch**, selecione `main` e a pasta `/(root)`.
4. Clique em **Save**.
5. Em cerca de 1 a 2 minutos, o GitHub fornecerá o link público oficial do seu app (ex: `https://levy067.github.io/financas/`) com HTTPS seguro para você e sua família acessarem de qualquer lugar!

---

## 📌 Funcionalidades do Aplicativo

- 📊 **Visão Geral (Dashboard):** Balanço do mês, taxa de comprometimento, contas pagas/pendentes e gráficos.
- 💵 **Receitas do Mês:** Cadastro flexível de salários e rendas com valores livres (com vírgulas e pontos).
- 📋 **Despesas Fixas:** Acompanhamento por categorias com botão de duplicar contas do mês anterior.
- 💡 **Dicas & Economia Inteligente:** Diagnóstico da Regra 50/30/20, metas de reserva de emergência e alertas de custos altos.
- 🧮 **Simulador de Metas:** Projeção de investimentos a juros compostos em 1, 3 e 5 anos.
- 📈 **Relatórios & Impressão:** Demonstrativo financeiro mensal pronto para conferência.
- 💾 **Backup & Nuvem:** Funciona tanto 100% offline (LocalStorage) quanto online em tempo real (Firebase Firestore).
