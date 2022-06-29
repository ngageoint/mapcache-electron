import wizard from 'overpass-wizard'
import { presets } from './iD_presets.json'

const tagLookup = {"ATM":{"where":"amenity='atm'"},"Accommodation":{"where":"tourism IN ('hotel','chalet','guest_house','hostel','motel')"},"Administrative Boundary":{"where":"boundary='administrative'"},"Agriculture":{"where":"landuse IN ('farmland','farmyard','greenhouse_horticulture')"},"Airport":{"where":"aeroway OR building='aerodrome'"},"Alternative":{"where":"healthcare='alternative' OR shop IN ('herbalist','nutrition_supplements')"},"Ambulance Station":{"where":"emergency='ambulance_station'"},"Backup Generator":{"where":"backup_generator"},"Bank":{"where":"amenity='bank'"},"Barrier":{"where":"barrier"},"Buildings":{"where":"building"},"Bureau de Change":{"where":"amenity='bureau_de_change'"},"Bus Station":{"where":"amenity='bus_station'"},"Cemetery":{"where":"amenity='grave_yard' OR landuse='cemetery'"},"Clinic":{"where":"amenity='clinic'"},"Coastline":{"where":"natural='coastline'"},"College":{"where":"amenity='college'"},"Commercial":{"where":"shop OR tourism OR amenity IN ('marketplace','restaurant','fast_food','cafe','bar','pub') OR office"},"Communication":{"where":"office='telecommunication' OR \"tower:type\"='communication' OR man_made='communications_tower'"},"Communication Office":{"where":"office='telecommunication'"},"Communication Tower":{"where":"man_made='communications_tower' OR \"tower:type\"='communication'"},"Community Centre":{"where":"amenity='community_centre'"},"Dam":{"where":"waterway='dam'"},"Dentist":{"where":"amenity='dentist'"},"Doctor":{"where":"amenity='doctors'"},"Drainage":{"where":"waterway IN ('ditch','drain')"},"Education":{"where":"amenity IN ('kindergarten', 'school', 'college', 'university','language_school') OR office='educational_institution'"},"Electricial Tower":{"where":"power='tower'"},"Embassy":{"where":"amenity='embassy'"},"Emergency":{"where":"emergency OR amenity IN ('police','fire_station')"},"Ferry Terminal":{"where":"amenity='ferry_terminal' OR building='ferry_terminal'"},"Financial":{"where":"amenity IN ('atm','bank','bureau_de_change','microfinance','mobile_money_agent','money_transfer')"},"Fire Station":{"where":"amenity='fire_station'"},"Floodgate":{"where":"waterway='floodgate'"},"Footpath":{"where":"highway='footway'"},"Forest":{"where":"landuse='forest'"},"Gas Station":{"where":"amenity='fuel'"},"Government":{"where":"building='civic' OR office IN ('government','political_party','notary') OR government OR landuse='military' OR military OR amenity IN ('court_house','townhall','embassy','post_office')"},"Government Office":{"where":"building='civic' OR amenity IN ('court_house','townhall') OR office='government' OR government"},"Grassland":{"where":"natural='grassland'"},"Healthcare":{"where":"healthcare OR amenity IN ('doctors', 'dentist', 'clinic', 'toilets', 'hospital', 'pharmacy') OR shop IN ('herbalist','nutrition_supplements')"},"Historic":{"where":"historic"},"Hospital":{"where":"amenity='hospital'"},"Humanitarian":{"where":"social_facility or wheelchair OR  building='warehouse' OR industrial='warehouse'"},"Kindergarten":{"where":"amenity='kindergarten'"},"Land Use":{"where":"landuse OR leisure='park' OR amenity='grave_yard'"},"Landform":{"where":"natural IN ('peak','volcano','valley','ridge','cliff')"},"Library":{"where":"amenity='library'"},"Localities":{"where":"boundary OR place OR \"addr:postcode\" OR boundary='postal_code'"},"Military":{"where":"military or landuse='military'"},"Natural":{"where":"natural"},"Parking":{"where":"amenity='parking'"},"Parks":{"where":"leisure='park'"},"Pharmacy":{"where":"amenity='pharmacy'"},"Pitch":{"where":"leisure='pitch'"},"Place":{"where":"place IN ('country','state','region','province','district','county','municipality','city','borough','suburb','quarter','neighbourhood','town','village','hamlet','isolated_dwelling')"},"Places of Worship":{"where":"amenity='place_of_worship'"},"Police Station":{"where":"amenity='police'"},"Post Office":{"where":"amenity='post_office'"},"Postcode":{"where":"\"addr:postcode\" OR boundary='postal_code'"},"Power":{"where":"power OR backup_generator OR amenity='fuel'"},"Power Plant":{"where":"power='plant'"},"Public":{"where":"building='public' OR amenity IN ('place_of_worship','community_centre','library','toilets') OR historic"},"Pump House":{"where":"man_made='pumping_station' OR building='pumping_station'"},"Railway":{"where":"railway"},"Refugee Facility":{"where":"social_facility"},"Reservoir":{"where":"water='reservoir' OR natural='water' OR landuse='reservoir'"},"Residential":{"where":"landuse='residential'"},"Restaurant":{"where":"amenity IN ('restaurant','fast_food','cafe','bar','pub')"},"Road":{"where":"highway"},"School":{"where":"amenity='school'"},"Shop":{"where":"shop"},"Solid Waste":{"where":"landuse='landfill'"},"Sport":{"where":"sport OR leisure IN ('stadium, swimming pool, pitch, sport_centre')"},"Sport Centre":{"where":"leisure='sport_centre'"},"Stadium":{"where":"leisure='stadium'"},"Storage Warehouse":{"where":"building='warehouse' OR industrial='warehouse'"},"Substation":{"where":"power='substation'"},"Supermarket":{"where":"amenity='marketplace' OR shop='convenience' OR shop='supermarket'"},"Swimming Pool":{"where":"leisure='swimming_pool'"},"Toilet":{"where":"amenity='toilets'"},"Tourism":{"where":"tourism"},"Train Station":{"where":"building='train_station'"},"Transportation":{"where":"aeroway OR highway OR railway OR building IN ('aerodrome','ferry_terminal','train_station') OR amenity IN ('ferry_terminal','bus_station')"},"University":{"where":"amenity='university'"},"Water":{"where":"waterway OR water='reservoir' OR natural='water' OR landuse='reservoir' OR man_made IN ('water_tower','pumping_station') OR building='pumping_station' OR amenity = 'water_point'"},"Water Body":{"where":"natural='water'"},"Water Point":{"where":"amenity='water_point'"},"Water Tower":{"where":"man_made='water_tower'"},"Waterway":{"where":"waterway IN ('river', 'canal', 'stream')"},"Wetland":{"where":"natural='wetland'"},"Wheelchair Access":{"where":"wheelchair"}}

