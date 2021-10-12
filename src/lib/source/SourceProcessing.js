const PROCESSING_STATES = {
  PREPROCESSING: 0,
  QUEUED: 1,
  PROCESSING: 2,
  CANCELLING: 3,
  CANCELLED: 4,
  COMPLETED: 5
}

function getTitleForProcessingState (state) {
  let title = ''
  switch (state) {
    case PROCESSING_STATES.PREPROCESSING:
      title = 'Preprocessing'
      break
    case PROCESSING_STATES.QUEUED:
      title = 'Queued'
      break
    case PROCESSING_STATES.PROCESSING:
      title = 'Processing'
      break
    case PROCESSING_STATES.CANCELLING:
      title = 'Cancelling'
      break
    case PROCESSING_STATES.CANCELLED:
      title = 'Cancelled'
      break
    case PROCESSING_STATES.COMPLETED:
      title = 'Completed'
      break
    default:
      title = 'Unknown'
      break
  }

  return title
}

export {
  PROCESSING_STATES,
  getTitleForProcessingState
}
