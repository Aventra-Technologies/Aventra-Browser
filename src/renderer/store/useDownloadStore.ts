import { create } from 'zustand'

export interface Download {
  id: string
  name: string
  size: number
  received: number
  path: string
  status: 'progressing' | 'completed' | 'failed' | 'interrupted'
}

interface DownloadState {
  downloads: Download[]
  addDownload: (download: Omit<Download, 'received' | 'status'>) => void
  updateProgress: (id: string, received: number) => void
  completeDownload: (id: string) => void
  failDownload: (id: string) => void
  interruptDownload: (id: string) => void
}

export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: [],
  addDownload: (download) =>
    set((state) => ({
      downloads: [...state.downloads, { ...download, received: 0, status: 'progressing' }],
    })),
  updateProgress: (id, received) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, received } : d)),
    })),
  completeDownload: (id) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, status: 'completed' } : d)),
    })),
  failDownload: (id) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, status: 'failed' } : d)),
    })),
  interruptDownload: (id) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, status: 'interrupted' } : d)),
    })),
}))
