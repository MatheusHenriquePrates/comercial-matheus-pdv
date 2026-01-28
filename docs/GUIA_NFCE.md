# Guia Completo de Emissão de NFC-e - Comercial Matheus PDV

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Obtendo CSC na SEFAZ](#obtendo-csc-na-sefaz)
4. [Configurando o Certificado Digital](#configurando-o-certificado-digital)
5. [Testando em Homologação](#testando-em-homologação)
6. [Emitindo NFC-e](#emitindo-nfc-e)
7. [Produção](#produção)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### O que você precisa ter ANTES de começar:

1. **Certificado Digital e-CNPJ A1 ou A3**
   - Tipo A1: Arquivo .pfx + senha
   - Tipo A3: Cartão/token + PIN + leitor conectado

2. **CNPJ da empresa** inscrito na Receita Federal

3. **Inscrição Estadual** ativa na SEFAZ do seu estado

4. **Credenciamento na SEFAZ** para emissão de NFC-e
   - Acesse o portal da SEFAZ do seu estado
   - Solicite credenciamento para NFC-e (modelo 65)
   - Aguarde aprovação (pode levar alguns dias)

5. **Código CSC** (Código de Segurança do Contribuinte)
   - Obtido após credenciamento na SEFAZ
   - Necessário para QR Code da NFC-e

---

## Configuração Inicial

### 1. Acesse a Configuração Fiscal

1. No sistema, vá em: **Gestão → Configuração Fiscal**
2. Preencha os dados da empresa:

```
DADOS DA EMPRESA:
- CNPJ: 00.000.000/0000-00
- Razão Social: NOME DA EMPRESA LTDA
- Nome Fantasia: MERCADO DO SEU PAI
- Inscrição Estadual: 123456789012
- CRT: 1 (Simples Nacional)

ENDEREÇO:
- Logradouro: RUA EXEMPLO
- Número: 123
- Bairro: CENTRO
- CEP: 01234-567
- Município: SAO PAULO
- Código Município: 3550308 (código IBGE de 7 dígitos)
- UF: SP
- Telefone: (11) 1234-5678

CONFIGURAÇÕES NFC-e:
- Série: 1 (primeira série de NFC-e)
- Último Número: 0 (contador automático)
- Ambiente: Homologação (para testes)
```

3. Clique em **Salvar Configuração**

---

## Obtendo CSC na SEFAZ

O CSC é obrigatório para emissão de NFC-e. Veja como obter:

### São Paulo (SP)

1. Acesse: https://www.nfce.fazenda.sp.gov.br/NFCeSiteContribuinte/
2. Faça login com seu certificado digital
3. Vá em: **Gerenciamento de CSC**
4. Gere dois CSCs:
   - **Ambiente de Homologação** (para testes)
   - **Ambiente de Produção** (para notas reais)

5. Anote o **ID do CSC** (ex: 000001) e o **Token CSC** (string alfanumérica longa)

### Outros Estados

- Acesse o portal da SEFAZ do seu estado
- Procure por "CSC" ou "NFC-e"
- O processo é similar ao de SP

---

## Configurando o Certificado Digital

### Opção A: Certificado A3 (Cartão/Token) - RECOMENDADO

1. Conecte o leitor de cartão ao computador onde roda o backend
2. Insira o cartão/token
3. No sistema, configure:

```
TIPO: A3
PIN do Certificado: [senha do cartão]
Biblioteca PKCS#11: /usr/lib/libaetpkss.so (varia por fabricante)
```

**Caminhos comuns da biblioteca:**
- Safenet/Gemalto: `/usr/lib/libaetpkss.so`
- Watchdata: `/usr/lib/libwdpkcs.so`
- Safesign (Windows): `C:\Windows\System32\aetpkss1.dll`

4. Clique em **Testar Certificado**
5. Se aparecer as informações do certificado (CNPJ, validade), está funcionando!

### Opção B: Certificado A1 (Arquivo .pfx)

1. Converta o arquivo .pfx para Base64:

```bash
# Linux/Mac
cat certificado.pfx | base64 > certificado_base64.txt

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.pfx")) > certificado_base64.txt
```

2. Cole o conteúdo Base64 no campo **Certificado A1**
3. Digite a senha do arquivo .pfx
4. Clique em **Testar Certificado**

---

## Testando em Homologação

### 1. Configure CSC de Homologação

```
ID CSC: 000001 (fornecido pela SEFAZ)
Token CSC: [token fornecido pela SEFAZ - ambiente de homologação]
Ambiente: Homologação
```

### 2. Verifique Status da SEFAZ

- No sistema, vá em: **Ferramentas → Status SEFAZ**
- Deve aparecer: ✅ **Online - Serviço em Operação**
- Se aparecer offline, verifique:
  - Conexão com internet
  - Firewall não está bloqueando
  - URLs da SEFAZ estão corretas

### 3. Faça uma Venda de Teste

1. No PDV, adicione produtos no carrinho
2. Finalize a venda
3. Após finalizar, clique em **Emitir NFC-e**
4. Aguarde processamento (5-10 segundos)
5. Se autorizada: ✅ PDF do cupom será gerado
6. Se rejeitada: ❌ Veja o erro e corrija

### Erros Comuns em Homologação

| Código | Erro | Solução |
|--------|------|---------|
| 539 | CNPJ do Emitente inválido | Verificar CNPJ na configuração |
| 252 | Rejeição: Ambiente de homologação, permite apenas NFC-e modelo 65 | Usar modelo 65 (NFC-e) |
| 214 | Tamanho do XML inválido | Verificar geração do XML |
| 225 | Falha no Schema XML | Verificar campos obrigatórios |

---

## Emitindo NFC-e

### Fluxo Completo

1. **Venda no PDV**
   - Adicione produtos
   - Selecione forma de pagamento
   - Opcionalmente, informe CPF do cliente
   - Finalize a venda

2. **Emissão Automática ou Manual**

   **Opção A - Automática (futura implementação):**
   - Sistema emite NFC-e automaticamente ao finalizar venda

   **Opção B - Manual:**
   - Após finalizar venda, clique em "Emitir NFC-e"
   - Aguarde autorização (5-10s)
   - PDF é gerado automaticamente

3. **Impressão**
   - PDF (DANFE) é salvo em: `storage/fiscal/nfce/2026/01/`
   - Imprima o cupom para o cliente

### O que acontece nos bastidores

```
1. Sistema busca configuração fiscal
2. Incrementa numeração da nota
3. Gera XML da NFC-e (produtos, valores, impostos)
4. Assina XML com certificado digital
5. Adiciona QR Code ao XML
6. Envia para SEFAZ via web service
7. SEFAZ valida e retorna protocolo
8. Sistema salva XML autorizado
9. Gera PDF (DANFE) para impressão
10. Atualiza numeração
```

### Onde ficam os arquivos

```
storage/fiscal/nfce/
├── 2026/
│   ├── 01/  (janeiro)
│   │   ├── 35260123456789012365001000000001001234567.xml
│   │   ├── 35260123456789012365001000000001001234567.pdf
│   │   ├── 35260123456789012365001000000002001234568.xml
│   │   ├── 35260123456789012365001000000002001234568.pdf
│   │   └── ...
│   ├── 02/  (fevereiro)
│   └── ...
```

**IMPORTANTE:** Mantenha esses arquivos por 5 anos (obrigação fiscal).

---

## Produção

### Checklist para ir para Produção

- [ ] Testou pelo menos 10 NFC-es em homologação com sucesso
- [ ] Todos os campos estão corretos (CNPJ, IE, endereço, etc)
- [ ] Certificado digital está válido (não vencido)
- [ ] Obteve CSC de **PRODUÇÃO** na SEFAZ
- [ ] Fez backup do banco de dados
- [ ] Configurou backup automático dos XMLs

### Mudando para Produção

1. Acesse: **Gestão → Configuração Fiscal**
2. Altere:
   ```
   Ambiente: Produção
   ID CSC: [ID do CSC de produção]
   Token CSC: [Token do CSC de produção]
   ```
3. Salve a configuração
4. Teste com uma venda pequena primeiro
5. ⚠️ **ATENÇÃO:** Notas em produção têm validade fiscal!

### Contingência

Se a SEFAZ estiver offline:

1. Sistema automaticamente marca como **Contingência**
2. Nota fica salva localmente
3. Quando SEFAZ voltar, transmita as notas offline
4. (Transmissão de contingência será implementada em versão futura)

---

## Troubleshooting

### Certificado A3 não funciona

**Problema:** Erro ao carregar certificado A3

**Soluções:**
1. Verificar se leitor está conectado e reconhecido
2. Instalar driver do leitor de cartão
3. Verificar caminho da biblioteca PKCS#11
4. Testar PIN (3 tentativas erradas bloqueiam o cartão!)

**Comandos para verificar:**

```bash
# Linux: listar leitores conectados
pcsc_scan

# Verificar se biblioteca existe
ls -la /usr/lib/libaetpkss.so
```

### Erro de conexão com SEFAZ

**Problema:** Timeout ou erro ao conectar

**Soluções:**
1. Verificar conexão com internet
2. Testar URLs da SEFAZ no navegador
3. Verificar firewall/antivírus
4. Portas necessárias: 80, 443

```bash
# Testar conexão
curl -I https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx
```

### Assinatura digital inválida

**Problema:** XML assinado rejeitado pela SEFAZ

**Soluções:**
1. Verificar se certificado está válido (não expirado)
2. Verificar se CNPJ do certificado = CNPJ da configuração
3. Verificar algoritmo de assinatura (deve ser RSA-SHA256)

### XML gerado está incorreto

**Problema:** Campos faltando ou valores errados

**Soluções:**
1. Verificar cadastro de produtos (NCM, CFOP, etc)
2. Verificar configuração fiscal (endereço, códigos)
3. Consultar Manual de Integração da SEFAZ
4. Baixar XML e validar no site da SEFAZ

### Numeração duplicada

**Problema:** Erro de numeração já utilizada

**Soluções:**
1. Verificar campo `ultimoNumero` na configuração
2. Ajustar manualmente se necessário
3. Nunca usar número já autorizado pela SEFAZ

---

## Contatos e Ajuda

### SEFAZ São Paulo
- Portal: https://www.fazenda.sp.gov.br/nfce/
- Telefone: (11) 3243-3000
- Email: atendimentovirtual@fazenda.sp.gov.br

### Certificado Digital
- Consulte a Autoridade Certificadora que emitiu seu certificado
- Certisign: (11) 3993-6600
- Serasa Experian: 0800 721 7777

### Suporte Técnico do Sistema
- GitHub: https://github.com/seu-repo/issues
- Email: suporte@comercialmatheus.com.br

---

## Resumo Rápido

```
1. Obter certificado digital (A1 ou A3)
2. Credenciar na SEFAZ para NFC-e
3. Obter CSC (homologação e produção)
4. Configurar sistema com dados da empresa
5. Testar certificado
6. Emitir 10+ notas em homologação
7. Mudar para produção
8. Imprimir e entregar cupons aos clientes
9. Guardar XMLs por 5 anos
```

---

## Próximos Passos

Funcionalidades planejadas:
- [ ] Emissão automática na finalização da venda
- [ ] Cancelamento de NFC-e
- [ ] Inutilização de numeração
- [ ] Carta de Correção (CC-e)
- [ ] Consulta de notas emitidas
- [ ] Relatórios fiscais
- [ ] Transmissão de contingência
- [ ] Integração com SAT (SP)

---

**Última atualização:** 27 de janeiro de 2026
**Versão do Sistema:** 1.0.0
