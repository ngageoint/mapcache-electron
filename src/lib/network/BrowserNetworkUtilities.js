async function fetchImage (url) {
  const response = await fetch(url)
  return {
    raw: await response.arrayBuffer(),
    contentType: response.headers.get('Content-Type')
  }
}

export {
  fetchImage
}
