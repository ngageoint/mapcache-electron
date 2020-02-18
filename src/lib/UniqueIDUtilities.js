import uuidv4 from 'uuid/v4'

export default class UniqueIDUtilities {
  static createUniqueID () {
    return uuidv4()
  }
}
