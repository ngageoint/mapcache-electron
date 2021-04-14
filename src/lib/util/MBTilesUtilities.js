import Database from 'better-sqlite3'
import vt from 'vector-tile'
import pako from 'pako'
import Protobuf from 'pbf'
import keys from 'lodash/keys'

export default class MBTilesUtilities {
  static getInfo(db) {
    const info = {}
    var stmt = db.prepare('SELECT name, value FROM metadata')
    try {
      stmt.all().forEach(function(row) {
        switch (row.name) {
          // The special "json" key/value pair allows JSON to be serialized
          // and merged into the metadata of an MBTiles based source. This
          // enables nested properties and non-string datatypes to be
          // captured by the MBTiles metadata table.
          case 'json':
            try {
              var jsondata = JSON.parse(row.value)
              Object.keys(jsondata).reduce(function(memo, key) {
                memo[key] = memo[key] || jsondata[key]
                return memo
              }, info)
              // eslint-disable-next-line no-empty
            } catch (err) {}
            break
          case 'minzoom':
          case 'maxzoom':
            info[row.name] = parseInt(row.value, 10)
            break
          case 'center':
          case 'bounds':
            info[row.name] = row.value.split(',').map(parseFloat)
            break
          default:
            info[row.name] = row.value
            break
        }
      })
      // eslint-disable-next-line no-unused-vars
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to determine MBTiles metadata.')
    }
    if (!info.bounds) {
      info.bounds = [-180, -90, 180, 90]
    }
    if (!info.format) {
      info.format = MBTilesUtilities.determineFormatFromTile(db)
    }
    return info
  }

  /**
   * If format needs to be determined, it will either be jpg or png, just need to determine which one
   * @param db
   */
  static determineFormatFromTile (db) {
    let format = null
    const stmt = db.prepare('SELECT tile_data FROM tiles')
    const row = stmt.get()
    if (row && row.tile_data) {
      if (row.tile_data.length > 3) {
        format = (row.tile_data[0] === 255 && row.tile_data[1] === 216 && row.tile_data[2] === 255) ? 'jpg' : 'png'
      }
    }
    return format
  }

  static getDb (filePath) {
    return new Database(filePath, {readonly: true})
  }

  static close (db) {
    if (db) {
      try {
        db.close()
        // eslint-disable-next-line no-unused-vars
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to close MBTiles database file.')
      }
    }
  }

  static getTile(db, z, x, y, format) {
    // Flip Y coordinate because MBTiles files are TMS.
    y = (1 << z) - 1 - y

    let tileData = null
    try {
      const stmt = db.prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?')
      const row = stmt.get(z, x, y)
      if (row && row.tile_data) {
        tileData = 'data:' + format + ';base64,' + Buffer.from(row.tile_data).toString('base64')
      }
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get MBTiles tile data.')
    }
    return tileData
  }

  static getVectorTileFeatures(db, z, x, y) {
    // Flip Y coordinate because MBTiles files are TMS.
    y = (1 << z) - 1 - y

    let vectorTileFeatures = []
    try {
      const stmt = db.prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?')
      const row = stmt.get(z, x, y)
      if (row && row.tile_data) {
        const decompressedData = pako.inflate(row.tile_data)
        const tile = new vt.VectorTile(new Protobuf(decompressedData))
        let layers = keys(tile.layers)
        if (!Array.isArray(layers)) {
          layers = [layers]
        }
        layers.forEach((layerID) => {
          const layer = tile.layers[layerID]
          if (layer) {
            for (let i = 0; i < layer.length; i++) {
              vectorTileFeatures.push(layer.feature(i))
            }
          }
        })
      }
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get MBTiles vector features.')
    }
    return vectorTileFeatures
  }

  static getZoomRange(db) {
    const zoomRange = {
      min: 0,
      max: 20
    }
    try {
      let stmt = db.prepare('SELECT min(zoom_level) as \'zoom_level\' FROM tiles')
      let row = stmt.get()
      zoomRange.min = row.zoom_level
      stmt = db.prepare('SELECT max(zoom_level) as \'zoom_level\' FROM tiles')
      row = stmt.get()
      zoomRange.max = row.zoom_level
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to get zoom range for MBTiles file.')
    }
    return zoomRange;
  }
}
