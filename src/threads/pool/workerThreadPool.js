const { AsyncResource } = require('async_hooks')
const { EventEmitter } = require('events')
const path = require('path')
const { Worker } = require('worker_threads')
const kTaskInfo = Symbol('kTaskInfo')
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent')
const kClosed = Symbol('kClosed')

class WorkerPoolTaskInfo extends AsyncResource {
  constructor (task, callback) {
    super('WorkerPoolTaskInfo')
    this.task = task
    this.callback = callback
    this.cancelled = false
    this.workersClosed = 0
    this.closing = false
  }

  getTaskId () {
    return this.task.id
  }

  setWorker (worker) {
    this.worker = worker
  }

  setCancelled () {
    this.cancelled = true
  }

  done (err, result) {
    if (this.cancelled) {
      err = 'Cancelled.'
      result = null
    }
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
        worker[kTaskInfo] = null
      }
      this.freeWorkers.push(worker)
      this.emit(kWorkerFreedEvent)
    })
    worker.once('error', (err) => {
      if (worker[kTaskInfo]) {
        worker[kTaskInfo].done(err, null)
      }
      this.workers.splice(this.workers.indexOf(worker), 1)
      this.addNewWorker()
    })
    worker.once('exit', () => {
      // if (this.closing) {
      //   this.workersClosed++
      //   this.workers.splice(this.workers.indexOf(worker), 1)
      //   worker.unref()
      //   if (this.workers.length === 0) {
      //     this.emit(kClosed)
      //   }
      // } else {
      //   this.workers.splice(this.workers.indexOf(worker), 1)
      //   this.addNewWorker()
      // }
      this.workers.splice(this.workers.indexOf(worker), 1)
      this.addNewWorker()
    })
    this.workers.push(worker)
    this.freeWorkers.push(worker)
    this.emit(kWorkerFreedEvent)
  }

  hasTasks () {
    return this.queue.length > 0 || this.workers.length !== this.freeWorkers.length
  }

  addTask (task, callback) {
    this.queue.push(new WorkerPoolTaskInfo(task, callback))
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
        worker[kTaskInfo].setCancelled()
        worker[kTaskInfo].done(null, null)
        worker[kTaskInfo] = null
        // worker.postMessage({shutdown: true})
        worker.terminate()
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
    // this.closing = true
    // return new Promise (resolve => {
    //   this.queue = []
    //   this.on(kClosed, resolve)
    //   for (const worker of this.workers) {
    //     worker.postMessage({shutdown: true})
    //   }
    // })
    this.queue = []
    // this.on(kClosed, resolve)
    for (const worker of this.workers) {
      await worker.terminate()
    }
  }
}

module.exports = WorkerThreadPool
