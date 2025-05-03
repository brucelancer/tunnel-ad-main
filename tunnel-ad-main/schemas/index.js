import { authSchemas } from './auth'
import video from './video'
import post from './post'
import message from './message'
import conversation from './conversation'
import report from './report'
import pointsAwarded from './pointsAwarded'
import pointTransaction from './pointTransaction'
import pointsEntry from './pointsEntry'

export const schemaTypes = [
  ...authSchemas,
  video,
  post,
  message,
  conversation,
  report,
  pointsAwarded,
  pointTransaction,
  pointsEntry
  // Add other schemas here
] 