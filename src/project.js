import * as Projects from './projects';
import { remote } from 'electron';
import path from 'path';
import L from 'leaflet';
import jetpack from "fs-jetpack";
import vendor from './vendor';

let currentWindow = remote.getCurrentWindow();

const projectId = new URL(location.href).searchParams.get('id');

let projectConfiguration = Projects.getProjectConfiguration(projectId);
projectConfiguration.sources = projectConfiguration.sources || {};

document.querySelector('#project-name').innerHTML = projectConfiguration.name;

currentWindow.setTitle(projectConfiguration.name);

let sourceArray = [];
for (var sourceId in projectConfiguration.sources) {
  let source = projectConfiguration.sources[sourceId];
  source.shown = Math.round(Math.random()) == 1 ? true : false;
  sourceArray.push(source);
}

let sourcesHtml = require('./views/sourceList.mustache').render({sources:sourceArray}, {
  source: require('./views/source.mustache')
});

document.querySelector('#source-container').innerHTML = sourcesHtml;


const map = L.map('map');
const defaultCenter = [38.889269, -77.050176];
const defaultZoom = 2;
const basemap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
});

map.setView(defaultCenter, defaultZoom);

basemap.addTo(map);

document.ondragover = document.ondrop = (ev) => {
  ev.preventDefault();
}

document.querySelector('#source-drop-zone').ondrop = (ev) => {
  console.log(ev.dataTransfer.files[0].path);
  ev.preventDefault();
  let fileToOpen = ev.dataTransfer.files[0].path;
  addSource(fileToOpen);
}

document.querySelector('#source-drop-zone').addEventListener('click', function() {
  var files = remote.dialog.showOpenDialog({
    properties: ['openFile']
  });
  let fileToOpen = files[0];
});

for (var sourceId in projectConfiguration.sources) {
  addSource(projectConfiguration.sources[sourceId]);
}

function addSource(source) {
  if (!source.filePath) {
    let filePath = source;
    source = {
      filePath: filePath,
      type: path.extname(filePath).slice(1),
      name: path.basename(filePath),
      shown: true
    };
  }
  switch(source.type) {
    case 'geojson':
    case 'json':
    source.type = 'geojson';
      handleGeoJSONFile(source);
      break;
    default:
      console.log('unknown file type', filePath, source.type);
  }
}

function handleGeoJSONFile(source) {
  console.log('Handling GeoJSON ', source.filePath);
  var geojson = jetpack.read(source.filePath, 'json');
  L.vectorGrid.slicer(geojson, {

  }).addTo(map);
  saveSource(source);
}

function saveSource(source) {
  if (!source.id) {
    source.id = Projects.getId();
  }
  projectConfiguration.sources[source.id] = source;
  Projects.saveProject(projectConfiguration);
}

//
// var GeoPackage = require('@ngageoint/geopackage');
//
// GeoPackage.open(files[0])
// .then(function(geopackage) {
//   console.log('Opened GeoPackage at %s', files[0], geopackage);
//
//   var tableLayer = GeoPackageUtilities.addTileLayerToMap(geopackage, 'TILESosmds', map);
//   tableLayer.bringToFront();
//
//   var featureLayer = GeoPackageUtilities.addFeatureLayerToMap(geopackage, 'FEATURESriversds', map);
//   featureLayer.bringToFront();
//
//   vectorLayer.bringToFront();
// })
// .catch(function(err) {
//   console.log('Failed to open GeoPackage at %s', files[0], err);
// });