/**
 * Extracts the filter portion of an Overpass query generated by the overpass wizard
 * @param fullQuery
 */
function extractFilter (fullQuery) {
  let filter = false

  if (typeof fullQuery === 'string') {
    filter = fullQuery.substring(fullQuery.indexOf('('), fullQuery.indexOf(');') + 2)
  }

  return filter
}

function getOverpassQueryFilter (search) {
  let result = false
  // eslint-disable-next-line no-console
  let oldConsoleError = console.error
  // eslint-disable-next-line no-console
  console.error = () => {
  }
  try {
    result = extractFilter(wizard(search, {
      comment: false,
      freeFormPresets: presets,
      globalBbox: true,
      timeout: 900,
      aroundRadius: 0,
      compactNWR: true,
      outputMode: 'recursive'
    }))
    // eslint-disable-next-line no-unused-vars, no-empty
  } catch (e) {
  }
  // try with quotes
  if (!result) {
    try {
      result = extractFilter(wizard('"' + search + '"', {
        comment: false,
        freeFormPresets: presets,
        globalBbox: true,
        timeout: 900,
        aroundRadius: 0,
        compactNWR: true,
        outputMode: 'recursive'
      }))// eslint-disable-next-line no-unused-vars, no-empty
    } catch (e) {
    }
  }
  // eslint-disable-next-line no-console
  console.error = oldConsoleError
  return result
}

