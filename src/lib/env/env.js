const environment = {
  defaultBaseMaps: [
    {
      name: 'OSM Default',
      url: 'https://osm-{s}.gs.mil/tiles/default/{z}/{x}/{y}.png',
      pcUrl: 'https://osm-{s}.gs.mil/tiles/default_pc/{z}/{x}/{y}.png',
      subdomains: [1, 2, 3, 4],
      attribution: 'Map data &copy; <a onclick="window.mapcache.openExternal(\'http://openstreetmap.org\')" href="#">OpenStreetMap</a> contributors, <a onclick="window.mapcache.openExternal(\'http://creativecommons.org/licenses/by-sa/2.0/\')" href="#">CC-BY-SA</a>'
    },
    {
      name: 'OSM Humanitarian',
      url: 'https://osm-{s}.gs.mil/tiles/humanitarian/{z}/{x}/{y}.png',
      pcUrl: 'https://osm-{s}.gs.mil/tiles/humanitarian_pc/{z}/{x}/{y}.png',
      subdomains: [1, 2, 3, 4],
      attribution: 'Map data &copy; <a onclick="window.mapcache.openExternal(\'http://openstreetmap.org\')" href="#">OpenStreetMap</a> contributors, <a onclick="window.mapcache.openExternal(\'http://creativecommons.org/licenses/by-sa/2.0/\')" href="#">CC-BY-SA</a>'
    },
    {
      name: 'OSM Bright',
      url: 'https://osm-{s}.gs.mil/tiles/bright/{z}/{x}/{y}.png',
      pcUrl: 'https://osm-{s}.gs.mil/tiles/bright_pc/{z}/{x}/{y}.png',
      subdomains: [1, 2, 3, 4],
      attribution: 'Map data &copy; <a onclick="window.mapcache.openExternal(\'http://openstreetmap.org\')" href="#">OpenStreetMap</a> contributors, <a onclick="window.mapcache.openExternal(\'http://creativecommons.org/licenses/by-sa/2.0/\')" href="#">CC-BY-SA</a>'
    }],
  nominatimUrl: 'https://osm-nominatim.gs.mil',
  overpassUrl: 'https://osm-overpass.gs.mil/overpass/interpreter',
  wikipediaUrl: 'https://{cc}.wikipedia.org',
  mapcacheRepo: 'https://github.com/ngageoint/mapcache-electron',
  geopackageUrl: 'https://geopackage.org',
  geopackageLibrariesUrl: 'https://ngageoint.github.io/GeoPackage',
  eventkitUrl: 'https://eventkit.gs.mil',
  surveyUrl: 'https://portal.geo.nga.mil/survey123/share/93444389134845e79d79f18a11ab17d3',
  matomoUrl: 'https://webanalytics.nga.mil/',
  matomoSiteId: '983',
  matomoEnabled: false,
  preloadedDataSources: []
}

export {
  environment
}
