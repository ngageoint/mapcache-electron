async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Prepares an object for passing to window function
 * @param obj
 * @return {any}
 */
function prepareObjectForWindowFunction (obj) {
  return JSON.parse(JSON.stringify(obj))
}

export {
  sleep,
  prepareObjectForWindowFunction
}