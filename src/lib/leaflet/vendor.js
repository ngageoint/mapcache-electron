import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import iconEnhancement from './map/improvements/IconEnhancement.js'
import initSmoothWheel from './map/improvements/Leaflet.SmoothWheelZoom.js'
import tileLayerNoGap from './map/improvements/Leaflet.TileLayer.NoGap.js'
import mapCacheLayer from './map/layers/MapCacheLayer.js'
import mapCacheRemoteLayer from './map/layers/MapCacheRemoteLayer.js'
import { setupGARSGrid } from './map/grid/gars/garsLeaflet.js'
import { setupMGRSGrid } from './map/grid/mgrs/mgrsLeaflet.js'
import { setupXYZGrid } from './map/grid/xyz/xyz.js'

iconEnhancement(L)
initSmoothWheel(L)
tileLayerNoGap(L)
// setup default MapCache layer for file-based layers
mapCacheLayer(L)
// setup MapCache custom layer for web services
mapCacheRemoteLayer(L)
// setup grids
setupGARSGrid(L)
setupMGRSGrid(L)
setupXYZGrid(L)

window.L = L

export {
  L
}
