import { authSchemas } from './auth'
import video from './video'
import post from './post'
import message from './message'
import conversation from './conversation'
import report from './report'
import pointsAwarded from './pointsAwarded'

export const schemaTypes = [
  ...authSchemas,
  video,
  post,
  message,
  conversation,
  report,
  pointsAwarded
  // Add other schemas here
] 