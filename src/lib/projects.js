
import { ipcRenderer, remote } from 'electron'
import jetpack from 'fs-jetpack'
import Project from './project/Project'
// import WindowState from './settings/WindowState'

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

export const deleteProject = project => {
  delete mapcacheProjects[project.id]
  userDataDir.write(mapcacheStoreFile, mapcacheProjects, { atomic: true })
}

export const openProject = projectId => {
  ipcRenderer.send('open-project', projectId)
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
