import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { fiscalUtilsService } from './fiscal-utils.service.js'
import { parseStringPromise } from 'xml2js'
import fs from 'fs'
import path from 'path'

/**
 * Serviço de geração de DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
 * Gera PDF do cupom fiscal para impressão
 */
export class DanfeService {
  /**
   * Gera DANFE a partir do XML autorizado com protocolo
   */
  async generateDanfe(xmlWithProtocol: string, outputPath?: string): Promise<Buffer> {
    try {
      // Parse do XML
      const nfceData = await this.parseNFCeXml(xmlWithProtocol)

      // Cria PDF
      const pdfBuffer = await this.createPdf(nfceData)

      // Salva em arquivo se outputPath fornecido
      if (outputPath) {
        const dir = path.dirname(outputPath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(outputPath, pdfBuffer)
      }

      return pdfBuffer
    } catch (error: any) {
      console.error('[DANFE] Erro ao gerar DANFE:', error)
      throw new Error(`Falha ao gerar DANFE: ${error.message}`)
    }
  }

  /**
   * Parse do XML da NFC-e
   */
  private async parseNFCeXml(xml: string): Promise<any> {
    const parsed = await parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: false,
      tagNameProcessors: [(name) => name.replace(/^.+:/, '')]
    })

    const nfeProc = parsed.nfeProc || parsed
    const nfe = nfeProc.NFe || nfeProc.nfe
    const infNFe = nfe.infNFe
    const protNFe = nfeProc.protNFe

