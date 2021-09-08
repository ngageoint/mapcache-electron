function getDefaultMapCacheStyle () {
  return {
    color: '#326482',
    opacity: 1.0,
    fillColor: '#326482',
    fillOpacity: 0.2,
    width: 3.0,
    name: 'Default',
    description: 'Default style for MapCache'
  }
}

function leafletStyle () {
  return {
    color: '#3388FF',
    opacity: 1.0,
    fillColor: '#3388FF',
    fillOpacity: 0.2,
    width: 3.0
  }
}

function hashCode (obj) {
  const str = JSON.stringify(obj)
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

export {
  getDefaultMapCacheStyle,
  leafletStyle,
  hashCode
}
