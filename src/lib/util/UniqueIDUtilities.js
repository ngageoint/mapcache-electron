import { v4 as uuidv4 } from 'uuid'

export default class UniqueIDUtilities {
  static V4_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);

  static createUniqueID () {
    return uuidv4()
  }
}
