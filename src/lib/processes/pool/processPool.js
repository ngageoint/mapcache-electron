const { AsyncResource } = require('async_hooks')
const fork = require('child_process').fork
const { EventEmitter } = require('events')
const path = require('path')
const kTaskInfo = Symbol('kTaskInfo')
const kProcessFreedEvent = Symbol('kProcessFreedEvent')

const parameters = []
const options = {
  stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
}

class ProcessPoolTaskInfo extends AsyncResource {
  constructor (task, callback = () => {}, cancelCallback = () => {}) {
    super('ProcessPoolTaskInfo')
    this.task = task
    this.callback = callback
    this.cancelled = false
    this.cancelCallback = cancelCallback
  }

  getTaskId () {
    return this.task.id
  }

  setProcess (process) {
    this.process = process
  }

  setCancelled () {
    this.cancelled = true
    this.cancelCallback()
  }

  done (err, result) {
    this.runInAsyncScope(this.callback, null, err, result)
    this.emitDestroy()
  }
}

class ProcessThreadPool extends EventEmitter {
  constructor(numThreads, processPath) {
    super()
    this.processPath = processPath
    this.processes = []
    this.freeProcesses = []
    this.queue = []

    this.on(kProcessFreedEvent, () => this.run())

    for (let i = 0; i < numThreads; i++) {
      this.addNewWorker()
    }
  }
  addNewWorker () {
    const process = fork(path.resolve(this.processPath), parameters, options)
    process.on('message', (result) => {
      if (process[kTaskInfo]) {
        process[kTaskInfo].done(null, result)
        process[kTaskInfo] = null
      }
      this.freeProcesses.push(process)
      this.emit(kProcessFreedEvent)
    })
    process.stdout.setEncoding('utf8')
    process.stdout.on('data', (data) => {
      console.log(data)
    })
    process.stderr.setEncoding('utf8')
    process.stderr.on('data', (data) => {
      console.error(data);
    })
    process.on('error', (err) => {
      if (process[kTaskInfo]) {
        process[kTaskInfo].done(err, null)
      }
    })
    this.processes.push(process)
    this.freeProcesses.push(process)
    this.emit(kProcessFreedEvent)
  }

  hasTasks () {
    return this.queue.length > 0 || this.processes.length !== this.freeProcesses.length
  }

  addTask (task, callback, cancelled) {
    this.queue.push(new ProcessPoolTaskInfo(task, callback, cancelled))
    this.run()
  }

  run () {
    if (this.freeProcesses.length === 0 || this.queue.length === 0) {
      return
    }

    const process = this.freeProcesses.pop()
    const taskInfo = this.queue.shift()
    process[kTaskInfo] = taskInfo
    taskInfo.setProcess(process)
    process.send(taskInfo.task)
  }

  async cancelTask (taskId) {
    let cancelled = this.cancelPendingTask(taskId)
    if (!cancelled) {
      const process = this.processes.find(process => process[kTaskInfo] && process[kTaskInfo].getTaskId() === taskId)
      if (process) {
        this.processes.splice(this.processes.indexOf(process), 1)
        process[kTaskInfo].setCancelled()
        process.kill('SIGKILL')
        process[kTaskInfo].done('Cancelled.', null)
        process[kTaskInfo] = null
        this.addNewWorker()
        cancelled = true
      }
    }
    return cancelled
  }

  cancelPendingTask (taskId) {
    let cancelled = false
    // remove from the queue
    const taskInfoIndex = this.queue.findIndex(taskInfo => taskInfo.getTaskId() === taskId)
    if (taskInfoIndex !== -1) {
      const task = this.queue[taskInfoIndex]
      this.queue = this.queue.splice(taskInfoIndex, 1)
      task.done('Cancelled.')
      cancelled = true
    }
    return cancelled
  }

  async close () {
    this.queue = []
    for (const process of this.processes) {
      process.kill('SIGKILL')
    }
  }
}

module.exports = ProcessThreadPool
