# Setting Up a Development Environment

### Windows
* Install Visual Studio 19 w/ Desktop development with C++ workload
* Install Python 2.7
* Install Node 14.16.0
* Install Git for windows
* Install GTK+ (version 2.22.1, do NOT get version 3)
* Install libjpeg-turbo64
* Install Yarn
  * npm install yarn -g

### Mac
* Install Xcode 11.3 or greater
* Install homebrew
* Install python
* Install node-canvas dependencies
  * brew install pkg-config cairo pango libpng jpeg giflib librsvg
* Install Node Version Manager
  * curl o https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
* Install Node
  * nvm install 14.16.0
* Install Yarn
  * npm install yarn -g

### Linux - Ubuntu
* Install Git, Pip, Build tools, and Canvas dependencies 
  * sudo apt-get install pip git build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev build-essential g++
* Install Node Version Manager
  * curl o https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
* Install Node
  * nvm install 14.16.0
* Install Yarn
  * npm install yarn -g

# Building and Running MapCache Desktop
Once you have set up a development environment, these steps will let you build and run MapCache:
1. Update node's max old space size
   (mac/linux: `export NODE_OPTIONS=--max-old-space-size=8192`)
   (win: `set NODE_OPTIONS=-max-old-space-size=8192`)
2. Download the code:  
`git clone https://github.com/ngageoint/mapcache-electron.git && cd mapcache-electron`
3. Install dependencies:  
`yarn`
4. Run:  
`yarn electron:serve` (run locally in development mode)

# Cleaning MapCache Desktop
The MapCache Desktop build and runtime processes will generate several files. The following commands will help cleanup your environment.
* Remove previously built resources:  
`rm -rf dist_electron`
* To remove the MapCache Desktop development runtime application data:  
`rm -rf ~/Library/Application\ Support/Electron`
* To remove the MapCache Desktop production runtime application data:  
`rm -rf ~/Library/Application\ Support/MapCache`
* To remove all the client (javascript) dependencies installed by `npm run install` use:  
`rm -rf node_modules`

# Logging, Debugging, Building, and Testing

## Logging
The application uses https://www.npmjs.com/package/electron-log for logging.

Log files can be found in the user's data directory:
1. on Linux: {userData}/logs/mapcache.log
2. on macOS: {userData}/logs/mapcache.log
3. on Windows: {userData}\logs\mapcache.log

## Debugging
The application is broken up into a main node.js process, node worker_threads and electron browser window processes. 

The browser window processes can be debugged using the chrome developer tools. 
* Dev tools can be toggled via the file menu for a browser window.
* All dev tools windows can be shown by using the keyboard shortcut CommandOrControl+Shift+S.
* All dev tools windows can be hidden by using the keyboard shortcut CommandOrControl+Shift+H.

# Building MapCache
The following will help you create binaries for windows, linux, and macOS. Due to native libraries within the application, each build must occur on its specific platform.  

1. Build Windows
`yarn electron:build-win`
2. Build Linux
`npm run electron:build-linux`
3. Build Mac
`yarn electron:build-mac`
4. The newly created installers are located in the build folder:  
`cd dist_electron`

# Notarization
1. Build mac build
`yarn electron:build-mac`
2. Navigate to build folder
`cd dist_electron`
3. Ensure you have the Developer ID Application cert loaded into your keychain
4. Submit .dmg and .pkg for notarization
`xcrun altool --notarize-app -f MapCache-{version}.dmg --primary-bundle-id mil.nga.mapcache -u [apple developer id] --asc-provider [team id]`
`xcrun altool --notarize-app -f MapCache-{version}.pkg --primary-bundle-id mil.nga.mapcache -u [apple developer id] --asc-provider [team id]`
5. Check status of notarization (using requestUUID in previous command's response)
`xcrun altool --notarization-info [requestUUID] -u [apple developer id]`
6. Staple .dmg and .pkg once notarization completed (be on the lookout for an email)
`xcrun stapler staple “MapCache-{version}.dmg”`
`xcrun stapler staple “MapCache-{version}.pkg”`

# Vuex store migration
Prior to release, any modifications that need to be made to the vuex store to support new features/bug fixes should perform the following steps.
1. Add migration script to store > migration > migration.js
2. Increment store version in package.json > mapacache > store > version
3. Migration script can be tested by installing a previous version of the application, then install the version with your migration scrip and verify the app runs as expected.

# Limitations and Notes
It is worth noting that there are several libraries using native dependencies. The native depdencies are
1. better-sqlite3

## Testing
Any changes made in development should be tested in the production version of the application for all supported platforms.

### Contributions
If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull request contributions to this project will be released under the MIT license.

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work" (see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the non-government authors and must be released according to the terms of the original open source license.

# Releasing a New Version
1. Update package.json version
2. Add a changelog file for the version describing new features added and bugs fixed
3. Update WindowsLauncher.js to reference correct version tag
4. Commit changes
5. Tag version
6. Build windows, linux and mac installers
7. Notarize mac installers
8. Create release on github for the new version and upload all the installer files
