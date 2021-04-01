import configure from '@jimp/custom'
import types from '@jimp/types'
import rotate from '@jimp/plugin-rotate'

const jimp = configure({
  types: [types],
  plugins: [rotate]
})

export default jimp
