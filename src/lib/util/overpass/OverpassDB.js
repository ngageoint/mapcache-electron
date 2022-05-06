import Database from 'better-sqlite3'

let insertNodeStmt
let nodeInWayStmt
let nodeIsInterestingStmt
let insertWayStmt
let insertRelStmt
let insertRelWayStmt
let skipWayStmt
let relWaysStmt
let queryWayStmt
let queryNodeStmt
let insertNodeBatch
let writeWayTransaction
let db
let batchSize = 1000
let batch = []
let waysToSkip = []
let waysToAdd = []

function getOrCreateDb (filePath) {
  db = new Database(filePath)
  _createTables(db)
  _setupPreparedStatements(db)
  return db
}

function _createTables (db) {
  _createNodeTable(db)
  _createWayTable(db)
  _createRelationsTable(db)
}

/**
 * Creates the node table
 */
function _createNodeTable (db) {
  db.exec('CREATE TABLE nodes (id INTEGER PRIMARY KEY, lat REAL NOT NULL, lon REAL NOT NULL, tags TEXT, interesting INTEGER, in_way INTEGER)')
}

/**
 * Creates the way table and way_node table
 * @param db
 * @private
 */
function _createWayTable (db) {
  db.exec('CREATE TABLE ways (id INTEGER PRIMARY KEY, tags TEXT, interesting INTEGER, is_polygon INTEGER, skip INTEGER, nodes TEXT)')
}

/**
 * Creates the relations table
 * @param db
 * @private
 */
function _createRelationsTable (db) {
  db.exec('CREATE TABLE relations (id INTEGER PRIMARY KEY, tags TEXT, interesting INTEGER)')
  db.exec('CREATE TABLE relation_ways (relation_id INTEGER, way_id INTEGER, role TEXT, tags TEXT, nodes TEXT, FOREIGN KEY (relation_id) REFERENCES relations(id) ON DELETE CASCADE, FOREIGN KEY(way_id) REFERENCES ways(id) ON DELETE CASCADE)')
}

function closeDb (db) {
  batch = []
  waysToSkip = []
  waysToAdd = []
  try {
    db.close()
    // eslint-disable-next-line no-empty, no-unused-vars
  } catch (e) {
  } finally {
    insertNodeStmt = null
    nodeInWayStmt = null
    nodeIsInterestingStmt = null
    insertWayStmt = null
    insertRelStmt = null
    insertRelWayStmt = null
    insertNodeBatch = null
    writeWayTransaction = null
    queryNodeStmt = null
  }
}

/**
 * Setup the prepared statements
 * @param db
 * @private
 */
function _setupPreparedStatements (db) {
  insertNodeStmt = db.prepare('INSERT INTO nodes (id, lat, lon, tags, interesting, in_way) VALUES (?,?,?,?,?,?)')
  nodeInWayStmt = db.prepare('UPDATE nodes SET in_way = 1 WHERE id = ?')
  nodeIsInterestingStmt = db.prepare('UPDATE nodes SET interesting = 1 WHERE id = ?')
  queryNodeStmt = db.prepare('SELECT id, lat, lon FROM nodes where id = ?')
  insertWayStmt = db.prepare('INSERT INTO ways (id, tags, interesting, is_polygon, skip, nodes) VALUES (?,?,?,?,?,?)')
  insertRelStmt = db.prepare('INSERT INTO relations (id, tags, interesting) VALUES (?,?,?)')
  insertRelWayStmt = db.prepare('INSERT INTO relation_ways (relation_id, way_id, role, tags, nodes) VALUES (?,?,?,?,?)')
  queryWayStmt = db.prepare('SELECT id, tags, interesting, is_polygon, skip, nodes from ways where id=?')
  skipWayStmt = db.prepare('UPDATE ways SET skip = 1 WHERE id = ?')
  insertNodeBatch = db.transaction((nodes) => {
    while (nodes.length > 0) {
      const node = nodes.pop()
      try {
        insertNodeStmt.run(node.id, node.lat, node.lon, JSON.stringify(node.tags), node.isInteresting ? 1 : 0, 0)
        // eslint-disable-next-line no-empty, no-unused-vars
      } catch (e) {
      }
    }
  })
  relWaysStmt = db.prepare('SELECT way_id as id, role, tags, nodes from relation_ways where relation_id=?')

  // internal nodes array object for use when writing a way
  const nodes = []
  writeWayTransaction = db.transaction((way) => {
    while (nodes.length > 0) {
      nodes.pop()
    }
    let missingNode = false
    for (let i = 0; i < way.nodes.length; i++) {
      nodeInWayStmt.run(way.nodes[i])
      if (!missingNode) {
        const node = queryNodeStmt.get(way.nodes[i])
        if (node != null) {
          nodes.push(node)
        } else {
          missingNode = true
        }
      }
    }
    if (!missingNode) {
      try {
        insertWayStmt.run(way.id, JSON.stringify(way.tags), way.isInteresting ? 1 : 0, way.isPolygon ? 1 : 0, 0, JSON.stringify(nodes))
        // eslint-disable-next-line no-empty, no-unused-vars
      } catch (e) {
      }
    }
    return !missingNode
  })
}


/**
 * Writes a node into a batch to be added after 100 are reached or flush is call
 * @param node
 */
