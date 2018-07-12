import fs from 'graceful-fs'
import { join, basename, extname } from 'path'

const dir = join(__dirname, 'files')
const getPath = (id) => join(dir, `${id}.geojson`)

const fin = (resolve, reject, cb) => (err, res) => {
  if (err) {
    reject(err)
    if (cb) cb(err)
    return
  }
  resolve(res)
  if (cb) cb(null, res)
}

export const read = (id, cb) => {
  return new Promise((resolve, reject) => {
    const done = fin(resolve, reject, cb)
    fs.readFile(getPath(id), (err, d) => {
      if (err) return done(err)
      done(null, JSON.parse(d))
    })
  })
}

export const list = (cb) =>
  new Promise((resolve, reject) => {
    const done = fin(resolve, reject, cb)
    fs.readdir(dir, (err, res) => {
      if (err) return done(err)
      const ids = res.map((f) => basename(f, extname(f)))
      done(null, ids)
    })
  })

export const readSync = (id) =>
  JSON.parse(fs.readFileSync(getPath(id)))

export const listSync = () =>
  fs.readdirSync(dir).map((f) => basename(f, extname(f)))
