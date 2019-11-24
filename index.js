const sqlite = require('sqlite')
const SQL = require('sql-template-strings')
const zlib = require('zlib')

function readLengthField(buffer) {
  let length = 0
  let skip = 0
  try {
    let dataLength = buffer[0]
    length = dataLength & 0x7F
    while (dataLength > 0x7F) {
      skip += 1
      dataLength = buffer[skip]
      length = ((dataLength & 0x7f) << (skip * 7)) + length
    }
  } catch(e) {
    console.log(e)
  }
  skip += 1
  return [length, skip]
}

function processNoteBodyBlob(blob) {
  let data = ''
  if (!blob) return data
  try {
    let pos = 0
    const header1 = blob.slice(0,3).toString('hex') !== '080012'
    if (header1) return data
    pos += 3
    let [length, skip] = readLengthField(blob.slice(pos))
    pos += skip

    if (blob.slice(pos, pos+3).toString('hex') !== '080010') return data
    pos += 3
    ;[length, skip] = readLengthField(blob.slice(pos))
    pos += skip

    if (blob[pos] !== 0x1A) return data
    pos += 1
    ;[length, skip] = readLengthField(blob.slice(pos))
    pos += skip

    if (blob[pos] !== 0x12) return data
    pos += 1
    ;[length, skip] = readLengthField(blob.slice(pos))
    pos += skip

    data = blob.slice(pos, pos+length).toString()
  } catch(e) {
    console.log(e)
  }
  return data
}

let db
sqlite.open('./NoteStore.sqlite').then(result => {
  db = result
  const data = db.all(SQL`SELECT ZDATA from ZICNOTEDATA`).then(result => {
    result.forEach((item, index) => {
      zlib.gunzip(item.ZDATA, (err, buffer) => {
        console.log(processNoteBodyBlob(buffer))
      })
    })
  })
})
