/*
Code is modified from https://github.com/AppGeo/kml-stream
Copyright (C) 2015 Applied Geographics, Inc. & Calvin W. Metcalf Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 */

import sax from 'sax'
import fs from 'fs'

// these tags are not added as properties to a feature when they are a child
// of a placemark, because they have no utility
const ignoredPropertyTags = []

// utilities
function parseCoord (data) {
  const out = data.split(',').map(parseFloat)
  if (out.length === 3 && out[2] === 0) {
    return out.slice(0, 2)
  }
  return out
}

function parseCoords (data) {
  data = data.trim()
  if (!data) return null
  return data.split(/[^0-9-.,]+/gm).filter(item => item.trim().length > 0).map(function (item) {
    return parseCoord(item.trim())
  })
}

const cleanString = (val) =>
  val
    .replace(/^[\n\r\t]+[\n\r\t]+$/g, '')
    .replace(/\\\\/g, '\\')
    .replace(/\\([r|n|t])/g, function (a, b) {
      switch (b) {
        case 'r':
          return '\r'
        case 'n':
          return '\n'
        case 't':
          return '\t'
      }
    }).trim()

const getThings = (geoms) =>
  geoms.map((i) => i.coordinates)

const mergeGeoms = (geoms) =>
  geoms.reduce((a, b) => a.concat(b.geometries), [])

const mergeCoords = (geoms) =>
  geoms.reduce((a, b) => a.concat(b.coordinates), [])

const rad = (x) => x * Math.PI / 180
const sinRad = (x) => Math.sin(rad(x))
const isClockwise = (ring) => {
  let total = 0
  let i = 0
  while (++i < ring.length) {
    const point = ring[i]
    const prevPoint = ring[i - 1]
    total += rad(point[0] - prevPoint[0]) * (2 + sinRad(prevPoint[1]) + sinRad(point[1]))
  }
  return total >= 0
}

const setWinding = (ring, clockwise) => {
  const winding = isClockwise(ring)
  const desiredWinding = Boolean(clockwise)
  if (winding !== desiredWinding) {
    ring.reverse()
  }
  return ring
}

const completeRing = (ring) => {
  if (ring.length >= 3) {
    const firstCoord = ring[0]
    const lastCoord = ring[ring.length - 1]
    if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
      ring.push(firstCoord.slice())
    }
  }
  return ring
}

function getMultiType (geoms) {
  let type
  let i = -1
  const len = geoms.length
  while (++i < len) {
    if (!type) {
      type = geoms[i].type
      continue
    }
    if (type !== geoms[i].type) {
      return 'mixed'
    }
  }
  return type
}

function handleData (key, value, props, headers) {
  if (props == null || value == null || headers == null) {
    return
  }
  const field = headers[key]
  if (field == null) {
    return
  }

  const type = field.type
  if (type == null) {
    return
  }

  let parsedValue
  switch (type) {
    case 'uint':
    case 'int':
    case 'short':
    case 'ushort':
      parsedValue = parseInt(value, 10)
      break
    case 'float':
    case 'double':
      parsedValue = parseFloat(value)
      break
    case 'bool':
      if (value === 'true' || value === '1') {
        parsedValue = true
      } else if (value === 'false' || value === '0') {
        parsedValue = false
      } else {
        return
      }
      break
    case 'string':
      parsedValue = cleanString(value)
      if (!parsedValue) {
        return
      }
      break
    default:
      return
  }
  if (field.displayName) {
    props[field.displayName] = parsedValue
  } else {
    props[key] = parsedValue
  }
}

/**
 * Streams the kml provided and when features or ground overlays tags are closed, the necessary details are passed as arguments to the callbacks
 * @param filePath
 * @param onFeature - callback for features
 * @param onGroundOverlay - callback for ground overlays
 * @param onStyle - callback for styles
 * @param onStyleMap - callback for styleMap
 */
