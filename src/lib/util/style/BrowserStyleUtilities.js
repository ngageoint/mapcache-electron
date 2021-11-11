import { createCanvas, makeImage } from '../canvas/CanvasUtilities'
import blankMarker2x from '../../leaflet/map/markers/marker-icon-blank-2x.png'
import markerIcon from '../../leaflet/map/markers/marker-icon.png'
import { base64toUInt8Array } from '../Base64Utilities'

/**
 * Gets the DataUrl for this SVG's path attribute
 * @param d, the path
 */
function getSvgDataUrl (d) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '30px')
  svg.setAttribute('height', '30px')
  svg.setAttribute('viewBox', '0 0 24 24')
  const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  svgPath.setAttribute('fill', '#FFFFFF')
  svgPath.setAttribute('d', d)
  svg.appendChild(svgPath)
  return 'data:image/svg+xml;base64,' + window.btoa(new XMLSerializer().serializeToString(svg))
}

async function getDefaultIcon (iconName = 'New Icon', description = '') {
  const canvas = createCanvas(25, 41)
  const context = canvas.getContext('2d')
  context.drawImage(await makeImage(markerIcon), 0, 0)
  return {
    width: 25,
    height: 41,
    anchorU: 0.5,
    anchorV: 1.0,
    name: iconName,
    description: description,
    contentType: 'image/png',
    // eslint-disable-next-line no-undef
    data: base64toUInt8Array(canvas.toDataURL())
  }
}

async function getSvgMarkerIconData (iconName, svgPath) {
  const canvas = createCanvas(50, 82)
  const context = canvas.getContext('2d')
  context.drawImage(await makeImage(blankMarker2x), 0, 0)
  context.drawImage(await makeImage(getSvgDataUrl(svgPath)), 10, 10)
  return {
    width: 25,
    height: 41,
    anchorU: 0.5,
    anchorV: 1.0,
    name: iconName,
    description: '',
    contentType: 'image/png',
    data: base64toUInt8Array(canvas.toDataURL())
  }
}

export {
  getDefaultIcon,
  getSvgMarkerIconData
}
