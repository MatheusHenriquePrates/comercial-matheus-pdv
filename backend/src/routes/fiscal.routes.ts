import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { nfceEmitterService } from '../services/fiscal/nfce-emitter.service.js'
import { encryptionService } from '../services/fiscal/encryption.service.js'
import { certificateService } from '../services/fiscal/certificate.service.js'
import fs from 'fs'
import path from 'path'

const router = Router()

// ===== CONFIGURAÇÃO FISCAL =====

/**
 * GET /fiscal/config
 * Obtém configuração fiscal ativa
 */
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const config = await prisma.fiscalConfig.findFirst({
      where: { active: true },
      select: {
        id: true,
        cnpj: true,
        razaoSocial: true,
        nomeFantasia: true,
        inscricaoEstadual: true,
        inscricaoMunicipal: true,
        crt: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
        codigoMunicipio: true,
        nomeMunicipio: true,
        uf: true,
        cep: true,
        telefone: true,
        serie: true,
        ultimoNumero: true,
        ambiente: true,
        cscId: true,
        certificateType: true,
        contingencyMode: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        // Não retorna dados sensíveis (cscToken, certificatePin, etc)
      }
    })

    res.json({ config })
  } catch (error: any) {
    console.error('Erro ao buscar configuração fiscal:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /fiscal/config
 * Cria ou atualiza configuração fiscal
 */
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const data = req.body

    // Valida campos obrigatórios
    const required = [
      'cnpj', 'razaoSocial', 'nomeFantasia', 'inscricaoEstadual',
      'logradouro', 'numero', 'bairro', 'codigoMunicipio', 'nomeMunicipio',
      'uf', 'cep', 'certificateType'
    ]

    for (const field of required) {
      if (!data[field]) {
        return res.status(400).json({ error: `Campo obrigatório: ${field}` })
      }
    }

    // Criptografa dados sensíveis se fornecidos
    const sensibleData: any = {}

    if (data.cscToken) {
      sensibleData.cscToken = encryptionService.encrypt(data.cscToken)
    }

    if (data.certificatePin) {
      sensibleData.certificatePin = encryptionService.encrypt(data.certificatePin)
    }

    if (data.certificateA1Pass) {
      sensibleData.certificateA1Pass = encryptionService.encrypt(data.certificateA1Pass)
    }

    // Desativa configuração anterior
    await prisma.fiscalConfig.updateMany({
      where: { active: true },
      data: { active: false }
    })

    // Cria nova configuração
    const config = await prisma.fiscalConfig.create({
      data: {
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        inscricaoEstadual: data.inscricaoEstadual,
        inscricaoMunicipal: data.inscricaoMunicipal,
        crt: data.crt || '1',
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        codigoMunicipio: data.codigoMunicipio,
        nomeMunicipio: data.nomeMunicipio,
        uf: data.uf,
        cep: data.cep,
        telefone: data.telefone,
        serie: data.serie || 1,
        ultimoNumero: data.ultimoNumero || 0,
        ambiente: data.ambiente || 'homologacao',
        cscId: data.cscId,
        certificateType: data.certificateType,
        pkcs11Library: data.pkcs11Library,
        certificateA1: data.certificateA1,
        ...sensibleData,
        active: true
      },
      select: {
        id: true,
        cnpj: true,
        razaoSocial: true,
        nomeFantasia: true,
        ambiente: true,
        certificateType: true,
        active: true
      }
    })

    res.json({
      success: true,
      message: 'Configuração fiscal salva com sucesso',
      config
    })
  } catch (error: any) {
    console.error('Erro ao salvar configuração fiscal:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /fiscal/config/test-certificate
 * Testa certificado digital
 */
router.post('/config/test-certificate', authMiddleware, async (req, res) => {
  try {
    const { certificateType, certificateA1, certificateA1Pass, certificatePin, pkcs11Library } = req.body

    if (certificateType === 'A1') {
      if (!certificateA1 || !certificateA1Pass) {
        return res.status(400).json({ error: 'Certificado A1 e senha são obrigatórios' })
      }

      const { certificate } = await certificateService.loadCertificateA1(
        certificateA1,
        certificateA1Pass
      )

      const info = certificateService.getCertificateInfo(certificate)

      res.json({
        success: true,
        message: 'Certificado A1 válido',
        certificateInfo: info
      })
    } else if (certificateType === 'A3') {
      if (!certificatePin) {
        return res.status(400).json({ error: 'PIN do certificado A3 é obrigatório' })
      }

      const { certificate } = await certificateService.loadCertificateA3(
        certificatePin,
        pkcs11Library
      )

      const info = certificateService.getCertificateInfo(certificate)

      res.json({
        success: true,
        message: 'Certificado A3 válido',
        certificateInfo: info
      })
    } else {
      return res.status(400).json({ error: 'Tipo de certificado inválido' })
    }
  } catch (error: any) {
    console.error('Erro ao testar certificado:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// ===== EMISSÃO DE NFC-e =====

/**
 * POST /fiscal/nfce/emit
 * Emite NFC-e para uma venda
 */
router.post('/nfce/emit', authMiddleware, async (req, res) => {
  try {
    const { saleId } = req.body

    if (!saleId) {
      return res.status(400).json({ error: 'saleId é obrigatório' })
    }

    const result = await nfceEmitterService.emitNFCe(saleId)

    if (result.success) {
      res.json({
        success: true,
        message: 'NFC-e emitida com sucesso',
        nfce: {
          id: result.nfceId,
          chaveAcesso: result.chaveAcesso,
          protocolo: result.protocolo,
          status: result.status
        }
      })
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        status: result.status
      })
    }
  } catch (error: any) {
    console.error('Erro ao emitir NFC-e:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /fiscal/nfce/:id
 * Obtém detalhes de uma NFC-e
 */
router.get('/nfce/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const nfce = await prisma.issuedNFCe.findUnique({
      where: { id: parseInt(id) },
      include: {
        sale: {
          include: {
            items: true,
            customer: true
          }
        },
        items: true
      }
    })

    if (!nfce) {
      return res.status(404).json({ error: 'NFC-e não encontrada' })
    }

    res.json({ nfce })
  } catch (error: any) {
    console.error('Erro ao buscar NFC-e:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /fiscal/nfce/:id/pdf
 * Baixa PDF (DANFE) de uma NFC-e
 */
router.get('/nfce/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const nfce = await prisma.issuedNFCe.findUnique({
      where: { id: parseInt(id) }
    })

    if (!nfce) {
      return res.status(404).json({ error: 'NFC-e não encontrada' })
    }

    if (nfce.status !== 'AUTORIZADA') {
      return res.status(400).json({ error: 'NFC-e não está autorizada' })
    }

    // Busca arquivo PDF
    const ano = new Date(nfce.createdAt).getFullYear()
    const mes = (new Date(nfce.createdAt).getMonth() + 1).toString().padStart(2, '0')
    const pdfPath = path.join(
      process.cwd(),
      'storage',
      'fiscal',
      'nfce',
      ano.toString(),
      mes,
      `${nfce.chaveAcesso}.pdf`
    )

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'Arquivo PDF não encontrado' })
    }

    res.contentType('application/pdf')
    res.download(pdfPath, `NFC-e-${nfce.numero}.pdf`)
  } catch (error: any) {
    console.error('Erro ao baixar PDF:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /fiscal/nfce/:id/xml
 * Baixa XML de uma NFC-e
 */
router.get('/nfce/:id/xml', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params

    const nfce = await prisma.issuedNFCe.findUnique({
      where: { id: parseInt(id) }
    })

    if (!nfce) {
      return res.status(404).json({ error: 'NFC-e não encontrada' })
    }

    // Retorna XML completo (com protocolo se autorizada)
    const xml = nfce.xmlCompleto || nfce.xmlEnvio

    res.contentType('application/xml')
    res.attachment(`NFC-e-${nfce.numero}.xml`)
    res.send(xml)
  } catch (error: any) {
    console.error('Erro ao baixar XML:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /fiscal/nfce/sale/:saleId
 * Busca NFC-e de uma venda
 */
router.get('/nfce/sale/:saleId', authMiddleware, async (req, res) => {
  try {
    const { saleId } = req.params

    const nfce = await prisma.issuedNFCe.findUnique({
      where: { saleId: parseInt(saleId) }
    })

    res.json({ nfce })
  } catch (error: any) {
    console.error('Erro ao buscar NFC-e:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /fiscal/nfce
 * Lista NFC-es emitidas
 */
router.get('/nfce', authMiddleware, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query

    const where: any = {}
    if (status) {
      where.status = status
    }

    const nfces = await prisma.issuedNFCe.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true,
            total: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    })

    const total = await prisma.issuedNFCe.count({ where })

    res.json({
      nfces,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    })
  } catch (error: any) {
    console.error('Erro ao listar NFC-es:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /fiscal/sefaz/status
 * Verifica status do serviço da SEFAZ
 */
router.get('/sefaz/status', authMiddleware, async (req, res) => {
  try {
    const result = await nfceEmitterService.checkSefazStatus()

    res.json(result)
  } catch (error: any) {
    console.error('Erro ao verificar status SEFAZ:', error)
    res.status(500).json({
      online: false,
      message: error.message
    })
  }
})

export default router
