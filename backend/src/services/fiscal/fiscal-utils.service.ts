import moment from 'moment-timezone'

/**
 * Utilitários fiscais para NF-e/NFC-e
 */
export class FiscalUtilsService {
  /**
   * Gera a chave de acesso de 44 dígitos
   * Formato: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NUMERO(9) + TIPO_EMISSAO(1) + CODIGO(8) + DV(1)
   */
  generateAccessKey(params: {
    uf: number // Código UF (ex: 35 para SP)
    aamm: string // Ano e mês (ex: "2601" para jan/2026)
    cnpj: string // CNPJ do emitente
    modelo: number // 55 = NF-e, 65 = NFC-e
    serie: number
    numero: number
    tipoEmissao: number // 1=Normal, 9=Contingência
    codigo?: number // Código aleatório (8 dígitos), gerado se não fornecido
  }): string {
    const {
      uf,
      aamm,
      cnpj,
      modelo,
      serie,
      numero,
      tipoEmissao,
      codigo,
    } = params

    // Remove formatação do CNPJ
    const cnpjClean = cnpj.replace(/\D/g, '')

    // Gera código aleatório se não fornecido
    const codigoFinal = codigo || this.generateRandomCode()

    // Monta os 43 primeiros dígitos
    const key43 =
      this.pad(uf, 2) +
      aamm +
      this.pad(cnpjClean, 14) +
      this.pad(modelo, 2) +
      this.pad(serie, 3) +
      this.pad(numero, 9) +
      tipoEmissao.toString() +
      this.pad(codigoFinal, 8)

    // Calcula o dígito verificador (módulo 11)
    const dv = this.calculateMod11(key43)

    return key43 + dv
  }

  /**
   * Gera código aleatório de 8 dígitos
   */
  generateRandomCode(): number {
    return Math.floor(10000000 + Math.random() * 90000000)
  }

  /**
   * Calcula dígito verificador usando módulo 11
   */
  private calculateMod11(value: string): number {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9]
    let sum = 0
    let weightIndex = 0

    // Percorre de trás para frente
    for (let i = value.length - 1; i >= 0; i--) {
      const digit = parseInt(value[i])
      sum += digit * weights[weightIndex % weights.length]
      weightIndex++
    }

    const remainder = sum % 11
    const dv = remainder === 0 || remainder === 1 ? 0 : 11 - remainder

    return dv
  }

  /**
   * Preenche com zeros à esquerda
   */
  private pad(value: number | string, length: number): string {
    return value.toString().padStart(length, '0')
  }

  /**
   * Formata chave de acesso para exibição
   * Exemplo: 3526 0123 4567 8901 2345 6789 0123 4567 8901 2345 6
   */
  formatAccessKey(key: string): string {
    if (key.length !== 44) {
      return key
    }

    const groups = []
    for (let i = 0; i < key.length; i += 4) {
      groups.push(key.substring(i, i + 4))
    }

    return groups.join(' ')
  }

  /**
   * Valida formato de CNPJ
   */
  isValidCnpj(cnpj: string): boolean {
    const clean = cnpj.replace(/\D/g, '')

    if (clean.length !== 14) {
      return false
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(clean)) {
      return false
    }

    // Valida dígitos verificadores
    let sum = 0
    let weight = 5

    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }

    let dv1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    if (parseInt(clean[12]) !== dv1) {
      return false
    }

    sum = 0
    weight = 6

    for (let i = 0; i < 13; i++) {
      sum += parseInt(clean[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }

    let dv2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)

    return parseInt(clean[13]) === dv2
  }

  /**
   * Formata CNPJ
   */
  formatCnpj(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '')
    if (clean.length !== 14) {
      return cnpj
    }
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  /**
   * Valida CPF
   */
  isValidCpf(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, '')

    if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) {
      return false
    }

    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(clean[i]) * (10 - i)
    }

    let dv1 = (sum * 10) % 11
    if (dv1 === 10) dv1 = 0

    if (parseInt(clean[9]) !== dv1) {
      return false
    }

    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(clean[i]) * (11 - i)
    }

    let dv2 = (sum * 10) % 11
    if (dv2 === 10) dv2 = 0

    return parseInt(clean[10]) === dv2
  }

  /**
   * Formata CPF
   */
  formatCpf(cpf: string): string {
    const clean = cpf.replace(/\D/g, '')
    if (clean.length !== 11) {
      return cpf
    }
    return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }

  /**
   * Obtém código da UF
   */
  getUfCode(uf: string): number {
    const ufCodes: { [key: string]: number } = {
      'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17,
      'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29,
      'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35,
      'PR': 41, 'SC': 42, 'RS': 43,
      'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53,
    }

    return ufCodes[uf.toUpperCase()] || 0
  }

  /**
   * Obtém UF pelo código
   */
  getUfByCode(code: number): string {
    const codes: { [key: number]: string } = {
      11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO',
      21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA',
      31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP',
      41: 'PR', 42: 'SC', 43: 'RS',
      50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF',
    }

    return codes[code] || ''
  }

  /**
   * Formata data/hora no padrão da SEFAZ (ISO 8601 com timezone)
   * Exemplo: 2026-01-27T14:30:00-03:00
   */
  formatSefazDateTime(date?: Date): string {
    const d = date || new Date()
    return moment(d).tz('America/Sao_Paulo').format('YYYY-MM-DDTHH:mm:ssZ')
  }

  /**
   * Obtém ano e mês no formato AAMM
   */
  getAamm(date?: Date): string {
    const d = date || new Date()
    return moment(d).format('YYMM')
  }

  /**
   * Mapeia forma de pagamento do sistema para código SEFAZ
   */
  mapPaymentMethod(method: string): string {
    const mapping: { [key: string]: string } = {
      'CASH': '01',      // Dinheiro
      'DEBIT': '04',     // Cartão de Débito
      'CREDIT': '03',    // Cartão de Crédito
      'PIX': '17',       // PIX
      'INSTALLMENT': '00', // Sem pagamento (a prazo)
    }

    return mapping[method] || '99' // Outros
  }

  /**
   * Formata valor monetário para string com 2 casas decimais
   */
  formatCurrency(value: number): string {
    return value.toFixed(2)
  }

  /**
   * Valida NCM (8 dígitos)
   */
  isValidNcm(ncm: string): boolean {
    const clean = ncm.replace(/\D/g, '')
    return clean.length === 8
  }

  /**
   * Formata NCM
   */
  formatNcm(ncm: string): string {
    const clean = ncm.replace(/\D/g, '')
    if (clean.length !== 8) {
      return ncm
    }
    return clean.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')
  }
}

export const fiscalUtilsService = new FiscalUtilsService()
