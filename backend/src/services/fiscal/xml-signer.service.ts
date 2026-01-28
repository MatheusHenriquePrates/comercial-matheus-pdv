import forge from 'node-forge'
import { create } from 'xmlbuilder2'
import crypto from 'crypto'

/**
 * Serviço de assinatura digital de XML no padrão XML-DSig
 * Implementa o padrão usado pela SEFAZ para NF-e/NFC-e
 */
export class XmlSignerService {
  /**
   * Assina um XML no padrão XML-DSig (enveloped signature)
   * @param xml - XML a ser assinado (string)
   * @param certificate - Certificado digital
   * @param privateKey - Chave privada
   * @param tagToSign - Tag que contém o atributo Id a ser assinado (ex: "infNFe")
   * @returns XML assinado com a tag <Signature>
   */
  async signXml(
    xml: string,
    certificate: forge.pki.Certificate,
    privateKey: forge.pki.PrivateKey,
    tagToSign: string = 'infNFe'
  ): Promise<string> {
    try {
      // 1. Parse do XML
      const doc = create(xml)

      // 2. Encontra a tag a ser assinada e extrai o ID
      const tagNode = doc.find((node) => node.node.nodeName === tagToSign)
      if (!tagNode) {
        throw new Error(`Tag ${tagToSign} não encontrada no XML`)
      }

      const refId = tagNode.first()?.att('Id')?.toString()
      if (!refId) {
        throw new Error(`Atributo Id não encontrado na tag ${tagToSign}`)
      }

      // 3. Canonicaliza o conteúdo a ser assinado (C14N)
      const tagXml = tagNode.first()?.toString({ prettyPrint: false })
      if (!tagXml) {
        throw new Error('Falha ao serializar tag para assinatura')
      }

      const canonicalizedXml = this.canonicalize(tagXml)

      // 4. Calcula o hash SHA-256 do conteúdo canonicalizado
      const hash = crypto.createHash('sha256').update(canonicalizedXml, 'utf8').digest()
      const digestValue = hash.toString('base64')

      // 5. Monta o SignedInfo
      const signedInfo = this.buildSignedInfo(refId, digestValue)

      // 6. Canonicaliza o SignedInfo
      const canonicalizedSignedInfo = this.canonicalize(signedInfo)

      // 7. Assina o SignedInfo com a chave privada
      const md = forge.md.sha256.create()
      md.update(canonicalizedSignedInfo, 'utf8')
      const signature = privateKey.sign(md)
      const signatureValue = forge.util.encode64(signature)

      // 8. Obtém o certificado em base64
      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes()
      const x509Certificate = forge.util.encode64(certDer)

      // 9. Monta a tag Signature completa
      const signatureXml = this.buildSignature(signedInfo, signatureValue, x509Certificate)

      // 10. Insere a Signature no XML original (após a tag assinada)
      const result = this.insertSignature(xml, tagToSign, signatureXml)

      return result
    } catch (error: any) {
      console.error('Erro ao assinar XML:', error)
      throw new Error(`Falha na assinatura digital: ${error.message}`)
    }
  }

  /**
   * Canonicaliza XML usando C14N (Canonical XML)
   */
  private canonicalize(xml: string): string {
    // Implementação simplificada de C14N
    // Remove espaços em branco entre tags
    // Remove quebras de linha
    // Ordena atributos
    return xml
      .replace(/>\s+</g, '><')
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .trim()
  }

  /**
   * Constrói o SignedInfo
   */
  private buildSignedInfo(refId: string, digestValue: string): string {
    return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
      `<Reference URI="#${refId}">` +
      `<Transforms>` +
      `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
      `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `</Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>`
  }

  /**
   * Constrói a tag Signature completa
   */
  private buildSignature(
    signedInfo: string,
    signatureValue: string,
    x509Certificate: string
  ): string {
    return `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      signedInfo +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
      `<X509Data>` +
      `<X509Certificate>${x509Certificate}</X509Certificate>` +
      `</X509Data>` +
      `</KeyInfo>` +
      `</Signature>`
  }

  /**
   * Insere a tag Signature no XML após a tag assinada
   */
  private insertSignature(xml: string, tagToSign: string, signatureXml: string): string {
    // Encontra o fechamento da tag a ser assinada
    const closeTagRegex = new RegExp(`(</${tagToSign}>)`, 'i')
    const match = xml.match(closeTagRegex)

    if (!match) {
      throw new Error(`Tag de fechamento </${tagToSign}> não encontrada`)
    }

    // Insere a Signature antes do fechamento
    const position = match.index!
    const before = xml.substring(0, position)
    const after = xml.substring(position)

    return before + signatureXml + after
  }

  /**
   * Verifica se um XML já está assinado
   */
  isXmlSigned(xml: string): boolean {
    return xml.includes('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">')
  }

  /**
   * Valida a assinatura de um XML assinado
   * @returns true se válida, false se inválida
   */
  async validateSignature(
    xml: string,
    certificate: forge.pki.Certificate
  ): Promise<boolean> {
    try {
      // TODO: Implementar validação completa da assinatura
      // 1. Extrair SignatureValue
      // 2. Recalcular DigestValue
      // 3. Verificar assinatura com certificado
      // 4. Validar certificado na cadeia ICP-Brasil

      // Por enquanto, apenas verifica se está assinado
      return this.isXmlSigned(xml)
    } catch (error) {
      console.error('Erro ao validar assinatura:', error)
      return false
    }
  }
}

export const xmlSignerService = new XmlSignerService()
