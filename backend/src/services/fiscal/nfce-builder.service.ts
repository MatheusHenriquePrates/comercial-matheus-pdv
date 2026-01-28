import { create } from 'xmlbuilder2'
import { fiscalUtilsService } from './fiscal-utils.service.js'
import { prisma } from '../../lib/prisma.js'
import Decimal from 'decimal.js'

/**
 * Dados necessários para gerar NFC-e
 */
export interface NFCeData {
  sale: any // Sale com items, customer, etc
  fiscalConfig: any // FiscalConfig
  numero: number
  chaveAcesso: string
  codigoAleatorio: number
}

/**
 * Serviço de construção de XML NFC-e no padrão SEFAZ v4.00
 */
export class NFCeBuilderService {
  /**
   * Gera o XML completo da NFC-e
   */
  async buildNFCeXml(data: NFCeData): Promise<string> {
    const { sale, fiscalConfig, numero, chaveAcesso, codigoAleatorio } = data

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('NFe', { xmlns: 'http://www.portalfiscal.inf.br/nfe' })
        .ele('infNFe', {
          versao: '4.00',
          Id: `NFe${chaveAcesso}`
        })
          // === IDE - Identificação ===
          .ele('ide')
            .ele('cUF').txt(fiscalUtilsService.getUfCode(fiscalConfig.uf)).up()
            .ele('cNF').txt(codigoAleatorio.toString().padStart(8, '0')).up()
            .ele('natOp').txt('VENDA').up()
            .ele('mod').txt('65').up() // 65 = NFC-e
            .ele('serie').txt(fiscalConfig.serie.toString()).up()
            .ele('nNF').txt(numero.toString()).up()
            .ele('dhEmi').txt(fiscalUtilsService.formatSefazDateTime(sale.createdAt)).up()
            .ele('tpNF').txt('1').up() // 1 = Saída
            .ele('idDest').txt('1').up() // 1 = Operação interna
            .ele('cMunFG').txt(fiscalConfig.codigoMunicipio).up()
            .ele('tpImp').txt('4').up() // 4 = DANFE NFC-e em papel
            .ele('tpEmis').txt(fiscalConfig.contingencyMode ? '9' : '1').up() // 1=Normal, 9=Contingência
            .ele('cDV').txt(chaveAcesso.charAt(43)).up() // Dígito verificador
            .ele('tpAmb').txt(fiscalConfig.ambiente === 'producao' ? '1' : '2').up() // 1=Produção, 2=Homologação
            .ele('finNFe').txt('1').up() // 1 = NF-e normal
            .ele('indFinal').txt('1').up() // 1 = Operação com consumidor final
            .ele('indPres').txt('1').up() // 1 = Operação presencial
            .ele('procEmi').txt('0').up() // 0 = Emissão com aplicação do contribuinte
            .ele('verProc').txt('Comercial-Matheus-PDV-1.0.0').up()
          .up()

          // === EMIT - Emitente ===
          .ele('emit')
            .ele('CNPJ').txt(fiscalConfig.cnpj.replace(/\D/g, '')).up()
            .ele('xNome').txt(fiscalConfig.razaoSocial).up()
            .ele('xFant').txt(fiscalConfig.nomeFantasia).up()
            .ele('enderEmit')
              .ele('xLgr').txt(fiscalConfig.logradouro).up()
              .ele('nro').txt(fiscalConfig.numero).up()

    // Adiciona complemento se existir
    if (fiscalConfig.complemento) {
      xml.ele('xCpl').txt(fiscalConfig.complemento).up()
    }

    xml
              .ele('xBairro').txt(fiscalConfig.bairro).up()
              .ele('cMun').txt(fiscalConfig.codigoMunicipio).up()
              .ele('xMun').txt(fiscalConfig.nomeMunicipio).up()
              .ele('UF').txt(fiscalConfig.uf).up()
              .ele('CEP').txt(fiscalConfig.cep.replace(/\D/g, '')).up()
              .ele('cPais').txt('1058').up() // Brasil
              .ele('xPais').txt('BRASIL').up()

    // Adiciona telefone se existir
    if (fiscalConfig.telefone) {
      xml.ele('fone').txt(fiscalConfig.telefone.replace(/\D/g, '')).up()
    }

    xml
            .up() // enderEmit
            .ele('IE').txt(fiscalConfig.inscricaoEstadual.replace(/\D/g, '')).up()
            .ele('CRT').txt(fiscalConfig.crt).up() // 1=Simples Nacional
          .up() // emit

    // === DEST - Destinatário (se tiver CPF) ===
    if (sale.cpf) {
      xml
        .ele('dest')
          .ele('CPF').txt(sale.cpf.replace(/\D/g, '')).up()

      // Se tiver customer vinculado, adiciona nome
      if (sale.customer) {
        xml.ele('xNome').txt(sale.customer.name).up()
      }

      xml
          .ele('indIEDest').txt('9').up() // 9 = Não contribuinte
        .up() // dest
    }

    // === DET - Detalhamento dos produtos ===
    const items = await prisma.saleItem.findMany({
      where: { saleId: sale.id },
      include: { product: true },
      orderBy: { id: 'asc' }
    })

    items.forEach((item, index) => {
      const numeroItem = index + 1

      xml
        .ele('det', { nItem: numeroItem.toString() })
          .ele('prod')
            .ele('cProd').txt(item.product?.code || item.productId?.toString() || numeroItem.toString()).up()
            .ele('cEAN').txt(item.product?.barcode || 'SEM GTIN').up()
            .ele('xProd').txt(item.description).up()
            .ele('NCM').txt(item.product?.ncm || '00000000').up()
            .ele('CFOP').txt('5102').up() // 5102 = Venda de mercadoria adquirida
            .ele('uCom').txt(item.product?.unit || 'UN').up()
            .ele('qCom').txt(new Decimal(item.quantity).toFixed(4)).up()
            .ele('vUnCom').txt(new Decimal(item.unitPrice).toFixed(10)).up()
            .ele('vProd').txt(new Decimal(item.subtotal).toFixed(2)).up()
            .ele('cEANTrib').txt(item.product?.barcode || 'SEM GTIN').up()
            .ele('uTrib').txt(item.product?.unit || 'UN').up()
            .ele('qTrib').txt(new Decimal(item.quantity).toFixed(4)).up()
            .ele('vUnTrib').txt(new Decimal(item.unitPrice).toFixed(10)).up()
            .ele('indTot').txt('1').up() // 1 = Compõe total da NF-e
          .up() // prod

          // === IMPOSTO ===
          .ele('imposto')
            .ele('vTotTrib').txt('0.00').up() // Informativo, pode ser 0 para Simples Nacional

            // ICMS - Para Simples Nacional usa ICMSSN
            .ele('ICMS')
              .ele('ICMSSN102') // 102 = Tributada sem permissão de crédito
                .ele('orig').txt('0').up() // 0 = Nacional
                .ele('CSOSN').txt('102').up() // Simples Nacional
              .up()
            .up()

            // PIS
            .ele('PIS')
              .ele('PISNT')
                .ele('CST').txt('07').up() // 07 = Operação isenta
              .up()
            .up()

            // COFINS
            .ele('COFINS')
              .ele('COFINSNT')
                .ele('CST').txt('07').up() // 07 = Operação isenta
              .up()
            .up()
          .up() // imposto
        .up() // det
    })

    // === TOTAL - Totalizadores ===
    const vProd = new Decimal(sale.subtotal)
    const vDesc = new Decimal(sale.discount || 0)
    const vNF = new Decimal(sale.total)

    xml
      .ele('total')
        .ele('ICMSTot')
          .ele('vBC').txt('0.00').up()
          .ele('vICMS').txt('0.00').up()
          .ele('vICMSDeson').txt('0.00').up()
          .ele('vFCP').txt('0.00').up()
          .ele('vBCST').txt('0.00').up()
          .ele('vST').txt('0.00').up()
          .ele('vFCPST').txt('0.00').up()
          .ele('vFCPSTRet').txt('0.00').up()
          .ele('vProd').txt(vProd.toFixed(2)).up()
          .ele('vFrete').txt('0.00').up()
          .ele('vSeg').txt('0.00').up()
          .ele('vDesc').txt(vDesc.toFixed(2)).up()
          .ele('vII').txt('0.00').up()
          .ele('vIPI').txt('0.00').up()
          .ele('vIPIDevol').txt('0.00').up()
          .ele('vPIS').txt('0.00').up()
          .ele('vCOFINS').txt('0.00').up()
          .ele('vOutro').txt('0.00').up()
          .ele('vNF').txt(vNF.toFixed(2)).up()
          .ele('vTotTrib').txt('0.00').up()
        .up()
      .up()

    // === TRANSP - Transporte ===
    xml
      .ele('transp')
        .ele('modFrete').txt('9').up() // 9 = Sem frete
      .up()

    // === PAG - Pagamento ===
    xml
      .ele('pag')
        .ele('detPag')
          .ele('indPag').txt('0').up() // 0 = Pagamento à vista
          .ele('tPag').txt(fiscalUtilsService.mapPaymentMethod(sale.paymentMethod)).up()
          .ele('vPag').txt(vNF.toFixed(2)).up()
        .up()
      .up()

    // === INFADIC - Informações Adicionais ===
    let infCpl = 'Emitido por Comercial Matheus PDV | www.comercialmatheus.com.br'

    // Adiciona informação sobre troco se for dinheiro
    if (sale.paymentMethod === 'CASH' && sale.paymentDetails) {
      try {
        const details = JSON.parse(sale.paymentDetails)
        if (details.amountPaid && details.change) {
          infCpl += ` | Valor Pago: R$ ${new Decimal(details.amountPaid).toFixed(2)} | Troco: R$ ${new Decimal(details.change).toFixed(2)}`
        }
      } catch (e) {
        // Ignora erro de parse
      }
    }

    xml
      .ele('infAdic')
        .ele('infCpl').txt(infCpl).up()
      .up()

    // Fecha infNFe e NFe
    xml.up().up()

    return xml.end({ prettyPrint: true })
  }

