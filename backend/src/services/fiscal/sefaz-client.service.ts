import soap from 'soap'
import axios from 'axios'
import { parseStringPromise } from 'xml2js'

/**
 * Resultado da autorização da NFC-e
 */
export interface NFCeAuthorizationResult {
  success: boolean
  status: string // cStat
  message: string // xMotivo
  protocol?: string // nProt
  authDate?: Date // dhRecbto
  xmlWithProtocol?: string // XML completo com protocolo
}

/**
 * Cliente para comunicação com web services da SEFAZ
 */
export class SefazClientService {
  /**
   * Obtém a URL do web service por estado e ambiente
   */
  private getWebServiceUrl(
    service: 'NFeAutorizacao' | 'NFeStatusServico' | 'NFeConsultaProtocolo' | 'NFeCancelamento',
    uf: string,
    ambiente: string
  ): string {
    const isProduction = ambiente === 'producao'

    // URLs dos web services por estado
    // NOTA: Estas URLs podem mudar. Consulte https://www.nfe.fazenda.gov.br/portal/webservices.aspx

    const webservices: {
      [key: string]: {
        [key: string]: { producao: string; homologacao: string }
      }
    } = {
      'SP': {
        'NFeAutorizacao': {
          producao: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
          homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx'
        },
        'NFeStatusServico': {
          producao: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
          homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx'
        },
        'NFeConsultaProtocolo': {
          producao: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
          homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx'
        },
        'NFeCancelamento': {
          producao: 'https://nfe.fazenda.sp.gov.br/ws/nfecancelamento4.asmx',
          homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfecancelamento4.asmx'
        }
      },
      // Adicionar outros estados conforme necessário
    }

    const stateServices = webservices[uf.toUpperCase()]
    if (!stateServices || !stateServices[service]) {
      throw new Error(`Web service ${service} não configurado para o estado ${uf}`)
    }

    return isProduction ? stateServices[service].producao : stateServices[service].homologacao
  }

  /**
   * Envia NFC-e para autorização síncrona
   */
  async authorize(xmlSigned: string, uf: string, ambiente: string): Promise<NFCeAuthorizationResult> {
    try {
      // Para NFC-e, usa autorização síncrona (indSinc=1)
      const url = this.getWebServiceUrl('NFeAutorizacao', uf, ambiente)

      // Gera lote único baseado em timestamp
      const loteId = Date.now().toString().substring(3)

      // Monta envelope de envio
      const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <idLote>${loteId}</idLote>
  <indSinc>1</indSinc>
  ${xmlSigned}
</enviNFe>`

      console.log(`[SEFAZ] Enviando NFC-e para autorização: ${url}`)
      console.log(`[SEFAZ] Lote: ${loteId}`)

      // Cria cliente SOAP
      const client = await soap.createClientAsync(url + '?wsdl', {
        disableCache: true,
      })

      // Chama serviço de autorização
      const [result] = await client.nfeAutorizacaoLoteAsync({
        nfeDadosMsg: envelope
      })

      // Parse da resposta
      const response = await this.parseAuthorizationResponse(result.nfeResultMsg)

      return response
    } catch (error: any) {
      console.error('[SEFAZ] Erro na autorização:', error)

      // Verifica se é erro de timeout ou conexão
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          status: '999',
          message: 'Erro de conexão com SEFAZ. Verifique sua conexão com a internet.'
        }
      }

      return {
        success: false,
        status: '999',
        message: `Erro ao comunicar com SEFAZ: ${error.message}`
      }
    }
  }

  /**
   * Parse da resposta de autorização
   */
  private async parseAuthorizationResponse(xmlResponse: string): Promise<NFCeAuthorizationResult> {
    try {
      const parsed = await parseStringPromise(xmlResponse, {
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [(name) => name.replace(/^.+:/, '')] // Remove namespace
      })

      const retEnviNFe = parsed.retEnviNFe || parsed.enviNFe

      if (!retEnviNFe) {
        throw new Error('Resposta inválida da SEFAZ')
      }

      const cStat = retEnviNFe.cStat
      const xMotivo = retEnviNFe.xMotivo

      console.log(`[SEFAZ] Status: ${cStat} - ${xMotivo}`)

      // 100 = Autorizada
      if (cStat === '100') {
        const protNFe = retEnviNFe.protNFe
        const infProt = protNFe?.infProt

        if (!infProt) {
          throw new Error('Protocolo não encontrado na resposta')
        }

        return {
          success: true,
          status: cStat,
          message: xMotivo,
          protocol: infProt.nProt,
          authDate: new Date(infProt.dhRecbto),
          xmlWithProtocol: this.buildXmlWithProtocol(xmlResponse, protNFe)
        }
      }

      // 104 = Lote processado (verificar protocolo de cada nota)
      if (cStat === '104') {
        const protNFe = retEnviNFe.protNFe
        const infProt = protNFe?.infProt

        if (!infProt) {
          return {
            success: false,
            status: cStat,
            message: 'Lote processado mas sem protocolo retornado'
          }
        }

        const cStatNFe = infProt.cStat
        const xMotivoNFe = infProt.xMotivo

        // 100 = Autorizada
        if (cStatNFe === '100') {
          return {
            success: true,
            status: cStatNFe,
            message: xMotivoNFe,
            protocol: infProt.nProt,
            authDate: new Date(infProt.dhRecbto),
            xmlWithProtocol: this.buildXmlWithProtocol(xmlResponse, protNFe)
          }
        }

        // Rejeitada
        return {
          success: false,
          status: cStatNFe,
          message: `Nota rejeitada: ${xMotivoNFe}`
        }
      }

      // Outros status (rejeição, erro, etc)
      return {
        success: false,
        status: cStat,
        message: xMotivo
      }
    } catch (error: any) {
      console.error('[SEFAZ] Erro ao fazer parse da resposta:', error)
      throw new Error(`Erro ao processar resposta da SEFAZ: ${error.message}`)
    }
  }

  /**
   * Constrói XML com protocolo para DANFE
   */
  private buildXmlWithProtocol(xmlResponse: string, protNFe: any): string {
    try {
      // O XML com protocolo deve conter a tag <protNFe> envolvendo a NFC-e
      return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  ${protNFe}
</nfeProc>`
    } catch (error) {
      console.error('[SEFAZ] Erro ao montar XML com protocolo:', error)
      return xmlResponse
    }
  }

