# Documentação de API e Integrações

## Visão Geral

A API do Comercial Matheus PDV é uma API RESTful construída com Express.js que fornece todos os endpoints necessários para o funcionamento do sistema PDV.

**Base URL**: `http://localhost:3333`

## Autenticação

A API utiliza autenticação via JWT (JSON Web Token). Todas as rotas (exceto login e health check) requerem o token no header.

### Header de Autenticação
```
Authorization: Bearer <token>
```

### Obter Token
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Resposta:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador",
    "role": "admin",
    "active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

O token expira em **24 horas**.

---

## Endpoints

### Health Check

#### GET /health
Verifica se a API está funcionando.

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-28T12:00:00.000Z"
}
```

---

### Autenticação

#### POST /auth/login
Realiza login e retorna token JWT.

**Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Resposta (200):**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador",
    "role": "admin",
    "active": true
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Resposta (401):**
```json
{
  "error": "Usuário ou senha inválidos"
}
```

#### GET /auth/verify
Verifica se o token é válido.

**Headers:** `Authorization: Bearer <token>`

**Resposta (200):**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador",
    "role": "admin",
    "active": true
  }
}
```

---

### Produtos

#### GET /products
Lista produtos com paginação e filtros.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| search | string | Busca por nome, código ou EAN |
| marca | string | Filtrar por marca |
| categoria | string | Filtrar por categoria |
| estoqueBaixo | boolean | Apenas produtos com estoque baixo |
| semEstoque | boolean | Apenas produtos sem estoque |
| page | number | Página (default: 1) |
| limit | number | Itens por página (default: 20) |
| orderBy | string | Ordenação: name, preco, estoque |

**Resposta:**
```json
{
  "products": [
    {
      "id": 1,
      "code": "001",
      "barcode": "7891234567890",
      "name": "Produto Exemplo",
      "price": 10.50,
      "cost": 7.00,
      "stock": 100,
      "minStock": 10,
      "brand": "Marca X",
      "category": "Categoria Y",
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### POST /products
Cria novo produto.

**Body:**
```json
{
  "name": "Nome do Produto",
  "barcode": "7891234567890",
  "brand": "Marca",
  "category": "Categoria",
  "cost": 7.00,
  "price": 10.50,
  "profitMargin": 50,
  "minStock": 10,
  "stock": 100
}
```

#### PUT /products/:id
Atualiza produto existente.

**Body:**
```json
{
  "name": "Nome Atualizado",
  "price": 12.00,
  "cost": 8.00,
  "profitMargin": 50,
  "minStock": 15,
  "brand": "Marca",
  "category": "Categoria"
}
```

#### POST /products/:id/adjust-stock
Ajusta estoque de um produto.

**Body:**
```json
{
  "quantity": 50,
  "reason": "Entrada de mercadoria"
}
```

**Nota:** `quantity` pode ser positivo (entrada) ou negativo (saída).

#### GET /products/stock-summary
Retorna resumo do estoque.

**Resposta:**
```json
{
  "totalProdutos": 500,
  "semEstoque": 15,
  "estoqueBaixo": 42,
  "valorTotalCusto": 15000.00,
  "valorTotalVenda": 25000.00
}
```

---

### Vendas

#### POST /sales
Cria nova venda.

**Body:**
```json
{
  "localId": "uuid-local",
  "items": [
    {
      "productId": 1,
      "description": "Produto X",
      "quantity": 2,
      "unitPrice": 10.50,
      "subtotal": 21.00
    }
  ],
  "subtotal": 21.00,
  "discount": 0,
  "total": 21.00,
  "paymentMethod": "cash",
  "paymentDetails": {
    "amountReceived": 50.00,
    "change": 29.00
  },
  "cpf": "12345678900",
  "delivery": {
    "street": "Rua Exemplo",
    "number": "123",
    "neighborhood": "Centro",
    "fullAddress": "Rua Exemplo, 123 - Centro"
  },
  "cashierId": 1
}
```

**Payment Methods:**
- `cash` - Dinheiro
- `debit` - Cartão de Débito
- `credit` - Cartão de Crédito
- `pix` - PIX
- `installment` - Prazo (fiado)

**Para venda a prazo:**
```json
{
  "paymentMethod": "installment",
  "paymentDetails": {
    "customerId": 1,
    "installments": 3
  }
}
```

#### GET /sales
Lista vendas.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| cashierId | number | Filtrar por caixa |
| date | string | Filtrar por data (YYYY-MM-DD) |

#### GET /sales/:id
Retorna detalhes de uma venda.

#### GET /sales/daily-report
Retorna relatório diário de vendas.

**Resposta:**
```json
{
  "salesCount": 25,
  "totalRevenue": 1500.00,
  "totalWithdrawals": 200.00,
  "totalSupplies": 100.00,
  "netTotal": 1400.00,
  "sales": [
    {
      "id": 1,
      "time": "10:30",
      "items": 3,
      "total": 45.50,
      "paymentMethod": "cash"
    }
  ]
}
```

---

### Caixa

#### GET /cashier/current
Retorna caixa aberto atual.

#### POST /cashier/open
Abre o caixa.

**Body:**
```json
{
  "openingBalance": 100.00,
  "observations": "Abertura normal"
}
```

#### POST /cashier/close
Fecha o caixa.

**Body:**
```json
{
  "actualBalance": 1500.00,
  "observations": "Fechamento normal"
}
```

#### POST /cashier/transactions
Registra sangria ou suprimento.

**Body:**
```json
{
  "type": "withdrawal",
  "amount": 100.00,
  "description": "Pagamento de fornecedor",
  "observations": "Fornecedor X - NF 123"
}
```

**Types:** `withdrawal` (sangria) ou `supply` (suprimento)

#### GET /cashier/:id/transactions
Lista transações de um caixa.

#### GET /cashier/:id/summary
Retorna resumo de um caixa.

---

### Clientes

#### GET /customers
Lista todos os clientes com débitos.

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "João Silva",
    "phone": "11999999999",
    "cpf": "12345678900",
    "debts": [
      {
        "id": 1,
        "amount": 100.00,
        "remaining": 50.00,
        "installments": 2,
        "installmentNo": 1,
        "status": "PARTIAL",
        "dueDate": "2026-02-15T00:00:00.000Z",
        "interest": 5.00,
        "total": 55.00,
        "daysOverdue": 13
      }
    ]
  }
]
```

