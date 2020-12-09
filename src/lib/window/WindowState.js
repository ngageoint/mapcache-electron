import Settings from 'electron-settings'

export default class WindowState {
  windowName
  window
  windowState
  constructor (windowName) {
    this.windowName = windowName
    this.setBounds()
  }

  setBounds () {
    if (Settings.has(`windowState.${this.windowName}`)) {
      this.windowState = Settings.get(`windowState.${this.windowName}`)
    } else {
      this.windowState = {
        x: undefined,
        y: undefined,
        width: 800,
        height: 625,
        minHeight: 625,
        minWidth: 700
      }
    }
  }

  saveState () {
    if (!this.windowState.isMaximized) {
      this.windowState = this.window.getBounds()
    }
    this.windowState.isMaximized = this.window.isMaximized()
    Settings.set(`windowState.${this.windowName}`, this.windowState)
  }

  track (win) {
    this.window = win
    let events = [
      'resize',
      'move',
      'close'
    ]
    events.forEach(event => {
      this.window.on(event, this.saveState.bind(this))
    })
  }

  retrieveState () {
    return this.windowState
  }
}
