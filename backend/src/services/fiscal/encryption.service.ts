import crypto from 'crypto'

/**
 * Serviço de criptografia para dados sensíveis
 * Usado para criptografar PIN do certificado, CSC Token, senhas, etc.
 *
 * IMPORTANTE: A variável ENCRYPTION_KEY deve ter pelo menos 32 caracteres
 * Gere uma chave segura com: openssl rand -hex 32
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm'
  private keyLength = 32
  private ivLength = 16
  private saltLength = 64
  private tagLength = 16
  private tagPosition: number
  private encryptedPosition: number
  private masterKey: string

  constructor() {
    this.tagPosition = this.saltLength + this.ivLength
    this.encryptedPosition = this.tagPosition + this.tagLength

    // Validate ENCRYPTION_KEY at initialization
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
      console.error('❌ FATAL: ENCRYPTION_KEY não está definida nas variáveis de ambiente!')
      console.error('   Configure a variável ENCRYPTION_KEY no arquivo .env')
      console.error('   Gere uma chave segura com: openssl rand -hex 32')
      process.exit(1)
    }

    if (key.length < 32) {
      console.error('❌ FATAL: ENCRYPTION_KEY deve ter pelo menos 32 caracteres!')
      console.error(`   Tamanho atual: ${key.length} caracteres`)
      console.error('   Gere uma chave segura com: openssl rand -hex 32')
      process.exit(1)
    }

    this.masterKey = key
  }

  /**
   * Gera uma chave de criptografia a partir da senha mestre
   */
  private getKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha512')
  }

  /**
   * Criptografa um texto
   */
  encrypt(plainText: string): string {
    try {
      const salt = crypto.randomBytes(this.saltLength)
      const iv = crypto.randomBytes(this.ivLength)
      const key = this.getKey(salt)

      const cipher = crypto.createCipheriv(this.algorithm, key, iv)
      const encrypted = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final(),
      ])

      const tag = cipher.getAuthTag()

      // Combina: salt + iv + tag + encrypted
      const result = Buffer.concat([salt, iv, tag, encrypted])
      return result.toString('base64')
    } catch (error) {
      console.error('Erro ao criptografar:', error)
      throw new Error('Falha ao criptografar dados sensíveis')
    }
  }

  /**
   * Descriptografa um texto
   */
  decrypt(encryptedText: string): string {
    try {
      const data = Buffer.from(encryptedText, 'base64')

      const salt = data.subarray(0, this.saltLength)
      const iv = data.subarray(this.saltLength, this.tagPosition)
      const tag = data.subarray(this.tagPosition, this.encryptedPosition)
      const encrypted = data.subarray(this.encryptedPosition)

      const key = this.getKey(salt)

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv)
      decipher.setAuthTag(tag)

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ])

      return decrypted.toString('utf8')
    } catch (error) {
      console.error('Erro ao descriptografar:', error)
      throw new Error('Falha ao descriptografar dados sensíveis')
    }
  }

  /**
   * Criptografa um objeto JSON
   */
  encryptObject(obj: any): string {
    return this.encrypt(JSON.stringify(obj))
  }

  /**
   * Descriptografa para objeto JSON
   */
  decryptObject<T>(encryptedText: string): T {
    const decrypted = this.decrypt(encryptedText)
    return JSON.parse(decrypted) as T
  }
}

export const encryptionService = new EncryptionService()
