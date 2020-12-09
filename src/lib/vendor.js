import L from 'leaflet'

// hack so that leaflet's images work after going through webpack
import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import LeafletEditable from 'leaflet-editable' // eslint-disable-line no-unused-vars
import LeafletDraw from 'leaflet-draw' // eslint-disable-line no-unused-vars
import 'leaflet-draw/dist/leaflet.draw.css' // eslint-disable-line no-unused-vars
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow
})

export * as L from 'leaflet'
