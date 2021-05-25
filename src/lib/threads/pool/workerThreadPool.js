const { AsyncResource } = require('async_hooks')
const { EventEmitter } = require('events')
const path = require('path')
const { Worker } = require('worker_threads')
const kTaskInfo = Symbol('kTaskInfo')
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent')

class WorkerPoolTaskInfo extends AsyncResource {
  constructor (task, callback = () => {}, cancelCallback = () => {}) {
    super('WorkerPoolTaskInfo')
    this.task = task
    this.callback = callback
    this.cancelled = false
    this.cancelCallback = cancelCallback
  }

  getTaskId () {
    return this.task.id
  }

  setWorker (worker) {
    this.worker = worker
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

class WorkerThreadPool extends EventEmitter {
  constructor(numThreads, workerPath) {
    super()
    this.workerPath = workerPath
    this.workers = []
    this.freeWorkers = []
    this.queue = []

    this.on(kWorkerFreedEvent, () => this.run())

    for (let i = 0; i < numThreads; i++) {
      this.addNewWorker()
    }
  }

  addNewWorker () {
    const worker = new Worker(path.resolve(this.workerPath))
    worker.on('message', (result) => {
      if (worker[kTaskInfo]) {
        worker[kTaskInfo].done(null, result)
        delete worker[kTaskInfo]
      }
      this.freeWorkers.push(worker)
      this.emit(kWorkerFreedEvent)
      if (result != null && result.ready === false) {
        console.error(result.error)
      }
    })
    worker.on('error', (err) => {
      if (worker[kTaskInfo]) {
        worker[kTaskInfo].done(err, null)
        delete worker[kTaskInfo]
      }
    })
    this.workers.push(worker)
  }

  hasTasks () {
    return this.queue.length > 0 || this.workers.length !== this.freeWorkers.length
  }

  addTask (task, callback, cancelled) {
    this.queue.push(new WorkerPoolTaskInfo(task, callback, cancelled))
    this.run()
  }

  run () {
    if (this.freeWorkers.length === 0 || this.queue.length === 0) {
      return
    }

    const worker = this.freeWorkers.pop()
    const taskInfo = this.queue.shift()
    worker[kTaskInfo] = taskInfo
    taskInfo.setWorker(worker)
    worker.postMessage(taskInfo.task)
  }

  async cancelTask (taskId) {
    let cancelled = this.cancelPendingTask(taskId)
    if (!cancelled) {
      const worker = this.workers.find(worker => worker[kTaskInfo] && worker[kTaskInfo].getTaskId() === taskId)
      if (worker) {
        this.workers.splice(this.workers.indexOf(worker), 1)
        worker[kTaskInfo].setCancelled()
        await worker.terminate()
        worker[kTaskInfo].done('Cancelled.', null)
        worker[kTaskInfo] = null
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
    for (const worker of this.workers) {
      await worker.terminate()
    }
  }
}

module.exports = WorkerThreadPool
