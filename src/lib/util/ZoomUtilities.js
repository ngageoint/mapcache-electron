import EventBus from '../vue/EventBus'

function getZoomToOptionsForBaseMap (baseMap) {
  let minZoom = 0
  let maxZoom = 20
  if (baseMap.layerConfiguration) {
    minZoom = baseMap.layerConfiguration.minZoom || 0
    maxZoom = baseMap.layerConfiguration.maxZoom || 20
  }
  return {
    extent: baseMap.extent || [-180, -90, 180, 90],
    minZoom,
    maxZoom
  }
}

function getZoomToOptionsForDataSource (dataSource) {
  let minZoom = dataSource.minZoom || 0
  let maxZoom = dataSource.maxZoom || 20
  return {
    extent: dataSource.extent || [-180, -90, 180, 90],
    minZoom,
    maxZoom
  }
}

async function getZoomToOptionsForGeoPackageTable (geopackage, table) {
  let minZoom = 0
  let maxZoom = 20
  let extent
  if (geopackage.tables.tiles[table]) {
    extent = geopackage.tables.tiles[table].extent
    minZoom = geopackage.tables.tiles[table].minZoom || 0
    maxZoom = geopackage.tables.tiles[table].maxZoom || 20
  } else {
    extent = geopackage.tables.features[table].extent
  }
  if (extent == null) {
   extent =  await window.mapcache.getBoundingBoxForTable(geopackage.path, table)
  }
  return {
    extent,
    minZoom,
    maxZoom
  }
}

function zoomToExtent (extent, minZoom = 0, maxZoom = 20, isPreview = false) {
  if (extent != null) {
    if (isPreview) {
      EventBus.$emit(EventBus.EventTypes.PREVIEW_ZOOM_TO, extent, minZoom, maxZoom)
    } else {
      EventBus.$emit(EventBus.EventTypes.ZOOM_TO, extent, minZoom, maxZoom)
    }
  }
}


function zoomToSource (dataSource, isPreview = false) {
  const {extent, minZoom, maxZoom} = getZoomToOptionsForDataSource(dataSource)
  zoomToExtent(extent, minZoom, maxZoom, isPreview)
}

function zoomToBaseMap (baseMap, isPreview = false) {
  const {extent, minZoom, maxZoom} = getZoomToOptionsForBaseMap(baseMap)
  zoomToExtent(extent, minZoom, maxZoom, isPreview)
}

async function zoomToGeoPackageTable (geopackage, table, isPreview = false) {
  const {extent, minZoom, maxZoom} = await getZoomToOptionsForGeoPackageTable(geopackage, table)
  zoomToExtent(extent, minZoom, maxZoom, isPreview)
}

async function zoomToGeoPackageFeature (path, table, featureId, isPreview = false) {
  window.mapcache.getBoundingBoxForFeature(path, table, featureId).then(function (extent) {
    zoomToExtent(extent, 0, 20, isPreview)
  })
}

export {
  getZoomToOptionsForDataSource,
  getZoomToOptionsForBaseMap,
  getZoomToOptionsForGeoPackageTable,
  zoomToSource,
  zoomToBaseMap,
  zoomToGeoPackageTable,
  zoomToGeoPackageFeature,
  zoomToExtent
}