#### GET /customers/:id
Retorna detalhes de um cliente.

#### POST /customers
Cria novo cliente.

**Body:**
```json
{
  "name": "Nome do Cliente",
  "phone": "11999999999",
  "cpf": "12345678900",
  "address": "Endereço completo",
  "birthDate": "1990-01-15"
}
```

#### PUT /customers/:id
Atualiza cliente.

---

### Débitos

#### POST /debts/:id/pay
Paga uma parcela integralmente.

#### POST /debts/:id/partial
Registra pagamento parcial.

**Body:**
```json
{
  "amount": 50.00
}
```

#### POST /debts/customer/:customerId/pay-all
Paga todas as dívidas de um cliente.

---

### NFe (Importação)

#### POST /nfe/import
Importa produtos de um XML de NFe.

**Body:**
```json
{
  "nfe": {
    "numero": "123456",
    "fornecedor": {
      "nome": "Fornecedor X",
      "cnpj": "12345678000190"
    },
    "valorTotal": 5000.00
  },
  "products": [
    {
      "codigo": "001",
      "ean": "7891234567890",
      "nome": "Produto X",
      "ncm": "12345678",
      "unidade": "UN",
      "quantidade": 100,
      "valorUnitario": 10.00,
      "price": 15.00,
      "marca": "Marca X"
    }
  ]
}
```

---

### Fiscal (NFC-e)

#### GET /fiscal/config
Retorna configuração fiscal ativa.

**Resposta:**
```json
{
  "config": {
    "id": 1,
    "cnpj": "12345678000190",
    "razaoSocial": "Comercial Matheus LTDA",
    "nomeFantasia": "Comercial Matheus",
    "inscricaoEstadual": "123456789",
    "logradouro": "Rua Exemplo",
    "numero": "123",
    "bairro": "Centro",
    "nomeMunicipio": "São Paulo",
    "uf": "SP",
    "cep": "01234567",
    "serie": 1,
    "ultimoNumero": 150,
    "ambiente": "homologacao",
    "certificateType": "A3",
    "active": true
  }
}
```

#### POST /fiscal/config
Salva configuração fiscal.

**Body:**
```json
{
  "cnpj": "12345678000190",
  "razaoSocial": "Comercial Matheus LTDA",
  "nomeFantasia": "Comercial Matheus",
  "inscricaoEstadual": "123456789",
  "inscricaoMunicipal": "987654",
  "crt": "1",
  "logradouro": "Rua Exemplo",
  "numero": "123",
  "complemento": "Sala 1",
  "bairro": "Centro",
  "codigoMunicipio": "3550308",
  "nomeMunicipio": "São Paulo",
  "uf": "SP",
  "cep": "01234567",
  "telefone": "11999999999",
  "serie": 1,
  "ultimoNumero": 0,
  "ambiente": "homologacao",
  "cscId": "1",
  "cscToken": "abc123...",
  "certificateType": "A3",
  "certificatePin": "1234"
}
```

#### POST /fiscal/config/test-certificate
Testa se o certificado é válido.

**Body (A1):**
```json
{
  "certificateType": "A1",
  "certificateA1": "base64-do-arquivo-pfx",
  "certificateA1Pass": "senha-do-pfx"
}
```

**Body (A3):**
```json
{
  "certificateType": "A3",
  "certificatePin": "1234",
  "pkcs11Library": "/usr/lib/libeToken.so"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Certificado A3 válido",
  "certificateInfo": {
    "subject": {
      "commonName": "COMERCIAL MATHEUS LTDA:12345678000190",
      "organizationName": "COMERCIAL MATHEUS LTDA"
    },
    "issuer": {
      "commonName": "AC CERTISIGN RFB G5",
      "organizationName": "ICP-Brasil"
    },
    "validFrom": "2025-01-01T00:00:00.000Z",
    "validTo": "2028-01-01T00:00:00.000Z",
    "serialNumber": "123456789",
    "cnpj": "12345678000190"
  }
}
```

