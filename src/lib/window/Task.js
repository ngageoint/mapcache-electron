export default class Task {
  // task id
  id
  // event associated with task
  event
  // should perform function of task
  fn
  // should handle result
  cb
  // should unregister any listeners
  cancel
  // should deal with errors
  error
  constructor (id, event, fn, cb, cancel, error = (e) => {
    // eslint-disable-next-line no-console
    console.error(e)
  }) {
    this.id = id
    this.event = event
    this.fn = fn
    this.cb = cb
    this.cancel = cancel
    this.error = error
  }
}
