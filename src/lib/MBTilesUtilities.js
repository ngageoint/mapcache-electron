import Database from 'better-sqlite3'
import GarbageCollector from './GarbageCollector'

export default class MBTilesUtilities {
  static isValid(filePath) {
    let db = MBTilesUtilities.getDb(filePath)
    const info = MBTilesUtilities.getInfo(db)
    MBTilesUtilities.closeDb(db)
    if (info.format === 'pbf') {
      throw new Error('pbf formatted MBTiles are not supported.')
    }
    return true
  }

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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
    }
    return info
  }

  static closeDb (db) {
    try {
      db.close()
      db = null
      GarbageCollector.tryCollect()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

  static getDb (filePath) {
    return new Database(filePath, {readonly: true})
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)
    }
    return tileData
  }
}
