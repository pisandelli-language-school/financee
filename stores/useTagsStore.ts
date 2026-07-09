import { TagModule } from '~~/app/api/backoffice'
import { createCrudStore } from './_createCrudStore'

export const useTagsStore = createCrudStore(
  'tags',
  TagModule,
  () => ({
    search: '',
    page: 1,
    pageSize: 50,
  }),
)
