var GeoPackage = require('@ngageoint/geopackage');

import L from 'leaflet';

require('leaflet.vectorgrid');

export const addTileLayerToMap = (geopackage, layerName, map) => {
  var tileDao = geopackage.getTileDao(layerName);
  // these are not the correct zooms for the map.  Need to convert the GP zooms to leaflet zooms
  var maxZoom = tileDao.maxWebMapZoom;
  var minZoom = tileDao.minWebMapZoom;
  var tableLayer = new L.GridLayer({noWrap: true, minZoom: minZoom, maxZoom: maxZoom});
  tableLayer.createTile = function(tilePoint, done) {
    var canvas = L.DomUtil.create('canvas', 'leaflet-tile');
    var size = this.getTileSize();
    canvas.width = size.x;
    canvas.height = size.y;
    setTimeout(function() {
      console.time('Draw tile ' + tilePoint.x + ', ' + tilePoint.y + ' zoom: ' + tilePoint.z);
      GeoPackage.getTileFromXYZ(geopackage, layerName, tilePoint.x, tilePoint.y, tilePoint.z, size.x, size.y)
      .then(function(image) {
          console.timeEnd('Draw tile ' + tilePoint.x + ', ' + tilePoint.y + ' zoom: ' + tilePoint.z);
          var ctx = canvas.getContext('2d');
          var cImage = new Image();
          cImage.onload = function(e) {
              ctx.drawImage(cImage, 0, 0);
              done(null, canvas);
          };
          var blob = new Blob([image], {'type': 'image/png'});
          var url = URL.createObjectURL(blob);
          cImage.src = url;
      });
    }, 0);
    return canvas;
  }
  map.addLayer(tableLayer);
  return tableLayer;
};

export const addFeatureLayerToMap = (geopackage, layerName, map) => {
  var styles = {};
  styles[layerName] = {
    weight: 2,
    radius: 3
  };

  var vectorLayer = L.vectorGrid.protobuf('',{
    maxNativeZoom: 18,
    vectorTileLayerStyles: styles,
    interactive: true,
    rendererFactory: L.canvas.tile,
    getFeatureId: function(feature) {
      feature.properties.id = layerName + feature.id;
      return feature.properties.id;
    }
  })
  .bindPopup(function(feature) {
    var string = "popup";
    // var columnMap = tableInfos[layerName].columnMap;
    // var string = "";
    // if (feature.properties.name || feature.properties.description) {
    //     string += feature.properties.name ? '<div class="item"><span class="label">' +feature.properties.name : '</span></div>';
    //     string += feature.properties.description ? feature.properties.description : '';
    // } else {
    //   for (var key in feature.properties) {
    //     if (columnMap && columnMap[key] && columnMap[key].displayName) {
    //       string += '<div class="item"><span class="label">' + columnMap[key].displayName + ': </span>';
    //     } else {
    //       string += '<div class="item"><span class="label">' + key + ': </span>';
    //     }
    //     string += '<span class="value">' + feature.properties[key] + '</span></div>';
    //   }
    // }
    return string;
  });

  vectorLayer._getVectorTilePromise = function(coords, tileBounds) {
    return getTile(geopackage, coords, tileBounds, layerName);
  }
  vectorLayer.addTo(map);
  return vectorLayer;
};

function getTile(geopackage, coords, tileBounds, table) {
  var x = coords.x;
  var y = coords.y;
  var z = coords.z;
  return GeoPackage.getVectorTile(geopackage, table, x, y, z)
  .then(function(json) {
    // Normalize feature getters into actual instanced features
    for (var layerName in json.layers) {
      var feats = [];

      for (var i=0; i<json.layers[layerName].length; i++) {
        var feat = json.layers[layerName].feature(i);
        feat.geometry = feat.loadGeometry();
        feats.push(feat);
      }

      json.layers[layerName].features = feats;
    }

    return json;
  });
}
