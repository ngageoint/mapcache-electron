const environment = {
  defaultBaseMaps: [
    {name: 'OSM Default', url: 'https://osm-{s}.gs.mil/tiles/default/{z}/{x}/{y}.png', subdomains: [1,2,3,4], attribution: 'Map data &copy; <a onclick="window.mapcache.openExternal(\'http://openstreetmap.org\')" href="#">OpenStreetMap</a> contributors, <a onclick="window.mapcache.openExternal(\'http://creativecommons.org/licenses/by-sa/2.0/\')" href="#">CC-BY-SA</a>'},
    {name: 'OSM Humanitarian', url: 'https://osm-{s}.gs.mil/tiles/humanitarian/{z}/{x}/{y}.png', subdomains: [1,2,3,4], attribution: 'Map data &copy; <a onclick="window.mapcache.openExternal(\'http://openstreetmap.org\')" href="#">OpenStreetMap</a> contributors, <a onclick="window.mapcache.openExternal(\'http://creativecommons.org/licenses/by-sa/2.0/\')" href="#">CC-BY-SA</a>'},
    {name: 'OSM Bright', url: 'https://osm-{s}.gs.mil/tiles/bright/{z}/{x}/{y}.png', subdomains: [1,2,3,4], attribution: 'Map data &copy; <a onclick="window.mapcache.openExternal(\'http://openstreetmap.org\')" href="#">OpenStreetMap</a> contributors, <a onclick="window.mapcache.openExternal(\'http://creativecommons.org/licenses/by-sa/2.0/\')" href="#">CC-BY-SA</a>'}],
  nominatimUrl: 'https://osm-nominatim.gs.mil',
  overpassUrl: 'https://osm-overpass.gs.mil/overpass/interpreter',
  wikipediaUrl: 'https://{cc}.wikipedia.org',
  mapcacheRepo: 'https://github.com/ngageoint/mapcache-electron',
  geopackageUrl: 'https://geopackage.org',
  geopackageLibrariesUrl: 'https://ngageoint.github.io/GeoPackage',
  eventkitUrl: 'https://eventkit.gs.mil',
  preloadedDataSources: [
    // {
    //   filePath: 'http://localhost:8080/geoserver/wms',
    //   layers: [],
    //   sourceLayerName: 'GeoServer',
    //   visible: false,
    //   layerType: 'WMS',
    //   withCredentials: false,
    //   minZoom: 0,
    //   maxZoom: 20,
    //   extent: [-180, -90, 180, 90],
    //   srs: 'EPSG:4326',
    //   name: 'GeoServer',
    //   displayName: 'GeoServer',
    //   style: {},
    //   format: 'image/png',
    //   styleKey: 0,
    //   opacity: 1,
    //   pane: 'tile',
    //   rateLimit: 50,
    //   retryAttempts: 3,
    //   timeoutMs: 5000
    // }
  ]
}

export {
  environment
}
