import { remote } from 'electron'
import jetpack from 'fs-jetpack'

export const userDataDir = () => {
  const app = remote.app
  return jetpack.cwd(app.getPath('userData'))
}
