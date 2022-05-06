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

function getNewStyle () {
  return {
    color: '#000000',
    opacity: 1.0,
    fillColor: '#000000',
    fillOpacity: 0.2,
    width: 3.0,
    name: '',
    description: ''
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

function adjustColorForHighlight (color, amt) {
  let newColor = lightenDarkenColor(color, amt)
  if (newColor.toLowerCase() === color.toLowerCase()) {
    newColor = lightenDarkenColor(color, -1 * amt)
  }
  return newColor
}

function lightenDarkenColor (col, amt) {
  let usePound = false
  if (col[0] === '#') {
    col = col.slice(1)
    usePound = true
  }
  let num = parseInt(col, 16)
  let r = (num >> 16) + amt
  if (r > 255) {
    r = 255
  } else if (r < 0) {
    r = 0
  }
  let b = ((num >> 8) & 0x00FF) + amt
  if (b > 255) {
    b = 255
  } else if (b < 0) {
    b = 0
  }
  let g = (num & 0x0000FF) + amt
  if (g > 255) {
    g = 255
  } else if (g < 0) {
    g = 0
  }
  let colorValue = (g | (b << 8) | (r << 16)).toString(16)
  if (colorValue.length === 5) {
    colorValue = '0' + colorValue
  }
  if (usePound) {
    colorValue = '#' + colorValue
  }
  return colorValue
}

export {
  getDefaultMapCacheStyle,
  leafletStyle,
  hashCode,
  lightenDarkenColor,
  adjustColorForHighlight,
  getNewStyle
}
