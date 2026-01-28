# Comercial Matheus PDV

Sistema de Ponto de Venda (PDV) completo com emissão de NFC-e, desenvolvido para o Comercial Matheus.

## Funcionalidades

### PDV (Ponto de Venda)
- Busca rápida de produtos por nome ou código de barras
- Carrinho de compras com edição de quantidades
- Múltiplas formas de pagamento (Dinheiro, Débito, Crédito, PIX, Prazo)
- Cálculo automático de troco
- Produtos diversos (sem cadastro)
- Suporte a entrega com endereço
- CPF na nota opcional
- Venda a prazo com seleção de cliente e parcelamento

### Gestão de Caixa
- Abertura e fechamento de caixa
- Sangria (retirada) com justificativa
- Suprimento (entrada) com origem
- Relatório de vendas diárias
- Controle de saldo

### Clientes e Fiado
- Cadastro completo de clientes
- Sistema de fiado/crediário
- Controle de parcelas
- Cálculo de juros por atraso
- Histórico de débitos
- Pagamento total ou parcial

### Estoque e Produtos
- Importação de produtos via XML de NFe
- Cadastro manual de produtos
- Ajuste manual de estoque
- Controle de estoque mínimo
- Movimentações de estoque

### Emissão Fiscal (NFC-e)
- Emissão de NFC-e integrada ao PDV
- Comunicação com SEFAZ
- Suporte a certificado A1 e A3 (cartão)
- Geração de DANFE (PDF)
- Armazenamento de XML
- QR Code para consulta

### Outros
- Modo escuro/claro
- Sincronização offline-first
- Impressão de cupom
- Multi-usuário com controle de acesso

## Tecnologias

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (estilização)
- Zustand (gerenciamento de estado)
- Dexie.js (IndexedDB para offline)
- React Hot Toast (notificações)
- Lucide React (ícones)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (autenticação)
- AES-256-GCM (criptografia)

## Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/comercial-matheus-pdv.git
cd comercial-matheus-pdv
```

### 2. Configure o Backend
```bash
cd backend

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações (especialmente DATABASE_URL)

# IMPORTANTE: Gere chaves seguras
openssl rand -hex 32  # Use para JWT_SECRET
openssl rand -hex 32  # Use para ENCRYPTION_KEY

# Execute migrations do banco
npx prisma migrate dev

# Crie usuário admin
npx prisma db seed
```

### 3. Configure o Frontend
```bash
cd ../frontend

# Instale dependências
npm install
```

### 4. Inicie o sistema
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Acesse o sistema
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3333

### Credenciais padrão
- **Usuário**: admin
- **Senha**: admin123

## Estrutura do Projeto

```
comercial-matheus-pdv/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Modelos do banco
│   ├── src/
│   │   ├── lib/               # Conexão Prisma
│   │   ├── middleware/        # Auth middleware
│   │   ├── routes/            # Rotas da API
│   │   ├── services/
│   │   │   └── fiscal/        # Serviços NFC-e
│   │   └── server.ts          # Entrada do servidor
│   └── storage/
│       └── fiscal/            # XMLs e PDFs das notas
│
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── services/          # Serviços de API
│   │   ├── store/             # Estado global (Zustand)
│   │   ├── db/                # IndexedDB (offline)
│   │   └── utils/             # Utilitários
│   └── index.html
│
└── docs/                       # Documentação
```

## Configuração Fiscal (NFC-e)

Para emitir notas fiscais, configure em **Gestão > Configuração Fiscal**:

1. **Dados da Empresa**: CNPJ, Razão Social, Endereço completo
2. **Certificado Digital**: A1 (arquivo .pfx) ou A3 (cartão/token)
3. **CSC**: Código de Segurança do Contribuinte (obtido na SEFAZ)
4. **Ambiente**: Homologação (testes) ou Produção

### Obter CSC na SEFAZ
1. Acesse o portal da SEFAZ do seu estado
2. Faça login com certificado digital
3. Vá em "Serviços > CSC" ou "Código de Segurança"
4. Gere um novo CSC (você receberá ID + Token)

## Scripts Disponíveis

### Backend
```bash
npm run dev      # Inicia em modo desenvolvimento
npm run build    # Compila para produção
npm run start    # Inicia em produção
```

### Frontend
```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Compila para produção
npm run preview  # Preview da build de produção
```

## Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
JWT_SECRET="chave-jwt-minimo-32-caracteres"
ENCRYPTION_KEY="chave-criptografia-minimo-32-caracteres"
PORT=3333
NODE_ENV=development
```

## Segurança

- Autenticação via JWT com expiração
- Senhas criptografadas com bcrypt
- Dados sensíveis (PIN, CSC) criptografados com AES-256-GCM
- Validação de chaves de segurança na inicialização
- Mensagens de erro genéricas para evitar enumeração

## Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório.

## Licença

Este projeto é proprietário do Comercial Matheus.
