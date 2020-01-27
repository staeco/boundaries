import censusImport from 'census-boundaries'
import canadaImport from 'canada-boundaries'
import fs from 'graceful-fs'
import path from 'path'
import async from 'async'
import request from 'superagent'
import camel from 'camelcase'
import through from 'through2'
import JSONStream from 'JSONStream'
import isoc from 'isoc'
import slugify from 'slugify'
import pump from 'pump'
import pumpify from 'pumpify'
import aof from './aof'
import { states as stateCodes, provinces as provinceCodes } from './codes'

const writePath = path.join(__dirname, '../files')
const customPath = path.join(__dirname, '../custom')
const aofPath = path.join(__dirname, '../tile38/appendonly.aof')
const logPath = path.join(__dirname, '../tile38/commands.log')
const countryUrl = 'https://unpkg.com/@geo-maps/countries-maritime-1m/map.geo.json'
const earth = {
  type: 'Polygon',
  coordinates: [
    [
      [-179.9999, -89.9999],
      [-179.9999, 90],
      [180, 90],
      [180, -89.9999],
      [-179.9999, -89.9999]
    ]
  ]
}

const getPolygon = (feature) => {
  if (feature.geometry) feature = feature.geometry
  const isPolygon = feature.type === 'Polygon'
  const coords = isPolygon ?
    [ feature.coordinates ]
    : feature.coordinates

  return {
    type: 'MultiPolygon',
    coordinates: coords
  }
}

const slugs = {}
const getSlug = (str, attempt = 0) => {
  const slug = slugify(attempt ? `${str} ${attempt}` : str, { lower: true }).replace(/[.()]/g, '')
  if (slugs[slug]) {
    ++attempt
    console.log('slug collision', slug)
    return getSlug(str, attempt)
  }
  slugs[slug] = true
  return slug
}

const getType = (type) => {
  if (type === 'STATE') return 'state'
  if (type === 'COUNTY') return 'county'
  if (type === 'PLACE') return 'city'
  if (type === 'ZCTA5') return 'zip'
  throw new Error(`Invalid type: ${type}`)
}

const canadaCityTypes = [ 'DPL', 'MDP', 'MDI', 'UNP', 'SE', 'OHM', 'UUC', 'LUD', 'NCM', 'LNC', 'CFA']
const getCanadaType = (type, doc) => {
  if (canadaCityTypes.includes(type)) return 'city'
  return
}

/*
const aofStream = pumpify.obj(
  aof(),
  fs.createWriteStream(aofPath)
)
*/
const logStream = fs.createWriteStream(logPath)
const writeAOF = (id, str) => {
  const cmd = [ 'set', 'boundaries', id, 'object', str ]
  // aofStream.write(cmd)
  logStream.write(`${cmd.join(' ')}\r\n`)
}

const loadCustom = (id, cb) => {
  const customName = path.join(customPath, `${id}.geojson`)
  fs.readFile(customName, (err, data) => {
    cb(null, data && JSON.parse(data))
  })
}
const write = (boundary, cb) => {
  if (!boundary.properties.id) throw new Error('Missing id on write')
  const fileName = path.join(writePath, `${boundary.properties.id}.geojson`)

  loadCustom(boundary.properties.id, (err, custom) => {
    fs.exists(fileName, (err, exists) => {
      if (custom) {
        // just write the aof
        writeAOF(custom.properties.id, JSON.stringify(custom))
        return cb()
      }
      if (exists) console.warn('Overwriting', fileName, boundary)
      const str = JSON.stringify(boundary)
      writeAOF(boundary.properties.id, str)
      fs.writeFile(fileName, str, cb)
    })
  })
}

const america = (cb) => {
  console.log('Fetching US census...')
  censusImport({
    objects: [
      'STATE', 'COUNTY',
      'PLACE', 'ZCTA5'
    ],
    onBoundary: (type, doc, donzo) => {
      const data = getPolygon(doc)
      const id = doc.properties.GEOID || doc.properties.GEOID10
      if (!id) return donzo()
      const typeCode = getType(type)
      const name = doc.properties.FULLNAME
        || doc.properties.NAME
        || doc.properties.ZCTA5CE10
        || id
      const state = typeCode === 'zip'
        ? '' // zips are stateless
        : stateCodes[doc.properties.STATEFP] || 'other'
      data.properties = {
        id: getSlug(`usa ${state} ${name} ${typeCode}`),
        type: typeCode,
        name,
        code: id
      }
      write(data, donzo)
    },
    onFinish: cb
  })
}

const canada = (cb) => {
  console.log('Fetching CA census...')
  canadaImport({
    onBoundary: (doc, donzo) => {
      const data = getPolygon(doc)
      const id = doc.properties.PCPUID
      if (!id) return donzo()

      const provinceCode = doc.properties.PRUID
      const provinceShort = provinceCodes[provinceCode]
      const name = doc.properties.PCNAME
      data.properties = {
        id: getSlug(`can ${provinceShort} ${name} city`),
        type: 'city',
        name,
        code: id
      }
      write(data, donzo)
    },
    onFinish: cb
  })
}

const countries = (cb) => {
  console.log('Fetching countries...')
  const writeCountry = (doc, enc, donzo) => {
    const data = getPolygon(doc.geometry)
    const id = doc.properties.A3
    const full = isoc.find((c) => c.alpha3 === id)
    data.properties = {
      id: getSlug(id),
      type: 'country',
      name: full.name.short,
      code: id
    }
    write(data, donzo)
  }
  pump(
    request.get(countryUrl)
      .type('json')
      .retry(1)
      .buffer(false)
    , JSONStream.parse('features.*')
    , through.obj(writeCountry)
  , cb)
}

const planets = (cb) => {
  console.log('Writing planets...')
  const poly = getPolygon(earth)
  poly.properties = {
    id: getSlug('earth'),
    type: 'planet',
    name: 'Earth',
    code: 'terra'
  }
  write(poly, cb)
}
const done = (err) => {
  if (err) return console.error(err)
  console.log('Done importing!')
  logStream.once('finish', () => process.exit(0))
  logStream.end()
}

async.series([ planets, countries, america, canada ], done)
