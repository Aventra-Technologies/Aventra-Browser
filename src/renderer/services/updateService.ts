import { useUpdateStore } from '../store/useUpdateStore'

export const updateService = {
  init() {
    useUpdateStore.getState().initUpdater()
  },
  
  async checkForUpdates() {
    await useUpdateStore.getState().checkForUpdates()
  },
  
  async downloadUpdate() {
    await useUpdateStore.getState().downloadUpdate()
  },
  
  async applyUpdateAndRestart() {
    await useUpdateStore.getState().applyUpdateAndRestart()
  }
}
