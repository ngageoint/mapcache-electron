import throttle from 'lodash/throttle'
import { PROCESSING_STATES } from '../../source/SourceProcessing'
import { PROCESS_SOURCE_STATUS } from '../../../electron/lib/ipc/MapCacheIPC'
import { AsyncResource } from 'node:async_hooks'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
const kTaskInfo = Symbol('kTaskInfo')
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent')
import { CANCEL } from '../mapcacheThreadRequestTypes'


class WorkerPoolTaskInfo extends AsyncResource {
  constructor (task, sender, callback = () => {
  }, cancelCallback = () => {
  }) {
    super('WorkerPoolTaskInfo')
    this.task = task
    this.sender = sender
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

  emitQueued () {
    if (this.sender) {
      this.sender.send(PROCESS_SOURCE_STATUS(this.getTaskId()), { type: PROCESSING_STATES.QUEUED, message: 'Queued' })
    }
  }

  emitProcessing () {
    if (this.sender) {
      this.sender.send(PROCESS_SOURCE_STATUS(this.getTaskId()), {
        type: PROCESSING_STATES.PROCESSING,
        message: 'Processing'
      })
    }
  }

  emitCancelling () {
    if (this.sender) {
      this.sender.send(PROCESS_SOURCE_STATUS(this.getTaskId()), {
        type: PROCESSING_STATES.CANCELLED,
        message: 'Cancelled'
      })
    }
  }

  emitStatus (status, message, completionPercentage) {
    if (this.sender) {
      this.sender.send(PROCESS_SOURCE_STATUS(this.getTaskId()), { type: status, message, completionPercentage })
    }
  }
}

export default class WorkerThreadPool extends EventEmitter {
  constructor (config, workerPath) {
    super()
    this.config = config
    this.workerPath = workerPath
    this.workers = []
    this.freeWorkers = []
    this.queue = []
    this.restartWorker = true
    this.throttleRun = throttle(this.run, 50)
  }

  async initialize () {
    this.on(kWorkerFreedEvent, this.throttleRun)
    for (let i = 0; i < this.config.length; i++) {
      await this.addNewWorker(this.config[i])
    }
  }

  async addNewWorker (config) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(path.resolve(this.workerPath), {
          stderr: true,
          stdout: true
        })
        worker.config = config
        worker.stdout.on('data', chunk => {
          // eslint-disable-next-line no-console
          console.log(chunk.toString())
        })
        worker.stderr.on('data', chunk => {
          // eslint-disable-next-line no-console
          console.error(chunk.toString())
        })
        worker.once('error', (err) => {
          worker.removeAllListeners('error')
          worker.removeAllListeners('message')
          reject(err)
        })
        // wait for ready message
        worker.once('message', ({ error }) => {
          worker.removeAllListeners('error')
          worker.removeAllListeners('message')
          if (error != null) {
            reject(error)
          } else {
            worker.on('message', ({ type, message, completionPercentage, error, result }) => {
              if (type === 'status') {
                worker[kTaskInfo].emitStatus(PROCESSING_STATES.PROCESSING, message, completionPercentage)
              } else {
                if (worker[kTaskInfo]) {
                  worker[kTaskInfo].done(error, result)
                  delete worker[kTaskInfo]
                }
                this.freeWorkers.push(worker)
                this.emit(kWorkerFreedEvent)
              }
            })
            worker.on('error', (err) => {
              if (worker[kTaskInfo]) {
                worker[kTaskInfo].done(err, null)
                delete worker[kTaskInfo]
              }
              this.freeWorkers.push(worker)
              this.emit(kWorkerFreedEvent)
            })
            worker.on('exit', () => {
              if (this.restartWorker) {
                if (this.workers.indexOf(worker) !== -1) {
                  this.workers.splice(this.workers.indexOf(worker), 1)
                }
                if (this.freeWorkers.indexOf(worker) !== -1) {
                  this.freeWorkers.splice(this.freeWorkers.indexOf(worker), 1)
                }
                this.addNewWorker(worker.config)
              }
            })
            this.workers.push(worker)
            this.freeWorkers.push(worker)
            this.emit(kWorkerFreedEvent)
            resolve()
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  hasTasks () {
    return this.queue.length > 0 || this.workers.length !== this.freeWorkers.length
  }

  addTask (task, sender, callback, cancelCallback) {
    const taskInfo = new WorkerPoolTaskInfo(task, sender, callback, cancelCallback)
    taskInfo.emitQueued()
    this.queue.push(taskInfo)
    // if the queue's length is more than one, we can assume there is a wait, so we can just wait for the next available worker
    this.throttleRun()
  }

  run () {
    if (this.freeWorkers.length === 0 || this.queue.length === 0) {
      return
    }
    for (let i = 0; i < this.queue.length && this.freeWorkers.length > 0; i++) {
      const worker = this.freeWorkers.find(worker => worker.config.types.indexOf(this.queue[i].task.type) !== -1)
      if (worker) {
        this.freeWorkers.splice(this.freeWorkers.indexOf(worker), 1)
        const taskInfo = this.queue.splice(i, 1)[0]
        worker[kTaskInfo] = taskInfo
        taskInfo.setWorker(worker)
        taskInfo.emitProcessing()
        worker.postMessage(taskInfo.task)
        i--
      }
    }
  }

  async cancelTask (taskId, forceRestart = true) {
    let cancelled = this.cancelPendingTask(taskId)
    if (!cancelled) {
      const worker = this.workers.find(worker => worker[kTaskInfo] != null && worker[kTaskInfo].task != null && worker[kTaskInfo].task.id === taskId)
      if (worker) {
        worker[kTaskInfo].emitCancelling()
        if (forceRestart) {
          this.workers.splice(this.workers.indexOf(worker), 1)
          await worker.terminate()
        } else {
          worker.postMessage({ type: CANCEL })
        }
        worker[kTaskInfo].setCancelled()
        worker[kTaskInfo].done('Cancelled.', null)
        worker[kTaskInfo] = null
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
      const task = this.queue.splice(taskInfoIndex, 1)[0]
      task.done('Cancelled.')
      cancelled = true
    }
    return cancelled
  }

  async close () {
    this.queue = []
    this.restartWorker = false
    for (const worker of this.workers) {
      await worker.terminate()
    }
  }
}
