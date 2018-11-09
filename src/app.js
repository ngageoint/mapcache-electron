import 'xel/xel.min.js';

// Small helpers you might want to keep
import "./helpers/context_menu.js";
import "./helpers/external_links.js";
import "./stylesheets/main.css";

import { remote } from "electron";
import jetpack from "fs-jetpack";

import * as GeoPackageUtilities from './geopackage';
import * as Projects from './projects';

import * as Mustache from 'mustache';

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

const manifest = appDir.read("package.json", "json");
document.querySelector("#mapcache-version").innerHTML = manifest.version;

const userDataDir = jetpack.cwd(app.getPath('userData'));
const mapcacheStoreFile = 'mapcache-projects.json';

let mapcacheProjects = Projects.readProjects();

let projectArray = [];
for (var project in mapcacheProjects) {
  projectArray.push(mapcacheProjects[project]);
}

let projectHtml = require('./views/projectList.mustache').render({projects:projectArray}, {
  projectThumb: require('./views/projectThumb.mustache')
});

document.querySelector('#projects').innerHTML = projectHtml;

function openProject(projectId) {
  Projects.openProject(projectId);
}
window.openProject = openProject;

document.querySelector('#new-project-button').addEventListener('click', Projects.newProject);
