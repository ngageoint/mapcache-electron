import { blankMarker, blankMarker2x, marker, marker2x } from '../../markers.js'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

/**
 * Adapted from https://github.com/Leaflet/Leaflet.Icon.Glyph, which was originally written by ivan@sanchezortega.es
 */
export default function (L) {
  delete L.Icon.Default.prototype._getIconUrl

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: marker2x,
    iconUrl: marker,
    shadowUrl: markerShadow
  })

  L.Icon.MaterialDesignIcon = L.Icon.extend({
    options: {
      iconRetinaUrl: blankMarker2x,
      iconUrl: blankMarker,
      shadowUrl: markerShadow,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41],
      className: '',
      prefix: 'mdi',
      glyphSvg: null,
      glyphColor: '#FFFFFF',
      glyphSize: 15,
      glyphAnchor: [5, 5]
    },

    createIcon: function () {
      const div = document.createElement('div')
      div.appendChild(this._createGlyph())
      this._setIconStyles(div, 'icon')
      return div
    },

    _createGlyph: function () {
      const options = this.options
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      if (options.glyphSvg != null) {
        svg.setAttribute('width', options.glyphSize + 'px')
        svg.setAttribute('height', options.glyphSize + 'px')
        svg.setAttribute('viewBox', '0 0 24 24')
        svg.style.marginLeft = options.glyphAnchor[0] + 'px'
        svg.style.marginTop = options.glyphAnchor[1] + 'px'
        svg.style.pointerEvents = 'none'
        const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        svgPath.setAttribute('fill', options.glyphColor)
        svgPath.setAttribute('d', options.glyphSvg)
        svg.appendChild(svgPath)
      } else {
        svg.setAttribute('width', '9px')
        svg.setAttribute('height', '9px')
        svg.setAttribute('viewBox', '0 0 9 9')
        svg.style.marginLeft = '8px'
        svg.style.marginTop = '8px'
        svg.style.pointerEvents = 'none'
        const svgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        svgCircle.setAttribute('fill', options.glyphColor)
        svgCircle.setAttribute('cx', '4.5')
        svgCircle.setAttribute('cy', '4.5')
        svgCircle.setAttribute('r', '4.5')
        svg.appendChild(svgCircle)
      }
      return svg
    },

    _setIconStyles: function (div, name) {
      let options = this.options
      let sizeOption = options[name + 'Size']

      if (typeof sizeOption === 'number') {
        sizeOption = [sizeOption, sizeOption]
      }

      let size = L.point(sizeOption),
        anchor = L.point(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
          size && size.divideBy(2, true))

      div.className = 'leaflet-marker-' + name + ' leaflet-glyph-icon ' + (options.className || '')

      const src = this._getIconUrl(name)
      if (src) {
        div.style.backgroundImage = 'url(' + src + ')'
        div.style.backgroundSize = 'cover'
      }

      if (anchor) {
        div.style.marginLeft = (-anchor.x) + 'px'
        div.style.marginTop = (-anchor.y) + 'px'
      }

      if (size) {
        div.style.width = size.x + 'px'
        div.style.height = size.y + 'px'
      }
    },
  })

  L.icon.materialDesignIcon = function (options) {
    return new L.Icon.MaterialDesignIcon(options)
  }
}