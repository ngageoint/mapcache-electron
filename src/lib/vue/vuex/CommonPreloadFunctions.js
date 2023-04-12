import { rmDirAsync } from '../../util/file/FileUtilities'

async function deleteProjectFolder (filePath) {
  return rmDirAsync(filePath).then((err) => {
    return !err;
  })
}

export {
  deleteProjectFolder
}