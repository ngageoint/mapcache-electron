async function fetchImage (url) {
  try {
    const response = await fetch(url)
    return {
      data: await response.arrayBuffer(),
      contentType: response.headers.get('Content-Type')
    }
  } catch (e) {
    // sometimes an http request forces an https redirect, which can cause cors errors, unfortunately... how to remedy redirects
    if (url.startsWith('http:')) {
      const response = await fetch(url.replace('http:', 'https:'))
      return {
        data: await response.arrayBuffer(),
        contentType: response.headers.get('Content-Type')
      }
    }
  }
}

export {
  fetchImage
}
