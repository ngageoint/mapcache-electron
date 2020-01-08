import { remote, app } from 'electron'
import jetpack from 'fs-jetpack'

export const userDataDir = () => {
  return jetpack.cwd((remote ? remote.app : app).getPath('userData'))
}
