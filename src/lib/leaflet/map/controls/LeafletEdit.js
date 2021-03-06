/* eslint-disable no-empty */
import {L} from '../../vendor'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import cloneDeep from 'lodash/cloneDeep'

export default class LeafletEdit extends L.Control {
  constructor (options) {
    let mergedOptions = {
      ...{
        position: 'topright',
        enabled: true
      },
      ...options
    }
    super(mergedOptions)
  }

  /**
   * Explodes a flattened feature using it's container structure
   * @param container
   * @param features
   * @returns {{coordinates: *, type: *}|{geometries: *, type: *}}
   */
  static explodeFlattenedFeature (container, features) {
    let geometry
    if (container.isLeaf) {
      const indexedFeature = features.find(feature => feature.properties.index === container.index)
      if (!isNil(indexedFeature)) {
        geometry = indexedFeature.geometry
      }
    } else {
      if (container.type === 'GeometryCollection') {
        let geometries = container.items.map(item => this.explodeFlattenedFeature(item, features))
        if (geometries.length > 0) {
          geometry = {
            type: container.type,
            geometries: geometries
          }
        }
      } else if (container.type === 'Polygon') {
        let coordinates = container.items.map(item => this.explodeFlattenedFeature(item, features))
        geometry = {
          type: 'Polygon',
          coordinates: coordinates.map(coordinate => coordinate.coordinates[0])
        }
      } else {
        let coordinates = container.items.map(item => this.explodeFlattenedFeature(item, features)).map(geometry => geometry.coordinates)
        if (coordinates.length > 0) {
          geometry = {
            type: container.type,
            coordinates: coordinates
          }
        }
      }
    }
    return geometry
  }