  /**
   * Adiciona informações complementares da NFC-e ao XML
   * (QR Code e URL de consulta)
   */
  addNFCeInfo(xml: string, fiscalConfig: any, chaveAcesso: string): string {
    try {
      const doc = create(xml)

      // Gera QR Code
      const qrCode = this.generateQRCode(fiscalConfig, chaveAcesso)
      const urlChave = this.getConsultaUrl(fiscalConfig.uf, fiscalConfig.ambiente)

      // Adiciona infNFeSupl após infNFe
      const nfeNode = doc.first()
      if (!nfeNode) {
        throw new Error('Nó NFe não encontrado')
      }

      nfeNode
        .ele('infNFeSupl')
          .ele('qrCode')
            .dat(qrCode)
          .up()
          .ele('urlChave').txt(urlChave).up()
        .up()

      return doc.end({ prettyPrint: true })
    } catch (error: any) {
      console.error('Erro ao adicionar infNFeSupl:', error)
      // Retorna XML original se falhar
      return xml
    }
  }

  /**
   * Gera o texto do QR Code da NFC-e
   */
  private generateQRCode(fiscalConfig: any, chaveAcesso: string): string {
    // Formato do QR Code NFC-e:
    // chNFe|cDest|dhEmi|vNF|digVal|IdToken|cIdToken

    // URL base para consulta (varia por estado e ambiente)
    const baseUrl = this.getQRCodeUrl(fiscalConfig.uf, fiscalConfig.ambiente)

    // Monta parâmetros
    const params = [
      chaveAcesso,                              // chNFe
      '',                                        // cDest (vazio se não tiver CPF)
      '',                                        // dhEmi (pode omitir)
      '',                                        // vNF (pode omitir)
      '',                                        // digVal (digest value - pode omitir)
      fiscalConfig.cscId || '000001',           // IdToken (ID do CSC)
      this.generateCSCHash(chaveAcesso, fiscalConfig) // cIdToken (hash)
    ]

    return `${baseUrl}?p=${params.join('|')}`
  }

