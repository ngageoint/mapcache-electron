import sinon from 'sinon'
import jetpack from 'fs-jetpack'
import 'chai/register-should'
import * as Settings from '../../src/lib/settings/Settings'

import Layer from '../../src/lib/source/layer/Layer'

describe('Layer Tests', function () {
  let sandbox

  before(() => {
    sandbox = sinon.createSandbox()
    sandbox.stub(Settings, 'userDataDir').returns(jetpack.cwd('/tmp'))
  })

  after(() => {
    sandbox.restore()
  })

  it('should construct a new Layer', async () => {
    let layer = new Layer({
      configThing1: true,
      filePath: '/path/to/file',
      sourceLayerName: 'layer name'
    })
    layer.sourceLayerName.should.be.equal('layer name')
    layer.filePath.should.be.equal('/path/to/file')
    layer.configuration.id.should.exist
    layer.configuration.should.include({
      name: 'layer name',
      sourceLayerName: 'layer name',
      filePath: '/path/to/file'
    })
    try {
      await layer.initialize()
      true.should.be.equal(false, 'initializing the abstract Layer should throw an error')
    } catch (e) {}
  })

  it('should construct a new Layer with a config', async () => {
    let layer = new Layer({
      configThing1: true,
      filePath: '/path/to/file',
      sourceLayerName: 'layer name'
    })
    layer.sourceLayerName.should.be.equal('layer name')
    layer.filePath.should.be.equal('/path/to/file')
    layer.configuration.should.exist
    layer.configuration.should.include({
      name: 'layer name',
      sourceLayerName: 'layer name',
      filePath: '/path/to/file',
      configThing1: true
    })
    layer.configuration.configThing1.should.be.equal(true)
  })
})
