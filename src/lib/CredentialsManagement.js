import crypto from 'crypto'

/**
 * Utility class for managing credentials
 */
export default class CredentialsManagement {
  static CREDENTIAL_TYPE_NONE = 0
  static CREDENTIAL_TYPE_CERTIFICATE = 1
  static CREDENTIAL_TYPE_BEARER = 2
  static CREDENTIAL_TYPE_BASIC = 3

  static ENCRYPTION_TECHNIQUE = 'aes-256-cbc'
  static ENCRYPTION_KEY_SIZE = 32
  static ENCRYPTION_IV_SIZE = 16

  /**
   * Encrypt value
   * @param value
   * @returns {Promise<Object>}
   */
  static encrypt (value) {
    const key = CredentialsManagement.getRandomKey()
    const iv = crypto.randomBytes(CredentialsManagement.ENCRYPTION_IV_SIZE)
    const cipher = crypto.createCipheriv(CredentialsManagement.ENCRYPTION_TECHNIQUE, key, iv)
    return {
      encrypted: cipher.update(value, 'utf8', 'hex') + cipher.final('hex'),
      iv: iv.toString('hex'),
      key: key
    }
  }

  /**
   * Decrypt value
   * @param encryptedValue
   * @param iv
   * @param key
   * @returns {Promise<string>}
   */
  static decrypt (encryptedValue, iv, key) {
    const decipher = crypto.createDecipheriv(CredentialsManagement.ENCRYPTION_TECHNIQUE, key, Buffer.from(iv, 'hex'))
    return decipher.update(encryptedValue, 'hex', 'utf8') +  decipher.final()
  }

  /**
   * Gets a random hex key with the length specified
   * @returns {string}
   */
  static getRandomKey () {
    return crypto.randomBytes(CredentialsManagement.ENCRYPTION_KEY_SIZE / 2).toString('hex')
  }

  /**
   * Determines auth type from auth string
   * @param authString
   * @returns {number}
   */
  static getAuthType(authString) {
    let credentialType = CredentialsManagement.CREDENTIAL_TYPE_NONE
    if (authString.toLowerCase() === 'basic') {
      credentialType = CredentialsManagement.CREDENTIAL_TYPE_BASIC
    } else if (authString.toLowerCase() === 'bearer') {
      credentialType = CredentialsManagement.CREDENTIAL_TYPE_BEARER
    }
    return credentialType
  }
}