  /**
   * This will take a feature and flatten it. If it contains any multi features or geometry collections within it, they will be flattened as well
   * @param feature
   * @param indexObject
   */
  static flattenFeature (feature, indexObject = {index: 0}) {
    let features = []
    // each container represents a geometry in the feature
    let container = {
      type: feature.geometry.type,
      isLeaf: false,
      items: []
    }
    switch (window.mapcache.GeometryType.fromName(feature.geometry.type.toUpperCase())) {
      case window.mapcache.GeometryType.MULTIPOINT:
      case window.mapcache.GeometryType.MULTILINESTRING:
      case window.mapcache.GeometryType.MULTIPOLYGON:
        feature.geometry.coordinates.forEach(coordinates => {
          let result = LeafletEdit.flattenFeature({
            type: 'Feature',
            geometry: {
              type: feature.geometry.type.substring(5),
              coordinates
            },
            properties: {}
          }, indexObject)
          result.features.forEach(feature => {
            features.push(feature)
          })
          container.items.push(result.container)
        })
        break
      case window.mapcache.GeometryType.GEOMETRYCOLLECTION:
        feature.geometry.geometries.forEach(geometry => {
          let result = LeafletEdit.flattenFeature({
            type: 'Feature',
            geometry: geometry,
            properties: {}
          }, indexObject)
          result.features.forEach(feature => {
            features.push(feature)
          })
          container.items.push(result.container)
        })
        break
      case window.mapcache.GeometryType.POLYGON:
        // polygon has an external ring and up to several holes.
        // split these up some...
        if (feature.geometry.coordinates.length > 1) {
          feature.geometry.coordinates.forEach(coordinates => {
            let result = LeafletEdit.flattenFeature({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
              },
              properties: {}
            }, indexObject)
            result.features.forEach(feature => {
              features.push(feature)
            })
            container.items.push(result.container)
          })
        } else {
          container.isLeaf = true
          container.index = indexObject.index
          feature.properties.index = indexObject.index
          features.push(feature)
          indexObject.index++
        }
        break
      default:
        container.isLeaf = true
        container.index = indexObject.index
        feature.properties.index = indexObject.index
        features.push(feature)
        indexObject.index++
        break
    }
    return {
      features,
      container
    }
  }

  isEditing () {
    return this.editingLayer != null
  }

  onAdd (map) {
    let container = L.DomUtil.create('div', 'leaflet-bar leaflet-touch leaflet-control hidden')
    this._saveLink = L.DomUtil.create('a', '', container)
    this._cancelLink = L.DomUtil.create('a', 'warning--text', container)
    this._saveLink.title = 'Save'
    this._saveLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><path fill="currentColor" d="M17 3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V7L17 3M19 19H5V5H16.17L19 7.83V19M12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12M6 6H15V10H6V6Z" /></svg>`
    this._cancelLink.title = 'Cancel'
    this._cancelLink.innerHTML = `<svg style="margin-top: 3px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" preserveAspectRatio="xMidYMid meet" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>`

    this.show = function () {
      if (L.DomUtil.hasClass(container, 'hidden')) {
        L.DomUtil.removeClass(container, 'hidden')
      }
    }

    this.hide = function () {
      L.DomUtil.addClass(container, 'hidden')
    }

    this.editFeature = function (map, projectId, editingFeature) {
      if (!isNil(this.feature) && (this.feature.id !== editingFeature.featureToEdit.id || this.tableName !== editingFeature.tableName || this.id !== editingFeature.id)) {
        this.cancelEdit()
      } else if (isNil(this.editingLayer)) {
        this.projectId = projectId
        this.id = editingFeature.id
        this.isGeoPackage = editingFeature.isGeoPackage
        this.tableName = editingFeature.tableName
        this.feature = cloneDeep(editingFeature.featureToEdit)
        this.feature.type = 'Feature'

        let flattenResults = LeafletEdit.flattenFeature(this.feature)
        this.featureContainer = flattenResults.container
        let featureCollection = {
          type: 'FeatureCollection',
          features: flattenResults.features
        }

        this.editingLayer = L.geoJSON(featureCollection, {
          pane: 'editingPane',
          zIndex: 501,
          pointToLayer: function (geojson, latlng) {
            return new L.Marker(latlng, {draggable: true})
          },
          onEachFeature: function (featureData, layer) {
            try {
              if (layer._layers) {
                const layerKeys = keys(layer._layers)
                for (let i = 0; i < layerKeys.length; i++) {
                  try {
                    layer._layers[layerKeys[i]].editing.enable()
                  } catch (e) {}
                }
              }
              layer.editing.enable()
            } catch (e) {}
          }
        }).addTo(map)
      }
    }

    this.cancelEdit = function () {
      if (!isNil(this.editingLayer)) {
        map.removeLayer(this.editingLayer)
      }
      window.mapcache.clearEditFeatureGeometry({projectId: this.projectId})
      this.editingLayer = null
      this.projectId = null
      this.id = null
      this.isGeoPackage = null
      this.tableName = null
      this.feature = null
      this.featureContainer = null
    }

    this._saveLink.onclick = function (e) {
      if (!isNil(this.editingLayer)) {
        let layers = this.editingLayer.getLayers()
        this.feature.geometry = LeafletEdit.explodeFlattenedFeature(this.featureContainer, layers.map(layer => {
          let feature = cloneDeep(layer.feature)
          if (window.mapcache.GeometryType.fromName(layer.feature.geometry.type.toUpperCase()) === window.mapcache.GeometryType.POINT) {
            feature.geometry.coordinates = [layer._latlng.lng, layer._latlng.lat]
          } else {
            feature.geometry = layer.toGeoJSON(10).geometry
          }
          return feature
        }))
        window.mapcache.updateFeatureGeometry({projectId: this.projectId, id: this.id, isGeoPackage: this.isGeoPackage, tableName: this.tableName, featureGeoJson: this.feature})
      }
      this.cancelEdit()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    this._cancelLink.onclick = function (e) {
      this.cancelEdit()
      e.stopPropagation()
      e.preventDefault()
    }.bind(this)

    return container
  }
}
