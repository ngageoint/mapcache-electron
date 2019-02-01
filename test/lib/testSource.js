import sinon from 'sinon'
import jetpack from 'fs-jetpack'
import * as Settings from '../../src/lib/settings/Settings'
import Source from '../../src/lib/source/Source'

describe('Source Tests', function () {
  let sandbox

  before(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Settings, 'userDataDir').returns(jetpack.dir('/tmp'))
  })

  after(() => {
    sandbox.restore()
  })

  it('should construct a new Source', async () => {
    let source = new Source('/path/to/file', 'id')
    source.filePath.should.be.equal('/path/to/file')
    source.sourceId.should.be.equal('id')
    source.sourceCacheFolder.path().should.be.equal('/tmp/id')

    try {
      let layer = source.mapLayer
      true.should.be.equal(false, 'accessing mapLayer property on a source should throw an error')
    } catch (e) {}
    try {
      await source.initialize()
      true.should.be.equal(false, 'initializing an abstract source should throw an error')
    } catch (e) {}
  })

  it('should construct a new Source and create an id', async () => {
    let source = new Source('/path/to/file')
    source.filePath.should.be.equal('/path/to/file')
    source.sourceId.should.exist
    source.sourceCacheFolder.path().should.be.equal('/tmp/'+source.sourceId)
    try {
      let layer = source.mapLayer
      true.should.be.equal(false, 'accessing mapLayer property on a source should throw an error')
    } catch (e) {}
    try {
      await source.initialize()
      true.should.be.equal(false, 'initializing an abstract source should throw an error')
    } catch (e) {}
  })
})