function addNodeToBatch (node) {
  batch.unshift(node)
  if (batch.length > batchSize) {
    insertNodeBatch(batch)
  }
}

function flushNodes () {
  if (batch.length > 0) {
    insertNodeBatch(batch)
  }
}

function setNodeIsInteresting (nodeId) {
  nodeIsInterestingStmt.run(nodeId)
}

function writeWayToDb (way) {
  return writeWayTransaction(way)
}

const skipWayBatch = []

function skipWay (wayId, batch = false) {
  if (batch) {
    skipWayBatch.push(wayId)
  } else {
    skipWayStmt.run(wayId)
  }
}

function processSkips () {
  for (let i = 0; i < skipWayBatch.length; i++) {
    skipWayStmt.run(skipWayBatch[i])
  }
}

function writeRelationToDb (rel, interestingTagsFunction) {
  let added = false
  while (waysToAdd.length > 0) {
    waysToAdd.pop()
  }
  while (waysToSkip.length > 0) {
    waysToSkip.pop()
  }
  let missingWays = false
  if (rel.tags != null) {
    const isRouteOrWaterway = rel.tags.type === 'route' || rel.tags.type === 'waterway'
    const isMultiPolygonOrBoundary = rel.tags.type === 'multipolygon' || rel.tags.type === 'boundary'

    let outerCount = 0
    let firstOuterWayId = null
    for (let i = 0; i < rel.members.length; i++) {
      const member = rel.members[i]
      if (member.type === 'way') {
        if (member.role === 'outer') {
          if (firstOuterWayId == null) {
            firstOuterWayId = member.ref
          }
          outerCount++
        }
        const way = queryWayStmt.get(member.ref)
        if (way != null) {
          way.role = member.role
          waysToAdd.push(way)
          // mark ways as skippable
          if (isRouteOrWaterway && !way.interesting && way.skip === 0) {
            waysToSkip.push(member.ref)
          } else if (isMultiPolygonOrBoundary) {
            if (way.skip === 0 && member.role === 'outer' && !interestingTagsFunction(JSON.parse(way.tags), rel.tags)) {
              waysToSkip.push(member.ref)
            }
            if (way.skip === 0 && member.role === 'inner' && !way.interesting) {
              waysToSkip.push(member.ref)
            }
          }
        } else {
          missingWays = true
        }

      } else if (member.type === 'node') {
        setNodeIsInteresting(member.ref)
      }
    }

    if (outerCount === 1 && !interestingTagsFunction(rel.tags, { 'type': true })) {
      waysToSkip.push(firstOuterWayId)
    }

    if (!missingWays && waysToAdd.length > 0 && (isRouteOrWaterway || (isMultiPolygonOrBoundary && outerCount > 0))) {
      added = true
      insertRelStmt.run(rel.id, JSON.stringify(rel.tags), rel.isInteresting ? 1 : 0)
      while (waysToAdd.length > 0) {
        const way = waysToAdd.pop()
        try {
          insertRelWayStmt.run(rel.id, way.id, way.role, way.tags, way.nodes)
          // eslint-disable-next-line no-empty, no-unused-vars
        } catch (e) {
        }
      }
    }
    while (waysToSkip.length > 0) {
      const wayId = waysToSkip.pop()
      skipWay(wayId, true)
    }
    processSkips()
  }
  return added
}

function getFeaturesToProcessCount (db) {
  const nodeCount = db.prepare('SELECT COUNT(*) as cnt FROM nodes WHERE interesting=1 OR in_way=0').get().cnt
  const relCount = db.prepare('SELECT COUNT(*) as cnt FROM relations').get().cnt
  const wayCount = db.prepare('SELECT COUNT(*) as cnt FROM ways WHERE skip=0').get().cnt
  return nodeCount + relCount + wayCount
}

function iterateNodeFeatures (db, callback) {
  const stmt = db.prepare('SELECT * FROM nodes WHERE interesting=1 OR in_way=0')
  for (const node of stmt.iterate()) {
    callback(node)
  }
}

function iterateWays (db, callback) {
  const stmt = db.prepare('SELECT id, tags, is_polygon, nodes FROM ways WHERE skip=0')
  for (const way of stmt.iterate()) {
    way.tags = JSON.parse(way.tags)
    way.nodes = JSON.parse(way.nodes)
    callback(way)
  }
}

function relationIterator (db, callback) {
  const stmt = db.prepare('SELECT * FROM relations')
  for (const relation of stmt.iterate()) {
    relation.tags = JSON.parse(relation.tags)
    callback(relation)
  }
}

/**
 * Iterates over relation ways.
 * @param db
 * @param rel
 * @param callback
 */
function relationWayIterator (db, rel, callback) {
  for (const way of relWaysStmt.iterate(rel.id)) {
    way.tags = JSON.parse(way.tags)
    way.nodes = JSON.parse(way.nodes)
    callback(way)
  }
}

export {
  getOrCreateDb,
  closeDb,
  addNodeToBatch,
  writeWayToDb,
  writeRelationToDb,
  iterateNodeFeatures,
  iterateWays,
  relationIterator,
  setNodeIsInteresting,
  flushNodes,
  relationWayIterator,
  getFeaturesToProcessCount
}
