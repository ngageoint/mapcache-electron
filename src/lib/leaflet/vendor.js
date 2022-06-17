import L from 'leaflet'

import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

import iconEnhancement from './map/improvements/IconEnhancement'
import initSmoothWheel from './map/improvements/Leaflet.SmoothWheelZoom'
import tileLayerNoGap from './map/improvements/Leaflet.TileLayer.NoGap'
import mapCacheLayer from './map/layers/MapCacheLayer'
import mapCacheRemoteLayer from './map/layers/MapCacheRemoteLayer'
import { setupGARSGrid } from './map/grid/gars/garsLeaflet'
import { setupMGRSGrid } from './map/grid/mgrs/mgrsLeaflet'
import { setupXYZGrid } from './map/grid/xyz/xyz'

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

export * as L from 'leaflet'
