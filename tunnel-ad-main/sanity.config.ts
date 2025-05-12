import {defineConfig} from 'sanity'
import {deskTool} from 'sanity/desk'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemas'
import {resolveDocumentActions} from './plugins/resolveDocumentActions.js'

export default defineConfig({
  name: 'default',
  title: 'tunnel-ad-main',

  projectId: '21is7976',
  dataset: 'production',

  plugins: [
    deskTool({
      defaultDocumentNode: (S) => S.document(),
    }), 
    visionTool()
  ],

  document: {
    // Register the custom document actions resolver
    actions: resolveDocumentActions
  },

  schema: {
    types: schemaTypes,
  },
})
