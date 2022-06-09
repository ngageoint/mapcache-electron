import { DEFAULT_TIMEOUT, DEFAULT_RETRY_ATTEMPTS, NO_LIMIT } from '../../network/HttpUtilities'
import { environment } from '../../env/env'

function getOfflineBaseMapId () {
  return environment.defaultBaseMaps.length.toString()
}

function getDefaultBaseMaps () {
  const baseMaps = environment.defaultBaseMaps.map((baseMap, index) => {
    const idxString = index.toString()
    return {
      id: idxString,
      name: baseMap.name,
      url: baseMap.url,
      pcUrl: baseMap.pcUrl,
      layerConfiguration: {
        id: idxString,
        url: baseMap.url,
        pcUrl: baseMap.pcUrl,
        attribution: baseMap.attribution,
        filePath: baseMap.url,
        pcFilePath: baseMap.pcUrl,
        sourceLayerName: baseMap.name,
        visible: false,
        styleKey: 0,
        opacity: 1.0,
        layerType: 'XYZServer',
        subdomains: baseMap.subdomains,
        pane: 'tile',
        extent: [-180, -90, 180, 90],
        retryAttempts: DEFAULT_RETRY_ATTEMPTS,
        timeoutMs: DEFAULT_TIMEOUT,
        rateLimit: NO_LIMIT,
        withCredentials: false
      },
      readonly: true,
      background: '#DDDDDD',
      darkBackground: '#333333',
      extent: [-180, -90, 180, 90]
    }
  })
  const offlineBaseMapId = baseMaps.length.toString()
  baseMaps.push({
    id: offlineBaseMapId,
    name: 'Offline',
    layerConfiguration: {
      id: offlineBaseMapId,
      filePath: 'offline',
      sourceLayerName: 'Offline',
      count: 241,
      visible: false,
      styleKey: 0,
      opacity: 1.0,
      sourceType: 'GeoJSON',
      pane: 'vector',
      extent: [-180, -90, 180, 90]
    },
    readonly: true,
    background: '#C0D9E4',
    darkBackground: '#414f5d',
    extent: [-180, -90, 180, 90]
  })
  return baseMaps
}

export {
  getOfflineBaseMapId,
  getDefaultBaseMaps
}
