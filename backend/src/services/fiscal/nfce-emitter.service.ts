import { prisma } from '../../lib/prisma.js'
import { certificateService } from './certificate.service.js'
import { xmlSignerService } from './xml-signer.service.js'
import { nfceBuilderService } from './nfce-builder.service.js'
import { sefazClientService } from './sefaz-client.service.js'
import { danfeService } from './danfe.service.js'
import { fiscalUtilsService } from './fiscal-utils.service.js'
import { encryptionService } from './encryption.service.js'
import path from 'path'
import fs from 'fs'

/**
 * Resultado da emissão de NFC-e
 */
export interface EmissionResult {
  success: boolean
  nfceId?: number
  chaveAcesso?: string
  protocolo?: string
  status: string
  message: string
  pdfPath?: string
  xmlPath?: string
}

/**
 * Serviço principal de emissão de NFC-e
 * Orquestra todo o processo: geração XML, assinatura, envio SEFAZ, armazenamento
 */
export class NFCeEmitterService {
  /**
   * Emite NFC-e para uma venda
   */
  async emitNFCe(saleId: number): Promise<EmissionResult> {
    try {
      console.log(`[NFCe] Iniciando emissão para venda ${saleId}`)

      // 1. Busca dados da venda
      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          items: {
            include: { product: true }
          },
          customer: true,
          operator: true
        }
      })

      if (!sale) {
        throw new Error('Venda não encontrada')
      }

      // Verifica se já existe NFC-e para esta venda
      const existing = await prisma.issuedNFCe.findUnique({
        where: { saleId }
      })

      if (existing) {
        throw new Error('Já existe NFC-e emitida para esta venda')
      }

      // 2. Busca configuração fiscal
      const fiscalConfig = await prisma.fiscalConfig.findFirst({
        where: { active: true }
      })

      if (!fiscalConfig) {
        throw new Error('Configuração fiscal não encontrada. Configure primeiro.')
      }

      // 3. Incrementa numeração e gera chave de acesso
      const numero = fiscalConfig.ultimoNumero + 1
      const codigoAleatorio = fiscalUtilsService.generateRandomCode()

      const chaveAcesso = fiscalUtilsService.generateAccessKey({
        uf: fiscalUtilsService.getUfCode(fiscalConfig.uf),
        aamm: fiscalUtilsService.getAamm(),
        cnpj: fiscalConfig.cnpj,
        modelo: 65, // NFC-e
        serie: fiscalConfig.serie,
        numero,
        tipoEmissao: fiscalConfig.contingencyMode ? 9 : 1,
        codigo: codigoAleatorio
      })

      console.log(`[NFCe] Chave de Acesso: ${chaveAcesso}`)

      // 4. Gera XML da NFC-e
      console.log(`[NFCe] Gerando XML...`)
      let xml = await nfceBuilderService.buildNFCeXml({
        sale,
        fiscalConfig,
        numero,
        chaveAcesso,
        codigoAleatorio
      })

      // 5. Carrega certificado
      console.log(`[NFCe] Carregando certificado...`)
      const { certificate, privateKey } = await this.loadCertificate(fiscalConfig)

      // 6. Assina XML
      console.log(`[NFCe] Assinando XML...`)
      const signedXml = await xmlSignerService.signXml(xml, certificate, privateKey, 'infNFe')

      // 7. Adiciona infNFeSupl (QR Code)
      console.log(`[NFCe] Adicionando QR Code...`)
      const xmlWithQRCode = nfceBuilderService.addNFCeInfo(signedXml, fiscalConfig, chaveAcesso)

      // 8. Cria registro no banco (status PROCESSANDO)
      const nfce = await prisma.issuedNFCe.create({
        data: {
          numero,
          serie: fiscalConfig.serie,
          modelo: '65',
          chaveAcesso,
          saleId: sale.id,
          status: 'PROCESSANDO',
          tipoEmissao: fiscalConfig.contingencyMode ? '9' : '1',
          xmlEnvio: xmlWithQRCode,
          valorTotal: sale.total,
          valorProdutos: sale.subtotal,
          valorDesconto: sale.discount || 0,
          destinatarioCpf: sale.cpf,
          destinatarioNome: sale.customer?.name,
          contingencia: fiscalConfig.contingencyMode,
          fiscalConfigId: fiscalConfig.id
        }
      })

      // Cria itens da NFC-e
      for (const [index, item] of sale.items.entries()) {
        await prisma.nFCeItem.create({
          data: {
            nfceId: nfce.id,
            numeroItem: index + 1,
            codigoProduto: item.product?.code || item.productId?.toString() || (index + 1).toString(),
            ean: item.product?.barcode || 'SEM GTIN',
            descricao: item.description,
            ncm: item.product?.ncm || '00000000',
            cfop: '5102',
            unidade: item.product?.unit || 'UN',
            quantidade: item.quantity,
            valorUnitario: item.unitPrice,
            valorTotal: item.subtotal
          }
        })
      }

      // 9. Envia para SEFAZ
      console.log(`[NFCe] Enviando para SEFAZ...`)
      const authResult = await sefazClientService.authorize(
        xmlWithQRCode,
        fiscalConfig.uf,
        fiscalConfig.ambiente
      )

      console.log(`[NFCe] Resposta SEFAZ: ${authResult.status} - ${authResult.message}`)

      // 10. Atualiza registro com resultado
      if (authResult.success) {
        // Autorizada!
        await prisma.issuedNFCe.update({
          where: { id: nfce.id },
          data: {
            status: 'AUTORIZADA',
            protocolo: authResult.protocol,
            dataAutorizacao: authResult.authDate,
            mensagemSefaz: authResult.message,
            codigoStatus: authResult.status,
            xmlRetorno: authResult.xmlWithProtocol || '',
            xmlCompleto: authResult.xmlWithProtocol || xmlWithQRCode
          }
        })

        // Atualiza numeração
        await prisma.fiscalConfig.update({
          where: { id: fiscalConfig.id },
          data: { ultimoNumero: numero }
        })

        // 11. Gera DANFE (PDF)
        console.log(`[NFCe] Gerando DANFE...`)
        const { pdfPath, xmlPath } = await this.saveFiscalDocuments(
          nfce.id,
          authResult.xmlWithProtocol || xmlWithQRCode,
          chaveAcesso
        )

        console.log(`[NFCe] ✅ NFC-e autorizada com sucesso!`)

        return {
          success: true,
          nfceId: nfce.id,
          chaveAcesso,
          protocolo: authResult.protocol,
          status: 'AUTORIZADA',
          message: authResult.message,
          pdfPath,
          xmlPath
        }
      } else {
        // Rejeitada
        await prisma.issuedNFCe.update({
          where: { id: nfce.id },
          data: {
            status: 'REJEITADA',
            mensagemSefaz: authResult.message,
            codigoStatus: authResult.status
          }
        })

        console.log(`[NFCe] ❌ NFC-e rejeitada: ${authResult.message}`)

        return {
          success: false,
          nfceId: nfce.id,
          chaveAcesso,
          status: 'REJEITADA',
          message: authResult.message
        }
      }
    } catch (error: any) {
      console.error('[NFCe] Erro na emissão:', error)
      return {
        success: false,
        status: 'ERRO',
        message: `Erro ao emitir NFC-e: ${error.message}`
      }
    }
  }

  /**
   * Carrega certificado digital (A1 ou A3)
   */
  private async loadCertificate(fiscalConfig: any) {
    if (fiscalConfig.certificateType === 'A1') {
      // Certificado A1 (arquivo .pfx)
      if (!fiscalConfig.certificateA1 || !fiscalConfig.certificateA1Pass) {
        throw new Error('Certificado A1 não configurado')
      }

      return await certificateService.loadCertificateA1(
        fiscalConfig.certificateA1,
        fiscalConfig.certificateA1Pass
      )
    } else if (fiscalConfig.certificateType === 'A3') {
      // Certificado A3 (token/smartcard)
      if (!fiscalConfig.certificatePin) {
        throw new Error('PIN do certificado A3 não configurado')
      }

      return await certificateService.loadCertificateA3(
        fiscalConfig.certificatePin,
        fiscalConfig.pkcs11Library
      )
    } else {
      throw new Error('Tipo de certificado inválido')
    }
  }

  /**
   * Salva XML e PDF no sistema de arquivos
   */
  private async saveFiscalDocuments(
    nfceId: number,
    xmlWithProtocol: string,
    chaveAcesso: string
  ): Promise<{ pdfPath: string; xmlPath: string }> {
    try {
      // Diretório base para documentos fiscais
      const baseDir = path.join(process.cwd(), 'storage', 'fiscal', 'nfce')
      const ano = new Date().getFullYear()
      const mes = (new Date().getMonth() + 1).toString().padStart(2, '0')

      // Cria estrutura de pastas: storage/fiscal/nfce/2026/01/
      const targetDir = path.join(baseDir, ano.toString(), mes)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Salva XML
      const xmlPath = path.join(targetDir, `${chaveAcesso}.xml`)
      fs.writeFileSync(xmlPath, xmlWithProtocol, 'utf-8')

      // Gera e salva PDF
      const pdfPath = path.join(targetDir, `${chaveAcesso}.pdf`)
      const pdfBuffer = await danfeService.generateDanfe(xmlWithProtocol, pdfPath)

      console.log(`[NFCe] Documentos salvos em: ${targetDir}`)

      return { pdfPath, xmlPath }
    } catch (error: any) {
      console.error('[NFCe] Erro ao salvar documentos:', error)
      throw error
    }
  }

  /**
   * Cancela uma NFC-e
   */
  async cancelNFCe(
    nfceId: number,
    justificativa: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // TODO: Implementar cancelamento
      // 1. Validar NFC-e (status = AUTORIZADA)
      // 2. Gerar XML de cancelamento
      // 3. Assinar XML
      // 4. Enviar para SEFAZ
      // 5. Atualizar registro

      throw new Error('Cancelamento ainda não implementado')
    } catch (error: any) {
      return {
        success: false,
        message: error.message
      }
    }
  }

  /**
   * Consulta status de uma NFC-e na SEFAZ
   */
  async consultNFCe(chaveAcesso: string): Promise<any> {
    try {
      const fiscalConfig = await prisma.fiscalConfig.findFirst({
        where: { active: true }
      })

      if (!fiscalConfig) {
        throw new Error('Configuração fiscal não encontrada')
      }

      return await sefazClientService.consultByAccessKey(
        chaveAcesso,
        fiscalConfig.uf,
        fiscalConfig.ambiente
      )
    } catch (error: any) {
      throw new Error(`Erro ao consultar NFC-e: ${error.message}`)
    }
  }

  /**
   * Verifica status do serviço da SEFAZ
   */
  async checkSefazStatus(): Promise<{ online: boolean; message: string }> {
    try {
      const fiscalConfig = await prisma.fiscalConfig.findFirst({
        where: { active: true }
      })

      if (!fiscalConfig) {
        throw new Error('Configuração fiscal não encontrada')
      }

      return await sefazClientService.checkStatus(fiscalConfig.uf, fiscalConfig.ambiente)
    } catch (error: any) {
      return {
        online: false,
        message: error.message
      }
    }
  }
}

export const nfceEmitterService = new NFCeEmitterService()
