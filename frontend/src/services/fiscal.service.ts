import { api } from './api'

export interface FiscalConfig {
  id?: number
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  inscricaoEstadual: string
  inscricaoMunicipal?: string
  crt: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  codigoMunicipio: string
  nomeMunicipio: string
  uf: string
  cep: string
  telefone?: string
  serie: number
  ultimoNumero: number
  ambiente: 'homologacao' | 'producao'
  cscId?: string
  cscToken?: string
  certificateType: 'A1' | 'A3'
  certificateA1?: string
  certificateA1Pass?: string
  certificatePin?: string
  pkcs11Library?: string
}

export interface NFCe {
  id: number
  numero: number
  serie: number
  chaveAcesso: string
  status: string
  protocolo?: string
  dataAutorizacao?: string
  valorTotal: number
  destinatarioCpf?: string
  destinatarioNome?: string
  createdAt: string
}

class FiscalService {
  /**
   * Obtém configuração fiscal ativa
   */
  async getConfig(): Promise<FiscalConfig | null> {
    try {
      const response = await api.get('/fiscal/config')
      return response.data.config
    } catch (error) {
      console.error('Erro ao buscar configuração fiscal:', error)
      return null
    }
  }

  /**
   * Salva configuração fiscal
   */
  async saveConfig(config: FiscalConfig): Promise<boolean> {
    try {
      await api.post('/fiscal/config', config)
      return true
    } catch (error: any) {
      console.error('Erro ao salvar configuração fiscal:', error)
      throw new Error(error.response?.data?.error || 'Erro ao salvar configuração')
    }
  }

  /**
   * Testa certificado digital
   */
  async testCertificate(data: {
    certificateType: 'A1' | 'A3'
    certificateA1?: string
    certificateA1Pass?: string
    certificatePin?: string
    pkcs11Library?: string
  }): Promise<{ success: boolean; message: string; certificateInfo?: any }> {
    try {
      const response = await api.post('/fiscal/config/test-certificate', data)
      return response.data
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao testar certificado'
      }
    }
  }

  /**
   * Emite NFC-e para uma venda
   */
  async emitNFCe(saleId: number): Promise<{ success: boolean; message: string; nfce?: any }> {
    try {
      const response = await api.post('/fiscal/nfce/emit', { saleId })
      return {
        success: true,
        message: response.data.message,
        nfce: response.data.nfce
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao emitir NFC-e'
      }
    }
  }

  /**
   * Busca NFC-e por ID
   */
  async getNFCe(id: number): Promise<NFCe | null> {
    try {
      const response = await api.get(`/fiscal/nfce/${id}`)
      return response.data.nfce
    } catch (error) {
      console.error('Erro ao buscar NFC-e:', error)
      return null
    }
  }

  /**
   * Busca NFC-e de uma venda
   */
  async getNFCeBySale(saleId: number): Promise<NFCe | null> {
    try {
      const response = await api.get(`/fiscal/nfce/sale/${saleId}`)
      return response.data.nfce
    } catch (error) {
      console.error('Erro ao buscar NFC-e:', error)
      return null
    }
  }

  /**
   * Lista NFC-es emitidas
   */
  async listNFCes(filters?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ nfces: NFCe[]; total: number }> {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const response = await api.get(`/fiscal/nfce?${params.toString()}`)
      return {
        nfces: response.data.nfces,
        total: response.data.pagination.total
      }
    } catch (error) {
      console.error('Erro ao listar NFC-es:', error)
      return { nfces: [], total: 0 }
    }
  }

  /**
   * Baixa PDF (DANFE) de uma NFC-e
   */
  async downloadPDF(nfceId: number): Promise<void> {
    try {
      const response = await api.get(`/fiscal/nfce/${nfceId}/pdf`, {
        responseType: 'blob'
      })

      // Cria link de download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `NFC-e-${nfceId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao baixar PDF:', error)
      throw new Error('Erro ao baixar PDF da NFC-e')
    }
  }

  /**
   * Baixa XML de uma NFC-e
   */
  async downloadXML(nfceId: number): Promise<void> {
    try {
      const response = await api.get(`/fiscal/nfce/${nfceId}/xml`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `NFC-e-${nfceId}.xml`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao baixar XML:', error)
      throw new Error('Erro ao baixar XML da NFC-e')
    }
  }

  /**
   * Verifica status do serviço da SEFAZ
   */
  async checkSefazStatus(): Promise<{ online: boolean; message: string }> {
    try {
      const response = await api.get('/fiscal/sefaz/status')
      return response.data
    } catch (error) {
      return {
        online: false,
        message: 'Erro ao verificar status da SEFAZ'
      }
    }
  }
}

export const fiscalService = new FiscalService()
export default fiscalService
