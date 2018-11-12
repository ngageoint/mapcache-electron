
import { remote } from 'electron'
import jetpack from 'fs-jetpack'

const app = remote.app

const userDataDir = jetpack.cwd(app.getPath('userData'))
const mapcacheStoreFile = 'mapcache-projects.json'

export const readProjects = () => {
  let mapcacheProjects = {}

  try {
    mapcacheProjects = userDataDir.read(mapcacheStoreFile, 'json')
  } catch (err) {
    console.log('err', err)
  }

  return Object.assign({}, mapcacheProjects)
}

export const saveProject = project => {
  let mapcacheProjects = readProjects()
  mapcacheProjects[project.id] = project
  userDataDir.write(mapcacheStoreFile, mapcacheProjects, { atomic: true })
}

export const getProjectConfiguration = id => {
  return readProjects()[id]
}

export const openProject = projectId => {
  let projectWindow
  const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080/#/project`
    : `file://${__dirname}/index.html#project`

  // function createWindow () {
    /**
     * Initial window options
     */
  projectWindow = new remote.BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  var url = new URL(winURL)
  url.searchParams.append('id', projectId)

  projectWindow.loadURL(url.href)

  projectWindow.on('closed', () => {
    projectWindow = null
  })
}

export const newProject = () => {
  const projectId = getId()

  let project = {
    name: 'New Project',
    id: projectId
  }
  saveProject(project)
  openProject(projectId)

  return project
}

export const getId = () => {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
