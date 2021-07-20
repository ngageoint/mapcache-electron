function base64toUInt8Array (base64String) {
  const data = base64String.split(',')[1]
  const bytes = Buffer.from(data, 'base64').toString('binary')
  let length = bytes.length
  let out = new Uint8Array(length)

  // Loop and convert.
  while (length--) {
    out[length] = bytes.charCodeAt(length)
  }

  return out
}

export {
  base64toUInt8Array
}
