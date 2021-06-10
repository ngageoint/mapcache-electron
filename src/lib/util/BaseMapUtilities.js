import { DEFAULT_TIMEOUT, DEFAULT_RETRY_ATTEMPTS, NO_LIMIT} from '../network/HttpUtilities'

function getOfflineBaseMapId () {
  return '3'
}

function getDefaultBaseMaps () {
  return [
    {id: '0', name: 'Default', layerConfiguration: {id: '0', filePath: 'https://osm-{s}.gs.mil/tiles/default/{z}/{x}/{y}.png', sourceLayerName: 'Default', visible: false, styleKey: 0, opacity: 1.0, layerType: 'XYZServer', subdomains: ['1', '2', '3', '4'], pane: 'tile', extent: [-180, -90, 180, 90], retryAttempts: DEFAULT_RETRY_ATTEMPTS, timeoutMs: DEFAULT_TIMEOUT, rateLimit: NO_LIMIT}, readonly: true, background: '#DDDDDD', extent: [-180, -90, 180, 90]},
    {id: '1', name: 'Bright', layerConfiguration: {id: '1', filePath: 'https://osm-{s}.gs.mil/tiles/bright/{z}/{x}/{y}.png', sourceLayerName: 'Bright', visible: false, styleKey: 0, opacity: 1.0, layerType: 'XYZServer', subdomains: ['1', '2', '3', '4'], pane: 'tile', extent: [-180, -90, 180, 90], retryAttempts: DEFAULT_RETRY_ATTEMPTS, timeoutMs: DEFAULT_TIMEOUT, rateLimit: NO_LIMIT}, readonly: true, background: '#DDDDDD', extent: [-180, -90, 180, 90]},
    {id: '2', name: 'Humanitarian', layerConfiguration: {id: '2', filePath: 'https://osm-{s}.gs.mil/tiles/humanitarian/{z}/{x}/{y}.png', sourceLayerName: 'Humanitarian', visible: false, styleKey: 0, opacity: 1.0, layerType: 'XYZServer', subdomains: ['1', '2', '3', '4'], pane: 'tile', extent: [-180, -90, 180, 90], retryAttempts: DEFAULT_RETRY_ATTEMPTS, timeoutMs: DEFAULT_TIMEOUT, rateLimit: NO_LIMIT}, readonly: true, background: '#DDDDDD', extent: [-180, -90, 180, 90]},
    {id: '3', name: 'Offline', layerConfiguration: {id: '3', filePath: 'offline', sourceLayerName: 'Offline', count: 241, visible: false, styleKey: 0, opacity: 1.0, sourceType: 'GeoJSON', pane: 'vector', extent: [-180, -90, 180, 90]}, readonly: true, background: '#C0D9E4', extent: [-180, -90, 180, 90]},
  ]
}

export {
  getOfflineBaseMapId,
  getDefaultBaseMaps
}
