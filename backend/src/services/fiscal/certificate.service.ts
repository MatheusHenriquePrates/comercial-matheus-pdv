import forge from 'node-forge'
import fs from 'fs'
import { encryptionService } from './encryption.service.js'

/**
 * Informações do certificado digital
 */
export interface CertificateInfo {
  subject: {
    commonName: string
    organizationName: string
    cnpj: string
  }
  issuer: {
    commonName: string
    organizationName: string
  }
  serialNumber: string
  validFrom: Date
  validTo: Date
  isValid: boolean
}

/**
 * Serviço de gerenciamento de certificado digital
 * Suporta certificados A1 (arquivo .pfx) e A3 (token/smartcard)
 */
export class CertificateService {
  private certificateCache: {
    certificate?: forge.pki.Certificate
    privateKey?: forge.pki.PrivateKey
    loadedAt?: Date
  } = {}

  /**
   * Carrega certificado A1 de um arquivo .pfx
   */
  async loadCertificateA1(pfxBase64: string, password: string): Promise<{
    certificate: forge.pki.Certificate
    privateKey: forge.pki.PrivateKey
  }> {
    try {
      // Decodifica o base64
      const pfxBuffer = Buffer.from(pfxBase64, 'base64')
      const pfxBinary = pfxBuffer.toString('binary')

      // Descriptografa a senha
      const decryptedPassword = password.startsWith('encrypted:')
        ? encryptionService.decrypt(password.replace('encrypted:', ''))
        : password

      // Parse do PKCS#12
      const p12Asn1 = forge.asn1.fromDer(pfxBinary)
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, decryptedPassword)

      // Extrai certificado e chave privada
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
      const certBag = bags[forge.pki.oids.certBag]?.[0]

      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]

      if (!certBag || !keyBag) {
        throw new Error('Certificado ou chave privada não encontrados no arquivo .pfx')
      }

      const certificate = certBag.cert!
      const privateKey = keyBag.key!

      // Cache para uso futuro
      this.certificateCache = {
        certificate,
        privateKey,
        loadedAt: new Date(),
      }

      return { certificate, privateKey }
    } catch (error: any) {
      console.error('Erro ao carregar certificado A1:', error)
      throw new Error(`Falha ao carregar certificado A1: ${error.message}`)
    }
  }

  /**
   * Carrega certificado A3 de um token/smartcard
   * NOTA: Esta é uma implementação simulada. A implementação real requer pkcs11js
   * e configuração específica do hardware do leitor de cartão.
   *
   * Para implementação real:
   * 1. Instalar driver do leitor de cartão
   * 2. Instalar pkcs11js: npm install pkcs11js
   * 3. Configurar caminho da biblioteca PKCS#11
   * 4. Implementar comunicação com token usando pkcs11js
   */
  async loadCertificateA3(pin: string, pkcs11LibraryPath?: string): Promise<{
    certificate: forge.pki.Certificate
    privateKey: any // Na prática, a chave privada não sai do token
  }> {
    try {
      // Descriptografa o PIN
      const decryptedPin = pin.startsWith('encrypted:')
        ? encryptionService.decrypt(pin.replace('encrypted:', ''))
        : pin

      // TODO: Implementação real com pkcs11js
      // const pkcs11 = new PKCS11()
      // pkcs11.load(pkcs11LibraryPath || '/usr/lib/libaetpkss.so')
      // ... código de acesso ao token ...

      throw new Error(
        'Certificado A3 requer instalação do driver do leitor de cartão e configuração do pkcs11js. ' +
        'Por enquanto, use certificado A1 ou consulte a documentação para configurar o A3.'
      )
    } catch (error: any) {
      console.error('Erro ao carregar certificado A3:', error)
      throw new Error(`Falha ao carregar certificado A3: ${error.message}`)
    }
  }

  /**
   * Obtém informações do certificado carregado
   */
  getCertificateInfo(certificate: forge.pki.Certificate): CertificateInfo {
    try {
      // Extrai CNPJ do subject (geralmente no CN ou em OID específico)
      const cnField = certificate.subject.getField('CN')
      const commonName = cnField?.value || ''

      // CNPJ geralmente está no formato "EMPRESA:CNPJ" no CN
      const cnpjMatch = commonName.match(/(\d{14})/)
      const cnpj = cnpjMatch ? cnpjMatch[1] : ''

      const orgField = certificate.subject.getField('O')
      const organizationName = orgField?.value || ''

      const issuerCnField = certificate.issuer.getField('CN')
      const issuerOrgField = certificate.issuer.getField('O')

      const validFrom = certificate.validity.notBefore
      const validTo = certificate.validity.notAfter
      const now = new Date()
      const isValid = now >= validFrom && now <= validTo

      return {
        subject: {
          commonName,
          organizationName,
          cnpj,
        },
        issuer: {
          commonName: issuerCnField?.value || '',
          organizationName: issuerOrgField?.value || '',
        },
        serialNumber: certificate.serialNumber,
        validFrom,
        validTo,
        isValid,
      }
    } catch (error: any) {
      console.error('Erro ao extrair informações do certificado:', error)
      throw new Error(`Falha ao ler informações do certificado: ${error.message}`)
    }
  }

  /**
   * Valida se o certificado está válido e corresponde ao CNPJ
   */
  validateCertificate(certificate: forge.pki.Certificate, expectedCnpj: string): boolean {
    try {
      const info = this.getCertificateInfo(certificate)

      // Verifica validade temporal
      if (!info.isValid) {
        throw new Error('Certificado expirado ou ainda não válido')
      }

      // Verifica CNPJ
      const certificateCnpj = info.subject.cnpj.replace(/\D/g, '')
      const compareCnpj = expectedCnpj.replace(/\D/g, '')

      if (certificateCnpj !== compareCnpj) {
        throw new Error(
          `CNPJ do certificado (${certificateCnpj}) não corresponde ao CNPJ esperado (${compareCnpj})`
        )
      }

      return true
    } catch (error: any) {
      console.error('Erro na validação do certificado:', error)
      throw error
    }
  }

  /**
   * Limpa o cache do certificado
   */
  clearCache(): void {
    this.certificateCache = {}
  }

  /**
   * Obtém o certificado em cache (se ainda válido)
   */
  getCached(): {
    certificate?: forge.pki.Certificate
    privateKey?: forge.pki.PrivateKey
  } | null {
    if (!this.certificateCache.certificate || !this.certificateCache.loadedAt) {
      return null
    }

    // Cache válido por 1 hora
    const cacheAge = Date.now() - this.certificateCache.loadedAt.getTime()
    if (cacheAge > 60 * 60 * 1000) {
      this.clearCache()
      return null
    }

    return {
      certificate: this.certificateCache.certificate,
      privateKey: this.certificateCache.privateKey,
    }
  }
}

export const certificateService = new CertificateService()
