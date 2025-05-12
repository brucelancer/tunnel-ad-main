import {useState} from 'react'
import {useClient} from 'sanity'
import {DocumentActionDescription, DocumentActionsContext} from 'sanity'
import {TrashIcon} from '@sanity/icons'

// Interface for our document
interface PostDocument {
  _id: string
  _type: string
  points: number
}

// Type for document actions
interface ActionWithName extends DocumentActionDescription {
  name?: string
}

// Custom Delete action that handles references before deleting a post
export const SafeDeleteAction = (props: {
  id: string
  type: string
  draft?: PostDocument
  published?: PostDocument
  onComplete: () => void
}) => {
  const {id, type, draft, published, onComplete} = props
  const [isDeleting, setIsDeleting] = useState(false)
  const client = useClient()
  
  // Only apply this to post documents
  if (type !== 'post') {
    return null
  }
  
  // Function to handle clean deletion with reference handling
  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const documentId = published?._id || draft?._id
      
      if (!documentId) {
        console.error('No document ID found')
        setIsDeleting(false)
        return
      }
      
      // Find references to this document
      const references = await client.fetch(
        `*[references($docId)]{ _id, _type }`,
        { docId: documentId }
      )
      
      console.log(`Found ${references.length} references to document ${id}`)
      
      // Handle each reference before deleting the post
      if (references.length > 0) {
        for (const ref of references) {
          if (ref._type === 'pointTransaction') {
            console.log(`Deleting pointTransaction ${ref._id} that references post ${id}`)
            await client.delete(ref._id)
          }
        }
      }
      
      // Reset points to zero to bypass constraints
      await client
        .patch(documentId)
        .set({points: 0})
        .commit()
      
      // Now delete the document
      await client.delete(documentId)
      
      // Call the onComplete callback
      onComplete()
    } catch (error) {
      console.error('Error in safe delete:', error)
      setIsDeleting(false)
    }
  }
  
  return {
    icon: TrashIcon,
    label: isDeleting ? 'Deleting...' : 'Safe Delete',
    tone: 'critical' as const,
    disabled: isDeleting,
    title: 'Safely delete post and its references',
    onHandle: handleDelete
  }
}

// This function takes the default actions and returns an array of actions
export const resolveDocumentActions = (
  prev: ActionWithName[], 
  context: DocumentActionsContext
) => {
  const {schemaType} = context
  
  // Only modify actions for the post document type
  if (schemaType !== 'post') {
    return prev
  }
  
  // Find the standard delete action
  const deleteAction = prev.find(action => action.name === 'delete')
  
  if (!deleteAction) {
    // If delete action isn't found, just add our safe delete
    return [...prev, SafeDeleteAction as ActionWithName]
  }
  
  // Replace the standard delete action with our custom one
  return prev.map(action => 
    action.name === 'delete' ? SafeDeleteAction as ActionWithName : action
  )
} 