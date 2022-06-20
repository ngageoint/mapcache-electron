function isHtml (text) {
  return text.indexOf('<html') !== -1 && text.indexOf('html>') !== -1
}


export {
  isHtml
}