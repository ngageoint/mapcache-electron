import { v4 as uuidv4 } from 'uuid'

function createUniqueID () {
  return uuidv4()
}

const V4_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)

export {
  V4_REGEX,
  createUniqueID,
}
