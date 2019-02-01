import sinon from 'sinon'
import * as electron from 'electron'
import * as Settings from '../../src/lib/settings/Settings'

describe.skip('Settings Tests', function () {
  let sandbox
  let originalRemote

  before(() => {
    sandbox = sinon.createSandbox()

    // originalRemote = electron.remote
    // electron.remote = {
    //   app: {
    //     getPath: function() {
    //       return '/tmp'
    //     }
    //   }
    // }
    // sinon.stub(electron, 'remote').returns({
    //   remote: {
    //     app: {
    //       getPath: function() {
    //         return '/tmp'
    //       }
    //     }
    //   }
    // })
    // sinon.stub(remote, 'app').get(function getterFn() {
    //   return {
    //     getPath: function() {
    //       return '/tmp'
    //     }
    //   };
    // });
  })

  after(() => {
    // electron.remote = originalRemote
    sandbox.restore()
  })

  it('should return the user data dir', () => {
    let userDataDir = Settings.userDataDir()
    console.log('userDataDir')
  })
})
