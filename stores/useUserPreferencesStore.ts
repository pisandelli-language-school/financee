import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AuthPreferencesModule } from '~/api/auth'
import type { UserPreferencesRecord } from '~/types/auth'

const defaultPreferences: UserPreferencesRecord = {
  sidebarCollapsed: false,
}

export const useUserPreferencesStore = defineStore('user-preferences', () => {
  const preferences = ref<UserPreferencesRecord>({ ...defaultPreferences })
  const hydrated = ref(false)
  const saving = ref(false)

  function hydrate(nextPreferences?: Partial<UserPreferencesRecord> | null) {
    preferences.value = {
      ...defaultPreferences,
      ...nextPreferences,
    }
    hydrated.value = true
  }

  async function updatePreferences(nextPreferences: Partial<UserPreferencesRecord>) {
    const previousPreferences = { ...preferences.value }
    const payload = {
      ...preferences.value,
      ...nextPreferences,
    }

    preferences.value = payload
    saving.value = true

    try {
      preferences.value = await AuthPreferencesModule.update(payload)
      hydrated.value = true
      return preferences.value
    } catch (error) {
      preferences.value = previousPreferences
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    preferences,
    hydrated,
    saving,
    hydrate,
    updatePreferences,
  }
})
