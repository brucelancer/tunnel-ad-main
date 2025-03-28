import { authSchemas } from './auth'
import video from './video'
import post from './post'
import message from './message'
import conversation from './conversation'

export const schemaTypes = [
  ...authSchemas,
  video,
  post,
  message,
  conversation
  // Add other schemas here
] 