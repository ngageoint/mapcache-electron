# Setting Up a Development Environment
These instructions were written for development on mac.

You need a basic understanding of the following tools that you should install via package manager (brew, apt, etc.):  
* git 2.25.0
* npm 6.14.4
* yarn 0.21.3
* node 12.16.3
* Xcode 11.3 or greater

# Building and Running MapCache Desktop
Once you have set up a development environment, these steps will let you build and run MapCache:
1. Download the code:  
`git clone https://github.com/ngageoint/mapcache-electron.git && cd mapcache-electron`
2. Install dependencies:  
`yarm`
3. Run:  
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

Log files can be found:
1. on Linux: ~/.config/MapCache/logs/{process type}.log
2. on macOS: ~/Library/Logs/MapCache/{process type}.log
3. on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log

where `process type` can be one of `(renderer, main)`

## Debugging
The application is broken up into a main process and renderer processes inside of electron. 

The renderer processes can be debugged using the chrome developer tools.

# Building MapCache
The following will help you create binaries for windows, linux, and macOS. Due to native libraries within the application, each build must occur on its specific platform.  

1. Build Windows
`yarn electron:build-win`
2. Build Linux
`yarn electron:build-linux`
3. Build Mac
`yarn electron:build-mac`
4. Build All
`yarn electron:build`
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

# Limitations and Notes
It is worth noting that there are several libraries using native dependencies. The native depdencies are
1. better-sqlite3
2. canvas

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