function streamKml (filePath, onFeature, onGroundOverlay, onStyle, onStyleMap) {
  let currentId = 0
  const nextId = () => {
    return currentId++
  }
  return new Promise((resolve, reject) => {
    try {
      let currentTag = null
      let schemata = {}
      let geom = null
      let props = null
      let folder = null
      let exData = null
      let field = null
      let geoMode = null
      let isMulti = 0
      let allGeoms = []
      let geoms = null
      let headers = null
      let groundOverlay = null
      let coordsText = ''
      let style = null
      let icon = null
      let styleMode = null
      let styleId = null
      let fillStyle = 1
      let outlineStyle = 1
      let styleMap = null
      let pair = null
      let inPlacemark = false
      let hasStyleUrl = false
      const saxStream = sax.createStream(false, {
        lowercase: true
      })

      saxStream.on('opentag', (tag) => {
        try {
          currentTag = tag
          if (tag != null) {
            switch (tag.name) {
              case 'style':
                style = {
                  id: '#' + (tag.attributes.id != null ? tag.attributes.id : nextId())
                }
                return
              case 'stylemap':
                styleMap = {
                  id: '#' + (tag.attributes.id != null ? tag.attributes.id : nextId())
                }
                return
              case 'pair':
                pair = {}
                return
              case 'hotspot':
                if (icon) {
                  icon.anchor_x = {
                    value: tag.attributes.x,
                    mode: tag.attributes.xunits
                  }
                  icon.anchor_y = {
                    value: tag.attributes.y,
                    mode: tag.attributes.yunits
                  }
                }
                return
              case 'linestyle':
                styleMode = 'line'
                if (style != null) {
                  style.hasLine = true
                }
                return
              case 'polystyle':
                styleMode = 'poly'
                if (style != null) {
                  style.hasPoly = true
                }
                return
              case 'iconstyle':
                styleMode = 'icon'
                if (style != null) {
                  style.hasIcon = true
                }
                icon = {}
                return
              case 'groundoverlay':
                groundOverlay = {}
                return
              case 'simplefield':
                if (tag.attributes != null) {
                  headers[tag.attributes.name] = field = {
                    type: tag.attributes.type
                  }
                }
                return
              case 'schemadata':
                headers = schemata[tag.attributes.schemaurl]
                return
              case 'schema':
                headers = schemata['#' + tag.attributes.id] = {}
                return
              case 'placemark':
                props = {}
                inPlacemark = true
                return
              case 'folder':
                folder = {}
                return
              case 'data':
                if (tag.attributes != null) {
                  exData = {
                    name: tag.attributes.name
                  }
                }
                return
              case 'point':
                geom = {}
                geom.type = 'Point'
                geoMode = 'point'
                return
              case 'linestring':
                geom = {}
                geom.type = 'LineString'
                geoMode = 'linestring'
                return
              case 'polygon':
                geom = {}
                geom.type = 'Polygon'
                geom.coordinates = []
                geoMode = 'poly'
                return
              case 'outerboundaryis':
                geoMode = 'outerbounds'
                return
              case 'innerboundaryis':
                geoMode = 'innerbounds'
                return
              case 'multigeometry':
                if (isMulti) {
                  allGeoms.push(geoms)
                }
                isMulti++
                geoms = []
                return
            }
          }
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.debug('Failure during the handling of opentag event.')
        }
      })
      saxStream.on('text', (data) => {
        try {
          if (!data.trim() || !currentTag) return
          switch (currentTag.name) {
            case 'key':
              if (pair != null) {
                pair.key = data
              }
              return
            case 'color':
              if (groundOverlay != null) {
                try {
                  groundOverlay.alpha = Math.round(parseInt(data.substring(0, 2), 16) / 255)
                  // eslint-disable-next-line no-unused-vars
                } catch (e) {
                  groundOverlay.alpha = 1.0
                }
              } else if (style != null) {
                let alpha = 1.0
                let blue = '00'
                let green = '00'
                let red = '00'
                try {
                  if (data.length === 3) {
                    alpha = 1.0
                    blue = data.substring(0, 1) + data.substring(0, 1)
                    green = data.substring(1, 2) + data.substring(1, 2)
                    red = data.substring(2) + data.substring(2)
                  } else if (data.length === 4) {
                    alpha = parseInt(data.substring(0, 1) + data.substring(0, 1), 16) / 255
                    blue = data.substring(1, 2) + data.substring(1, 2)
                    green = data.substring(2, 3) + data.substring(2, 3)
                    red = data.substring(3) + data.substring(3)
                  } else if (data.length === 6) {
                    alpha = 1.0
                    blue = data.substring(0, 2)
                    green = data.substring(2, 4)
                    red = data.substring(4)
                  } else if (data.length === 8) {
                    alpha = parseInt(data.substring(0, 2), 16) / 255.0
                    blue = data.substring(2, 4)
                    green = data.substring(4, 6)
                    red = data.substring(6)
                  }
                  // eslint-disable-next-line no-empty, no-unused-vars
                } catch (e) {
                }
                if (styleMode === 'line') {
                  style.color = '#' + red + green + blue
                  style.opacity = alpha
                } else if (styleMode === 'poly') {
                  style.fillColor = '#' + red + green + blue
                  style.fillOpacity = alpha
                }
              }
              return
            case 'fill':
              if (styleMode === 'poly') {
                fillStyle = data
              }
              return
            case 'outline':
              if (styleMode === 'poly') {
                outlineStyle = data
              }
              return
            case 'width':
              if (style != null && styleMode === 'line') {
                style.width = parseFloat(data)
              }
              return
            case 'name':
              if (groundOverlay != null) {
                groundOverlay.name = data
              } else if (inPlacemark && props != null) {
                props.name = data
              }
              return
            case 'scale':
              if (icon != null && icon.scale == null) {
                icon.scale = parseFloat(data)
              }
              return
            case 'heading':
              if (icon != null) {
                icon.heading = data
              }
              return
            case 'href':
              if (groundOverlay != null) {
                groundOverlay.href = data
              }
              if (icon != null && styleMode === 'icon') {
                icon.href = data
              }
              return
            case 'rotation':
              if (groundOverlay != null) {
                groundOverlay.rotation = parseFloat(data)
              }
              return
            case 'north':
              if (groundOverlay != null) {
                groundOverlay.north = parseFloat(data)
              }
              return
            case 'south':
              if (groundOverlay != null) {
                groundOverlay.south = parseFloat(data)
              }
              return
            case 'east':
              if (groundOverlay != null) {
                groundOverlay.east = parseFloat(data)
              }
              return
            case 'west':
              if (groundOverlay != null) {
                groundOverlay.west = parseFloat(data)
              }
              return
            case 'simpledata':
              if (currentTag.attributes) {
                handleData(currentTag.attributes.name, data, props, headers)
              }
              return
            case 'value':
              if (exData) {
                exData.value = data
              }
              return
            case 'displayname':
              if (exData) {
                exData.displayName = data
              } else if (field) {
                field.displayName = data
              }
              return
            case 'coordinates':
              coordsText += data
              return
            case 'styleurl':
              hasStyleUrl = inPlacemark
              if (pair != null) {
                pair.styleUrl = data
              } else {
                styleId = data
              }
              return
          }

          if (ignoredPropertyTags.includes(currentTag.name)) return

          // any tag not handled that is a child of placemark or a folder should be added as a property!
          if (folder && !props) folder[currentTag.name] = data
          if (props) props[currentTag.name] = data
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.debug('Failure during the handling of text event.')
        }
      })
      saxStream.on('closetag', (tag) => {
        try {
          currentTag = null
          let multigeoms, type, thing
          switch (tag) {
            case 'pair':
              if (pair.key === 'normal') {
                styleMap.normal = pair.styleUrl || pair.style.id
              } else {
                styleMap.highlight = pair.styleUrl || pair.style.id
              }
              pair = null
              return
            case 'style':
              if (style != null && !hasStyleUrl) {
                if (fillStyle === 0 && style.fillOpacity != null) {
                  style.fillOpacity = 0.0
                }
                if (outlineStyle === 0 && style.opacity != null) {
                  style.opacity = 0.0
                }
                if (style.width == null) {
                  style.width = 2.0
                }
                if (icon != null) {
                  style.icon = icon
                }
                if (pair != null) {
                  pair.style = style
                }
                if (inPlacemark) {
                  styleId = style.id
                }
                if (style.hasLine || style.hasPoly) {
                  if (style.fillOpacity == null) {
                    style.fillOpacity = 0.0
                  }
                  if (style.fillColor == null) {
                    style.fillColor = '#000000'
                  }
                  if (style.opacity == null) {
                    style.opacity = 1.0
                  }
                  if (style.color == null) {
                    style.color = '#000000'
                  }
                }
                onStyle(style)
              }
              style = null
              icon = null
              return
            case 'stylemap':
              if (inPlacemark) {
                styleId = styleMap.id
              }
              onStyleMap(styleMap)
              styleMap = null
              return
            case 'linestyle':
              styleMode = null
              return
            case 'polystyle':
              styleMode = null
              return
            case 'coordinates':
              if (geoMode === 'point') {
                geom.coordinates = parseCoord(coordsText)
              } else if (geoMode === 'linestring') {
                geom.coordinates = parseCoords(coordsText)
              } else if (geoMode === 'outerbounds') {
                thing = parseCoords(coordsText)
                if (thing) {
                  geom.coordinates.unshift(completeRing(setWinding(thing)))
                }
              } else if (geoMode === 'innerbounds') {
                thing = parseCoords(coordsText)
                if (thing) {
                  geom.coordinates.push(completeRing(setWinding(thing, true)))
                }
              }
              coordsText = ''
              return
            case 'groundoverlay':
              onGroundOverlay(groundOverlay)
              groundOverlay = null
              return
            case 'folder':
              folder = null
              return
            case 'placemark':
              inPlacemark = false
              // eslint-disable-next-line no-case-declarations
              const out = {
                type: 'Feature',
                properties: props,
                geometry: null
              }
              if (styleId != null) {
                out.styleId = styleId.trim()
                styleId = null
              }
              if (geom && geom.type) {
                out.geometry = Object.assign({}, geom)
              }
              geom = null
              props = null
              if (out.geometry) {
                onFeature(out)
              }
              hasStyleUrl = false
              return
            case 'schemadata':
            case 'schema':
              headers = null
              return
            case 'simplefield':
              field = null
              return
            case 'data':
              if (!exData || !props || !exData.value) {
                return
              }
              if (exData.displayName) {
                props[exData.displayName] = exData.value
              } else if (exData.name) {
                props[exData.name] = exData.value
              }
              exData = null
              return
            case 'point':
            case 'linestring':
            case 'polygon':
              geoMode = null
              if (isMulti) {
                geoms.push(geom)
                geom = null
              }
              return
            case 'outerboundaryis':
            case 'innerboundaryis':
              geoMode = 'poly'
              return
            case 'multigeometry':
              isMulti--
              multigeoms = geoms
              geoms = null
              if (isMulti) {
                geoms = allGeoms.pop()
              }
              if (multigeoms.length === 0) {
                return
              }
              if (multigeoms.length === 1) {
                geom = multigeoms[0]
                if (isMulti) {
                  geoms.push(geom)
                  geom = null
                }
                return
              }
              type = getMultiType(multigeoms)
              if (type === 'mixed') {
                geom = {
                  type: 'GeometryCollection',
                  geometries: multigeoms
                }
              } else if (type === 'Point') {
                geom = {
                  type: 'MultiPoint',
                  coordinates: getThings(multigeoms)
                }
              } else if (type === 'LineString') {
                geom = {
                  type: 'MultiLineString',
                  coordinates: getThings(multigeoms)
                }
              } else if (type === 'Polygon') {
                geom = {
                  type: 'MultiPolygon',
                  coordinates: getThings(multigeoms)
                }
              } else if (type === 'GeometryCollection') {
                geom = {
                  type: 'GeometryCollection',
                  geometries: mergeGeoms(multigeoms)
                }
              } else if (type.slice(0, 5) === 'Multi') {
                geom = {
                  type: type,
                  coordinates: mergeCoords(multigeoms)
                }
              }
              if (isMulti) {
                geoms.push(geom)
                geom = null
              }
              return
          }
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.debug('Failure during the handling of the closetag event.')
        }
      })

      const fileStream = fs.createReadStream(filePath)
      saxStream.on('error', (e) => {
        fileStream.close()
        reject(e)
      })
      saxStream.on('end', () => {
        fileStream.close()
        resolve()
      })
      fileStream.pipe(saxStream)
    } catch (e) {
      reject(e)
    }
  })
}

export {
  streamKml
}
