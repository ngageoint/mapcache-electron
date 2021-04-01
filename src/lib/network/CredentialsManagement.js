import crypto from 'crypto'
import isNil from 'lodash/isNil'
import HttpUtilities from './HttpUtilities'

/**
 * Utility class for managing credentials
 */
export default class CredentialsManagement {
  static ENCRYPTION_TECHNIQUE = 'aes-256-cbc'
  static ENCRYPTION_KEY_SIZE = 32
  static ENCRYPTION_IV_SIZE = 16

  static async getAuthorizationString (credentials) {
    let authString
    if (!isNil(credentials)) {
      if (credentials.type === HttpUtilities.CREDENTIAL_TYPE_BASIC) {
        authString = 'Basic ' + btoa(credentials.username + ':' + (await CredentialsManagement.decrypt(credentials.password, credentials.iv, credentials.key)))
      } else if (credentials.type === HttpUtilities.CREDENTIAL_TYPE_BEARER) {
        authString =  'Bearer ' + (await CredentialsManagement.decrypt(credentials.token, credentials.iv, credentials.key))
      }
    }
    return authString
  }

  /**
   * Encrypt value
   * @param value
   * @returns {Promise<Object>}
   */
  static async encrypt (value) {
    let key = CredentialsManagement.getRandomKey(CredentialsManagement.ENCRYPTION_KEY_SIZE)
    const iv = crypto.randomBytes(CredentialsManagement.ENCRYPTION_IV_SIZE)
    const cipher = crypto.createCipheriv(CredentialsManagement.ENCRYPTION_TECHNIQUE, key, iv)
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return {
      encrypted: encrypted,
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
  static async decrypt (encryptedValue, iv, key) {
    const decipher = crypto.createDecipheriv(CredentialsManagement.ENCRYPTION_TECHNIQUE, key, Buffer.from(iv, 'hex'))
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8')
    decrypted += decipher.final()
    return decrypted
  }

  /**
   * Gets a random hex key with the length specified
   * @param length
   * @returns {string}
   */
  static getRandomKey (length) {
    let key = ''
    while (key.length < length) {
      key = key.concat(crypto.randomBytes(2).toString('hex'))
    }
    if (key.length > length) {
      key = key.substring(0, length)
    }
    return key
  }

  static async getHeaders (credentials) {
    let headers = {}
    if (credentials && (credentials.type === HttpUtilities.CREDENTIAL_TYPE_BASIC || credentials.type === HttpUtilities.CREDENTIAL_TYPE_BEARER)) {
      headers['authorization'] =  await CredentialsManagement.getAuthorizationString(credentials)
    }
    return headers
  }
}
