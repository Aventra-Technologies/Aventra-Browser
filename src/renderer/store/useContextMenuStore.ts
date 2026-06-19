import { create } from 'zustand'

export type ContextMenuType = 'link' | 'image' | 'text' | 'page'

export interface ContextMenuParams {
  x: number
  y: number
  linkURL?: string
  srcURL?: string
  selectionText?: string
  mediaType?: string
  isEditable?: boolean
  webviewId?: string // if triggered from a webview
  webviewRef?: any // ref to webview element
  tabId?: string // current tab ID
}

interface ContextMenuState {
  isOpen: boolean
  type: ContextMenuType
  x: number
  y: number
  params: ContextMenuParams | null
  openMenu: (x: number, y: number, type: ContextMenuType, params: ContextMenuParams) => void
  closeMenu: () => void
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  type: 'page',
  x: 0,
  y: 0,
  params: null,
  openMenu: (x, y, type, params) => set({ isOpen: true, type, x, y, params }),
  closeMenu: () => set({ isOpen: false, params: null }),
}))
