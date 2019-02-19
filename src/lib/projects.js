
import { ipcRenderer } from 'electron'
// import jetpack from 'fs-jetpack'
// import Project from '../store/modules/Project'
// import WindowState from './settings/WindowState'

// const app = remote.app

// let mapcacheProjects

// export const readProjects = () => {
//   if (mapcacheProjects) return mapcacheProjects
//   mapcacheProjects = {}
//   try {
//     let projectsConfiguration = userDataDir.read(mapcacheStoreFile, 'json')
//     console.log({projectsConfiguration})
//     for (var projectId in projectsConfiguration) {
//       mapcacheProjects[projectId] = new Project(projectsConfiguration[projectId])
//     }
//   } catch (err) {
//     console.log('err', err)
//   }
//   console.log({mapcacheProjects})
//   return mapcacheProjects
// }
//
// export const saveProject = project => {
//   let mapcacheProjects = readProjects()
//   mapcacheProjects[project.id] = project
//   console.log('going to save this:', mapcacheProjects)
//   userDataDir.write(mapcacheStoreFile, mapcacheProjects, { atomic: true })
// }
//
// export const getProject = id => {
//   return readProjects()[id]
// }
//
// export const deleteProject = project => {
//   delete mapcacheProjects[project.id]
//   userDataDir.write(mapcacheStoreFile, mapcacheProjects, { atomic: true })
// }
//
export const openProject = projectId => {
  ipcRenderer.send('open-project', projectId)
}

export const newProject = () => {
  let project = {
    id: createId(),
    name: 'New Project',
    layerCount: 0,
    layers: {}
  }
  // saveProject(project)
  // openProject(project.id)

  return project
}

function createId () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