    return {
      ide: infNFe.ide,
      emit: infNFe.emit,
      dest: infNFe.dest,
      items: Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det],
      total: infNFe.total,
      pag: infNFe.pag,
      infAdic: infNFe.infAdic,
      protocol: protNFe?.infProt,
      infNFeSupl: nfe.infNFeSupl,
    }
  }

  /**
   * Cria o PDF do DANFE
   */
  private async createPdf(data: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks: Buffer[] = []

        // Cria documento PDF (80mm de largura - padrão de impressora térmica)
        const doc = new PDFDocument({
          size: [226.77, 841.89], // 80mm x 297mm (largura térmica padrão)
          margins: { top: 10, bottom: 10, left: 10, right: 10 }
        })

        // Captura chunks do PDF
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)

        // Largura útil
        const pageWidth = 226.77 - 20 // descontando margens

        // === CABEÇALHO ===
        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(data.emit.xNome || data.emit.xFant, { align: 'center' })
          .fontSize(8)
          .font('Helvetica')
          .text(data.emit.xFant !== data.emit.xNome ? data.emit.xFant : '', { align: 'center' })

        // Endereço
        const enderEmit = data.emit.enderEmit
        doc
          .fontSize(7)
          .text(
            `${enderEmit.xLgr}, ${enderEmit.nro} - ${enderEmit.xBairro}`,
            { align: 'center' }
          )
          .text(
            `${enderEmit.xMun}/${enderEmit.UF} - CEP: ${fiscalUtilsService.formatCpf(enderEmit.CEP)}`,
            { align: 'center' }
          )

        // CNPJ e IE
        doc
          .text(
            `CNPJ: ${fiscalUtilsService.formatCnpj(data.emit.CNPJ)}`,
            { align: 'center' }
          )
          .text(`IE: ${data.emit.IE}`, { align: 'center' })

        doc.moveDown(0.5)

        // === LINHA SEPARADORA ===
        doc
          .moveTo(10, doc.y)
          .lineTo(pageWidth + 10, doc.y)
          .stroke()
          .moveDown(0.5)

        // === TIPO DE DOCUMENTO ===
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('DANFE NFC-e', { align: 'center' })
          .fontSize(8)
          .font('Helvetica')
          .text('Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica', { align: 'center' })

        doc.moveDown(0.5)

        // === INFORMAÇÕES DA NOTA ===
        doc
          .fontSize(8)
          .text(`Nº: ${data.ide.nNF} | Série: ${data.ide.serie}`, { align: 'center' })
          .text(
            `Emissão: ${new Date(data.ide.dhEmi).toLocaleString('pt-BR')}`,
            { align: 'center' }
          )

        doc.moveDown(0.5)

        // === DESTINATÁRIO (se houver) ===
        if (data.dest) {
          doc
            .moveTo(10, doc.y)
            .lineTo(pageWidth + 10, doc.y)
            .stroke()
            .moveDown(0.3)

          doc
            .fontSize(7)
            .font('Helvetica-Bold')
            .text('CONSUMIDOR', { align: 'center' })
            .font('Helvetica')
            .text(data.dest.xNome || 'NÃO IDENTIFICADO', { align: 'center' })

          if (data.dest.CPF) {
            doc.text(`CPF: ${fiscalUtilsService.formatCpf(data.dest.CPF)}`, { align: 'center' })
          }

          doc.moveDown(0.3)
        }

        // === LINHA SEPARADORA ===
        doc
          .moveTo(10, doc.y)
          .lineTo(pageWidth + 10, doc.y)
          .stroke()
          .moveDown(0.5)

        // === ITENS ===
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('PRODUTOS', { align: 'center' })
          .moveDown(0.3)

        // Cabeçalho da tabela
        doc
          .fontSize(6)
          .text('COD    DESCRIÇÃO                QTD   VL.UNIT   VL.TOTAL', {
            align: 'left',
            continued: false
          })

        doc
          .moveTo(10, doc.y)
          .lineTo(pageWidth + 10, doc.y)
          .stroke()
          .moveDown(0.2)

        // Lista de itens
        const items = Array.isArray(data.items) ? data.items : [data.items]

        items.forEach((item: any) => {
          const prod = item.prod
          const codigo = (prod.cProd || '').substring(0, 6)
          const descricao = (prod.xProd || '').substring(0, 20)
          const qtd = parseFloat(prod.qCom).toFixed(2)
          const vlUnit = parseFloat(prod.vUnCom).toFixed(2)
          const vlTotal = parseFloat(prod.vProd).toFixed(2)

          doc
            .fontSize(6)
            .text(codigo, 10, doc.y, { width: 30, continued: true })
            .text(descricao, { width: 90, continued: true })
            .text(qtd, { width: 25, align: 'right', continued: true })
            .text(vlUnit, { width: 35, align: 'right', continued: true })
            .text(vlTotal, { width: 35, align: 'right' })

          doc.moveDown(0.1)
        })

        doc.moveDown(0.3)

        // === LINHA SEPARADORA ===
        doc
          .moveTo(10, doc.y)
          .lineTo(pageWidth + 10, doc.y)
          .stroke()
          .moveDown(0.5)

        // === TOTAIS ===
        const icmsTot = data.total.ICMSTot

        doc
          .fontSize(7)
          .text(`Qtd. Total de Itens: ${items.length}`, { align: 'left' })
          .text(`Valor Total dos Produtos: R$ ${parseFloat(icmsTot.vProd).toFixed(2)}`, { align: 'left' })

        if (parseFloat(icmsTot.vDesc) > 0) {
          doc.text(`Desconto: R$ ${parseFloat(icmsTot.vDesc).toFixed(2)}`, { align: 'left' })
        }

        doc
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`VALOR A PAGAR: R$ ${parseFloat(icmsTot.vNF).toFixed(2)}`, { align: 'left' })
          .font('Helvetica')

        doc.moveDown(0.5)

        // === FORMA DE PAGAMENTO ===
        const detPag = Array.isArray(data.pag.detPag) ? data.pag.detPag[0] : data.pag.detPag

        const paymentMethods: { [key: string]: string } = {
          '01': 'Dinheiro',
          '02': 'Cheque',
          '03': 'Cartão de Crédito',
          '04': 'Cartão de Débito',
          '17': 'PIX',
          '99': 'Outros'
        }

        doc
          .fontSize(7)
          .text(
            `Forma de Pagamento: ${paymentMethods[detPag.tPag] || 'Outros'}`,
            { align: 'left' }
          )
          .text(`Valor Pago: R$ ${parseFloat(detPag.vPag).toFixed(2)}`, { align: 'left' })

        doc.moveDown(0.5)

        // === LINHA SEPARADORA ===
        doc
          .moveTo(10, doc.y)
          .lineTo(pageWidth + 10, doc.y)
          .stroke()
          .moveDown(0.5)

        // === QR CODE ===
        if (data.infNFeSupl?.qrCode) {
          const qrCodeDataUrl = await QRCode.toDataURL(data.infNFeSupl.qrCode, {
            width: 150,
            margin: 1
          })

          // Remove o prefixo data:image/png;base64,
          const qrCodeBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '')
          const qrCodeBuffer = Buffer.from(qrCodeBase64, 'base64')

          // Calcula posição centralizada
          const qrSize = 120
          const xPos = (pageWidth - qrSize) / 2 + 10

          doc.image(qrCodeBuffer, xPos, doc.y, {
            width: qrSize,
            height: qrSize
          })

          doc.moveDown(8) // Espaço após QR Code
        }

        // === CHAVE DE ACESSO ===
        const chaveAcesso = data.protocol?.chNFe || data.ide.Id?.replace('NFe', '')

        doc
          .fontSize(6)
          .font('Helvetica-Bold')
          .text('CHAVE DE ACESSO', { align: 'center' })
          .font('Helvetica')
          .fontSize(8)
          .text(fiscalUtilsService.formatAccessKey(chaveAcesso), { align: 'center' })

        doc.moveDown(0.5)

        // === PROTOCOLO ===
        if (data.protocol) {
          doc
            .fontSize(7)
            .text(`Protocolo: ${data.protocol.nProt}`, { align: 'center' })
            .text(
              `Autorizado em: ${new Date(data.protocol.dhRecbto).toLocaleString('pt-BR')}`,
              { align: 'center' }
            )
        }

        doc.moveDown(0.5)

        // === INFORMAÇÕES ADICIONAIS ===
        if (data.infAdic?.infCpl) {
          doc
            .moveTo(10, doc.y)
            .lineTo(pageWidth + 10, doc.y)
            .stroke()
            .moveDown(0.3)

          doc
            .fontSize(6)
            .text('INFORMAÇÕES ADICIONAIS', { align: 'center' })
            .fontSize(6)
            .text(data.infAdic.infCpl, { align: 'left' })

          doc.moveDown(0.3)
        }

        // === RODAPÉ ===
        doc
          .moveTo(10, doc.y)
          .lineTo(pageWidth + 10, doc.y)
          .stroke()
          .moveDown(0.5)

        doc
          .fontSize(6)
          .font('Helvetica')
          .text('Consulte pela Chave de Acesso em:', { align: 'center' })
          .text(data.infNFeSupl?.urlChave || 'www.nfce.fazenda.sp.gov.br/consulta', { align: 'center' })

        doc.moveDown(0.5)

        doc
          .fontSize(5)
          .text(
            `Ambiente: ${data.ide.tpAmb === '1' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO (SEM VALOR FISCAL)'}`,
            { align: 'center' }
          )

        // Finaliza documento
        doc.end()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Gera DANFE simplificado (apenas texto, sem QR Code)
   * Útil para impressoras que não suportam imagens
   */
  async generateSimpleDanfe(nfceData: any): Promise<string> {
    try {
      let text = '========================================\n'
      text += `     ${nfceData.emit.xFant}\n`
      text += `     ${nfceData.emit.xNome}\n`
      text += `     ${nfceData.emit.enderEmit.xLgr}, ${nfceData.emit.enderEmit.nro}\n`
      text += `     ${nfceData.emit.enderEmit.xBairro} - ${nfceData.emit.enderEmit.xMun}/${nfceData.emit.enderEmit.UF}\n`
      text += `     CNPJ: ${fiscalUtilsService.formatCnpj(nfceData.emit.CNPJ)}\n`
      text += `     IE: ${nfceData.emit.IE}\n`
      text += '========================================\n'
      text += '         CUPOM FISCAL ELETRÔNICO\n'
      text += '              NFC-e\n'
      text += '========================================\n'
      text += `Nº ${nfceData.ide.nNF} - Série ${nfceData.ide.serie}\n`
      text += `Emissão: ${new Date(nfceData.ide.dhEmi).toLocaleString('pt-BR')}\n`
      text += '========================================\n'
      text += 'PRODUTOS\n'
      text += '========================================\n'

      const items = Array.isArray(nfceData.items) ? nfceData.items : [nfceData.items]

      items.forEach((item: any, index: number) => {
        const prod = item.prod
        text += `${index + 1}. ${prod.xProd}\n`
        text += `   ${prod.qCom} ${prod.uCom} x R$ ${parseFloat(prod.vUnCom).toFixed(2)} = R$ ${parseFloat(prod.vProd).toFixed(2)}\n`
      })

      text += '========================================\n'
      text += `VALOR TOTAL: R$ ${parseFloat(nfceData.total.ICMSTot.vNF).toFixed(2)}\n`
      text += '========================================\n'

      return text
    } catch (error: any) {
      console.error('[DANFE] Erro ao gerar DANFE simplificado:', error)
      throw new Error(`Falha ao gerar DANFE simplificado: ${error.message}`)
    }
  }
}

export const danfeService = new DanfeService()