  /**
   * Consulta status do serviço da SEFAZ
   */
  async checkStatus(uf: string, ambiente: string): Promise<{
    online: boolean
    message: string
  }> {
    try {
      const url = this.getWebServiceUrl('NFeStatusServico', uf, ambiente)

      const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente === 'producao' ? '1' : '2'}</tpAmb>
  <cUF>${this.getUfCode(uf)}</cUF>
  <xServ>STATUS</xServ>
</consStatServ>`

      const client = await soap.createClientAsync(url + '?wsdl', {
        disableCache: true,
      })

      const [result] = await client.nfeStatusServicoNFAsync({
        nfeDadosMsg: envelope
      })

      const parsed = await parseStringPromise(result.nfeResultMsg, {
        explicitArray: false,
        ignoreAttrs: false,
      })

      const retConsStatServ = parsed['retConsStatServ'] || parsed['nfeStatusServicoNFResult']
      const cStat = retConsStatServ?.cStat || '999'
      const xMotivo = retConsStatServ?.xMotivo || 'Resposta inválida'

      // 107 = Serviço em operação
      return {
        online: cStat === '107',
        message: `${cStat} - ${xMotivo}`
      }
    } catch (error: any) {
      console.error('[SEFAZ] Erro ao consultar status:', error)
      return {
        online: false,
        message: `Erro: ${error.message}`
      }
    }
  }

  /**
   * Consulta uma NFC-e pela chave de acesso
   */
  async consultByAccessKey(
    chaveAcesso: string,
    uf: string,
    ambiente: string
  ): Promise<any> {
    try {
      const url = this.getWebServiceUrl('NFeConsultaProtocolo', uf, ambiente)

      const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <tpAmb>${ambiente === 'producao' ? '1' : '2'}</tpAmb>
  <xServ>CONSULTAR</xServ>
  <chNFe>${chaveAcesso}</chNFe>
</consSitNFe>`

      const client = await soap.createClientAsync(url + '?wsdl', {
        disableCache: true,
      })

      const [result] = await client.nfeConsultaNFAsync({
        nfeDadosMsg: envelope
      })

      const parsed = await parseStringPromise(result.nfeResultMsg, {
        explicitArray: false,
        ignoreAttrs: false,
      })

      return parsed
    } catch (error: any) {
      console.error('[SEFAZ] Erro ao consultar NFC-e:', error)
      throw error
    }
  }

  /**
   * Obtém código numérico da UF
   */
  private getUfCode(uf: string): number {
    const codes: { [key: string]: number } = {
      'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17,
      'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29,
      'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35,
      'PR': 41, 'SC': 42, 'RS': 43,
      'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53,
    }

    return codes[uf.toUpperCase()] || 35
  }
}

export const sefazClientService = new SefazClientService()