  /**
   * Gera o hash do CSC para o QR Code
   */
  private generateCSCHash(chaveAcesso: string, fiscalConfig: any): string {
    const crypto = require('crypto')

    // Descriptografa o CSC token se necessário
    let cscToken = fiscalConfig.cscToken || ''

    // String para hash: chaveAcesso + CSCToken
    const dataToHash = chaveAcesso + cscToken

    // Gera SHA-1 (padrão SEFAZ para QR Code)
    const hash = crypto.createHash('sha1').update(dataToHash).digest('hex')

    return hash.toUpperCase()
  }

  /**
   * Obtém URL do QR Code por estado
   */
  private getQRCodeUrl(uf: string, ambiente: string): string {
    const isProduction = ambiente === 'producao'

    // URLs podem variar por estado
    // Aqui está o exemplo para SP
    const urls: { [key: string]: { producao: string; homologacao: string } } = {
      'SP': {
        producao: 'https://www.fazenda.sp.gov.br/nfce/qrcode',
        homologacao: 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode'
      },
      // Adicionar outros estados conforme necessário
    }

    const stateUrls = urls[uf.toUpperCase()]
    if (!stateUrls) {
      // URL genérica (substituir pela do estado correto)
      return isProduction
        ? 'https://www.fazenda.sp.gov.br/nfce/qrcode'
        : 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode'
    }

    return isProduction ? stateUrls.producao : stateUrls.homologacao
  }

  /**
   * Obtém URL de consulta da chave por estado
   */
  private getConsultaUrl(uf: string, ambiente: string): string {
    const isProduction = ambiente === 'producao'

    // URL de consulta (exemplo SP)
    return isProduction
      ? 'http://www.fazenda.sp.gov.br/nfce/consulta'
      : 'http://www.homologacao.nfce.fazenda.sp.gov.br/consulta'
  }
}

export const nfceBuilderService = new NFCeBuilderService()
