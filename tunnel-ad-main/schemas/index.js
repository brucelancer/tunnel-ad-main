import { authSchemas } from './auth'
import video from './video'
import post from './post'
import message from './message'
import conversation from './conversation'
import report from './report'

export const schemaTypes = [
  ...authSchemas,
  video,
  post,
  message,
  conversation,
  report
  // Add other schemas here
] 