const defaultQuery = '(\n\tnwr;\n);'

const OVERPASS_SQ_MI_LIMIT = 25

function generateQueryFromFilter (filter, bbox, count = false, timeout = 900, out = 'json') {
  return '[out:' + out + '][timeout:' + timeout + ']' + (bbox != null ? '[bbox:' + [bbox[1], bbox[0], bbox[3], bbox[2]].join(',') + ']' : '') + ';\n' +
    filter +
    (count ? '\nout count;' : '\nout body;') +
    '>;\n' +
    (count ? '\nout count;' : '\nout skel qt;')
}

function convertWhereClauseToQuery (types = 'nwr', whereClause) {
  const wildcardTags = {}
  const specificValueTags = {}
  const uniqueParts = {}
  whereClause.split('OR').forEach(clause => uniqueParts[clause.trim()] = true)
  const parts = Object.keys(uniqueParts)
  let query = '(\n'
  // iterate over wildcard filters
  parts.forEach(part => {
    // tag exists
    if (part.indexOf(' IN ') === -1 && part.indexOf('=\'') === -1 && wildcardTags[part.trim()] == null) {
      query += '\t' + types + '["' + part.trim() + '"];\n'
      wildcardTags[part.trim()] = true
    }
  })

  // iterate over key-value filters
  parts.forEach(part => {
    // tag exists
    if (part.indexOf('=\'') !== -1) {
      const equalityParts = part.split('=')
      const equalityKey = equalityParts[0]
      if (wildcardTags[equalityKey] == null) {
        const equalityValue = equalityParts[1].replaceAll('\'', '')
        if (specificValueTags[equalityParts[0]] == null) {
          specificValueTags[equalityKey] = []
        }
        if (specificValueTags[equalityKey].indexOf(equalityValue) === -1) {
          query += '\t' + types + '["' + equalityKey + '"="' + equalityValue + '"];\n'
          specificValueTags[equalityKey].push(equalityValue)
        }
      }
    }
  })

  // iterate over IN filters
  parts.forEach(part => {
    // tag exists
    if (part.indexOf(' IN ') !== -1) {
      // equality
      const inStatementParts = part.split(' IN ')
      const key = inStatementParts[0].trim()
      if (wildcardTags[key] == null) {
        if (specificValueTags[key] == null) {
          specificValueTags[key] = []
        }
        const values = inStatementParts[1].substring(1, inStatementParts[1].length - 1).split(',').map(value => value.trim().replaceAll('\'', ''))
        values.forEach(value => {
          if (specificValueTags[key].indexOf(value) === -1) {
            query += '\t' + types + '["' + key + '"="' + value + '"];\n'
            specificValueTags[key].push(value)
          }
        })
      }
    }
  })
  query += ');'
  return query
}

function getOverpassQueryFilterFromTags (tags) {
  const uniqueWhereClauses = {}
  tags.forEach(tag => {
    const lookup = tagLookup[tag]
    uniqueWhereClauses[lookup.where] = true
  })
  return convertWhereClauseToQuery('nwr', Object.keys(uniqueWhereClauses).join(' OR '), false)
}

export {
  generateQueryFromFilter,
  getOverpassQueryFilterFromTags,
  getOverpassQueryFilter,
  defaultQuery,
  OVERPASS_SQ_MI_LIMIT,
  tagLookup,
}
