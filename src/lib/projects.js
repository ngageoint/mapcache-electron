
import { remote } from 'electron'
import jetpack from 'fs-jetpack'
import Project from './project/Project'

const app = remote.app

const userDataDir = jetpack.cwd(app.getPath('userData'))
const mapcacheStoreFile = 'mapcache-projects.json'
console.log('userDataDir', app.getPath('userData'))

let mapcacheProjects

export const readProjects = () => {
  if (mapcacheProjects) return mapcacheProjects
  mapcacheProjects = {}
  try {
    let projectsConfiguration = userDataDir.read(mapcacheStoreFile, 'json')
    console.log({projectsConfiguration})
    for (var projectId in projectsConfiguration) {
      mapcacheProjects[projectId] = new Project(projectsConfiguration[projectId])
    }
  } catch (err) {
    console.log('err', err)
  }
  console.log({mapcacheProjects})
  return mapcacheProjects
}

export const saveProject = project => {
  let mapcacheProjects = readProjects()
  mapcacheProjects[project.id] = project
  console.log({mapcacheProjects})
  userDataDir.write(mapcacheStoreFile, mapcacheProjects, { atomic: true })
}

export const getProject = id => {
  return readProjects()[id]
}

export const openProject = projectId => {
  let projectWindow
  const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080/#/project`
    : `file://${__dirname}/index.html#project`

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
  let project = new Project({
    name: 'New Project',
    layerCount: 0,
    sources: {}
  })
  saveProject(project)
  openProject(project.id)

  return project
}