#### POST /fiscal/nfce/emit
Emite NFC-e para uma venda.

**Body:**
```json
{
  "saleId": 123
}
```

**Resposta (sucesso):**
```json
{
  "success": true,
  "message": "NFC-e emitida com sucesso",
  "nfce": {
    "id": 1,
    "chaveAcesso": "35260112345678000190650010000001231234567890",
    "protocolo": "135260000123456",
    "status": "AUTORIZADA"
  }
}
```

**Resposta (erro):**
```json
{
  "success": false,
  "error": "Rejeição: CNPJ inválido",
  "status": "REJEITADA"
}
```

#### GET /fiscal/nfce/:id
Retorna detalhes de uma NFC-e.

#### GET /fiscal/nfce/:id/pdf
Baixa o DANFE (PDF) da NFC-e.

**Resposta:** Arquivo PDF

#### GET /fiscal/nfce/:id/xml
Baixa o XML da NFC-e.

**Resposta:** Arquivo XML

#### GET /fiscal/nfce/sale/:saleId
Busca NFC-e de uma venda específica.

#### GET /fiscal/nfce
Lista NFC-es emitidas.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| status | string | AUTORIZADA, REJEITADA, CANCELADA |
| limit | number | Limite de resultados |
| offset | number | Paginação |

#### GET /fiscal/sefaz/status
Verifica status do serviço da SEFAZ.

**Resposta:**
```json
{
  "online": true,
  "message": "Serviço em operação"
}
```

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro interno |

---

## Integração SEFAZ (NFC-e)

### Fluxo de Emissão

1. **Geração da Chave de Acesso** (44 dígitos)
   - UF (2) + AAMM (4) + CNPJ (14) + Modelo (2) + Série (3) + Número (9) + Tipo (1) + Código (8) + DV (1)

2. **Construção do XML**
   - Layout 4.00 da NFC-e
   - Inclui IDE, EMIT, DEST, DET, TOTAL, TRANSP, PAG, INFADIC

3. **Assinatura Digital**
   - XML-DSig com RSA-SHA256
   - Certificado ICP-Brasil (A1 ou A3)

4. **Adição do QR Code**
   - URL de consulta + chave + digest SHA-1 + CSC

5. **Envio para SEFAZ**
   - Web Service SOAP
   - Ambiente: Homologação ou Produção

6. **Processamento da Resposta**
   - Autorizada: salva protocolo
   - Rejeitada: retorna motivo

7. **Geração do DANFE**
   - PDF para impressora térmica (80mm)
   - QR Code para consulta

### URLs dos Web Services (por UF)

Os web services são configurados automaticamente pelo sistema com base na UF configurada.

**Homologação:** `https://homologacao.nfce.fazenda.<uf>.gov.br`
**Produção:** `https://nfce.fazenda.<uf>.gov.br`

### Contingência

O sistema suporta modo de contingência quando a SEFAZ está offline:

1. NFC-e é emitida localmente
2. Marcada como "CONTINGENCIA"
3. Transmitida posteriormente quando SEFAZ voltar

---

## Armazenamento de Documentos Fiscais

Os documentos fiscais são armazenados em:

```
backend/storage/fiscal/nfce/
├── 2026/
│   ├── 01/
│   │   ├── 35260112345678000190650010000001231234567890.xml
│   │   └── 35260112345678000190650010000001231234567890.pdf
│   └── 02/
│       └── ...
```

**Importante:** Mantenha backup destes arquivos por 5 anos (obrigação legal).

---

## Exemplos de Integração

### JavaScript/TypeScript (Axios)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
const { data } = await api.post('/auth/login', {
  username: 'admin',
  password: 'admin123'
});

// Configurar token
api.defaults.headers.Authorization = `Bearer ${data.token}`;

// Criar venda
const sale = await api.post('/sales', {
  items: [...],
  total: 100.00,
  paymentMethod: 'cash'
});

// Emitir NFC-e
const nfce = await api.post('/fiscal/nfce/emit', {
  saleId: sale.data.id
});
```

### cURL
```bash
# Login
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Listar produtos (com token)
curl http://localhost:3333/products \
  -H "Authorization: Bearer <token>"

# Emitir NFC-e
curl -X POST http://localhost:3333/fiscal/nfce/emit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"saleId": 123}'
```

---

## Rate Limiting

Atualmente não há rate limiting implementado. Para produção, recomenda-se implementar limites como:

- Login: 5 tentativas por minuto por IP
- API geral: 100 requisições por minuto por token

---

## Versionamento

A API atual não possui versionamento explícito. Futuras versões serão prefixadas com `/api/v2`, etc.

---

## Suporte

Para dúvidas sobre a API, consulte o código-fonte em:
- Rotas: `backend/src/routes/`
- Serviços: `backend/src/services/`
- Modelos: `backend/prisma/schema.prisma`
