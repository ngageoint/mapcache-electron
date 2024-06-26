import fs from 'node:fs'
import mapMarker from '../../../../resources/map-marker.png?asset'
import ylwPushpin from '../../../../resources/ylw-pushpin.png?asset'

function getDefaultIcon (iconName = 'New Icon', description = '') {
  return {
    width: 25,
    height: 41,
    anchorU: 0.5,
    anchorV: 1.0,
    name: iconName,
    description: description,
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(mapMarker)
  }
}

function getDefaultKMLIcon (iconName = 'New Icon', description = '') {
  return {
    width: 48,
    height: 48,
    anchorU: 0.3125,
    anchorV: 0.9375,
    name: iconName,
    description: description,
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: fs.readFileSync(ylwPushpin)
  }
}


export {
  getDefaultIcon,
  getDefaultKMLIcon
}
