const letter_array = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
const five_minute_array = [['7', '4', '1'], ['8', '5', '2'], ['9', '6', '3']]

function latLng2Name (lat, lng, rounding) {
  let latitude = Math.floor(Math.abs(lat))
  latitude -= latitude % rounding
  let longitude = Math.floor(lng)
  longitude -= longitude % rounding

  longitude = fixLongitude((longitude))
  const longitudeCardinal = longitude >= 0 && longitude < 180.0 ? 'E' : 'W'
  const latitudeCardinal = lat >= 0 ? 'N' : 'S'
  return Math.abs(longitude) + longitudeCardinal + latitude + latitudeCardinal
}

//Pass in a lat/lng, get out a GARS string. Shorten it yourself
function latLng2GARS (lat, lng) {
  let latitude = lat
  let longitude = fixLongitude(lng)
  /* North pole is an exception, read over and down */
  if (latitude === 90.0) {
    latitude = 89.99999999999
  }
  // Check for valid lat/lon range
  if (latitude < -90 || latitude > 90) {
    return '0'
  }
  if (longitude < -180 || longitude > 180) {
    return '0'
  }
  // Get the longitude band ==============================================
  let longBand = longitude + 180
  // Normalize to 0.0 <= longBand < 360
  while (longBand < 0) {
    longBand = longBand + 360
  }
  while (longBand > 360) {
    longBand = longBand - 360
  }
  longBand = Math.floor(longBand * 2.0)
  let intLongBand = longBand + 1 // Start at 001, not 000
  let strLongBand = intLongBand.toString()
  // Left pad the string with 0's so X becomes 00X
  while (strLongBand.length < 3) {
    strLongBand = '0' + strLongBand
  }

  // Get the latitude band ===============================================
  let offset = latitude + 90
  // Normalize offset to 0 < offset <90
  while (offset < 0) {
    offset = offset + 180
  }
  while (offset > 180) {
    offset = offset - 180
  }
  offset = Math.floor(offset * 2.0)
  const firstOffest = Math.floor(offset / letter_array.length)
  const secondOffest = Math.floor(offset % letter_array.length)
  let strLatBand = letter_array[firstOffest] + letter_array[secondOffest]

  // Get the quadrant ====================================================
  let latBand = (Math.floor((latitude + 90.0) * 4.0) % 2.0)
  longBand = (Math.floor((longitude + 180.0) * 4.0) % 2.0)
  let quadrant = '0'
  // return "0" if error occurs
  if (latBand < 0 || latBand > 1) {
    return '0'
  }
  if (longBand < 0 || longBand > 1) {
    return '0'
  }
  // Otherwise get the quadrant
  if (latBand === 0.0 && longBand === 0.0) {
    quadrant = '3'
  } else if (latBand === 1.0 && longBand === 0.0) {
    quadrant = '1'
  } else if (latBand === 1.0 && longBand === 1.0) {
    quadrant = '2'
  } else if (latBand === 0.0 && longBand === 1.0) {
    quadrant = '4'
  }

  const keypad = five_minute_array[Math.floor(((longitude + 180) * 60.0) % 30 % 15 / 5.0)][Math.floor(((latitude + 90) * 60.0) % 30 % 15 / 5.0)]

  return strLongBand + strLatBand + quadrant + keypad
}

function fixLongitude (lng) {
  while (lng > 180.0) {
    lng -= 360.0
  }
  while (lng < -180.0) {
    lng += 360.0
  }
  return lng
}

export {
  fixLongitude,
  latLng2GARS,
  latLng2Name
}
