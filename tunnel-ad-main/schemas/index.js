import { authSchemas } from './auth'
import video from './video'
import post from './post'

export const schemaTypes = [
  ...authSchemas,
  video,
  post
  // Add other schemas here
] 