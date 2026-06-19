import React, { useEffect, useState } from 'react'
import { Globe, Folder, Check, X } from 'lucide-react'
import { useBrowserStore, Bookmark } from '../../store/useBrowserStore'
import { useTabStore } from '../../store/useTabStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import styles from './BookmarksBar.module.scss'

const BookmarksBar: React.FC = () => {
  const { bookmarks, fetchBookmarks, removeBookmark, updateBookmark, addBookmark, clipboard, setClipboard } = useBrowserStore()
  const { addTab, updateTab, activeTabId, tabs } = useTabStore()
  const { bookmarksBarVisibility, showOtherBookmarks, setBookmarksBarVisibility, setShowOtherBookmarks } = useSettingsStore()

  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'bookmark' | 'folder' | 'empty'
    targetId?: string
  } | null>(null)

  const [modal, setModal] = useState<{
    type: 'create-bookmark' | 'edit-bookmark' | 'create-folder' | 'edit-folder' | null
    targetId?: string
  } | null>(null)

  const [modalName, setModalName] = useState('')
  const [modalUrl, setModalUrl] = useState('')
  const [modalFolderId, setModalFolderId] = useState('')

  // Sync/fetch bookmarks on load
  useEffect(() => {
    fetchBookmarks()
  }, [])

  // Close menus and modals on Esc, click outside
  useEffect(() => {
    const handleClose = () => {
      setContextMenu(null)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null)
        setOpenFolderId(null)
        setModal(null)
      }
    }
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(`.${styles.bookmarkItem}`) && !target.closest(`.${styles.dropdownMenu}`)) {
        setOpenFolderId(null)
      }
    }

    window.addEventListener('click', handleClose)
    window.addEventListener('contextmenu', handleClose)
    window.addEventListener('click', handleGlobalClick)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('contextmenu', handleClose)
      window.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Sync form inputs when modal opens
  useEffect(() => {
    if (!modal) {
      setModalName('')
      setModalUrl('')
      setModalFolderId('')
      return
    }

    if (modal.type === 'create-bookmark' || modal.type === 'create-folder') {
      setModalName('')
      setModalUrl('')
      setModalFolderId(modal.targetId || '')
    } else if (modal.type === 'edit-bookmark') {
      const b = bookmarks.find(x => x.id === modal.targetId)
      if (b) {
        setModalName(b.title)
        setModalUrl(b.url)
        setModalFolderId(b.folderId || '')
      }
    } else if (modal.type === 'edit-folder') {
      const f = bookmarks.find(x => x.id === modal.targetId)
      if (f) {
        setModalName(f.title)
        setModalUrl('')
        setModalFolderId(f.folderId || '')
      }
    }
  }, [modal, bookmarks])

  // Calculate layout visibility
  const activeTab = tabs.find(t => t.id === activeTabId)
  const isVisible = bookmarksBarVisibility === 'always' ||
    (bookmarksBarVisibility === 'newtab' && activeTab?.url === 'bamboo://newtab')

  if (!isVisible) return null

  // Bookmark list calculations
  const rootBookmarks = bookmarks.filter(b => (!b.folderId || b.folderId === '') && b.id !== 'other-bookmarks')

  const handleBookmarkClick = (url: string) => {
    if (activeTabId && activeTabId !== 'bamboo-view') {
      updateTab(activeTabId, { url })
    } else {
      addTab(url)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'bookmark' | 'folder' | 'empty', targetId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    const coords = adjustMenuPosition(e.clientX, e.clientY)
    setContextMenu({ x: coords.x, y: coords.y, type, targetId })
  }

  const adjustMenuPosition = (clientX: number, clientY: number) => {
    const menuWidth = 280
    const menuHeight = 400
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    let posX = clientX
    let posY = clientY

    if (clientX + menuWidth > screenWidth) {
      posX = screenWidth - menuWidth - 10
    }
    if (clientY + menuHeight > screenHeight) {
      posY = screenHeight - menuHeight - 10
    }
    if (posX < 0) posX = 10
    if (posY < 0) posY = 10

    return { x: posX, y: posY }
  }

  const handlePaste = async (targetFolderId?: string) => {
    if (!clipboard) return
    const { item, mode } = clipboard

    if (mode === 'cut') {
      await updateBookmark(item.id, { folderId: targetFolderId || undefined })
      setClipboard(null)
    } else if (mode === 'copy') {
      const copyItem = async (originalItem: any, newParentFolderId?: string) => {
        const id = Math.random().toString(36).substring(7)
        const newObj = {
          title: mode === 'copy' && !newParentFolderId ? `${originalItem.title} (Copy)` : originalItem.title,
          url: originalItem.url,
          favicon: originalItem.favicon,
          isFolder: originalItem.isFolder,
          isSeparator: originalItem.isSeparator,
          folderId: newParentFolderId || undefined
        }
        await (window as any).bambooApi.addBookmark({ ...newObj, id, addedAt: Date.now() })
        
        if (originalItem.isFolder) {
          const children = bookmarks.filter(b => b.folderId === originalItem.id)
          for (const child of children) {
            await copyItem(child, id)
          }
        }
      }
      await copyItem(item, targetFolderId)
      await fetchBookmarks()
    }
  }

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modal) return

    const nameValue = modalName.trim()
    const urlValue = modalUrl.trim()
    const folderValue = modalFolderId || undefined

    if (modal.type === 'create-bookmark') {
      let finalUrl = urlValue
      if (finalUrl && !finalUrl.includes('://')) {
        finalUrl = 'https://' + finalUrl
      }
      await addBookmark({
        title: nameValue || 'Новая закладка',
        url: finalUrl || 'https://google.com',
        folderId: folderValue
      })
    } else if (modal.type === 'edit-bookmark' && modal.targetId) {
      let finalUrl = urlValue
      if (finalUrl && !finalUrl.includes('://')) {
        finalUrl = 'https://' + finalUrl
      }
      await updateBookmark(modal.targetId, {
        title: nameValue || 'Новая закладка',
        url: finalUrl || 'https://google.com',
        folderId: folderValue
      })
    } else if (modal.type === 'create-folder') {
      await addBookmark({
        title: nameValue || 'Новая папка',
        url: '',
        isFolder: true,
        folderId: folderValue
      })
    } else if (modal.type === 'edit-folder' && modal.targetId) {
      await updateBookmark(modal.targetId, {
        title: nameValue || 'Новая папка',
        folderId: folderValue
      })
    }

    setModal(null)
  }

  const renderDropdownItems = (folderId: string) => {
    const folderItems = bookmarks.filter(b => b.folderId === folderId)
    if (folderItems.length === 0) {
      return <div style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>Пусто</div>
    }
    return folderItems.map(item => {
      if (item.isSeparator) {
        return <div key={item.id} className={styles.divider} />
      }
      if (item.isFolder) {
        return (
          <div key={item.id} style={{ position: 'relative' }} className={styles.menuItemWithSub}>
            <button
              className={styles.menuItem}
              type="button"
              onContextMenu={(e) => handleContextMenu(e, 'folder', item.id)}
            >
              <div className={styles.itemLeft}>
                <Folder size={14} className={styles.folderIcon} />
                <span>{item.title}</span>
              </div>
              <span className={styles.shortcutText}>&gt;</span>
            </button>
            <div className={styles.submenuContainer}>
              <div className={styles.submenu}>
                {renderDropdownItems(item.id)}
              </div>
            </div>
          </div>
        )
      }
      return (
        <button
          key={item.id}
          className={styles.menuItem}
          type="button"
          onClick={() => {
            handleBookmarkClick(item.url)
            setOpenFolderId(null)
          }}
          onContextMenu={(e) => handleContextMenu(e, 'bookmark', item.id)}
        >
          <div className={styles.itemLeft}>
            {item.favicon ? (
              <img src={item.favicon} className={styles.favicon} alt="" onError={(e) => {
                e.currentTarget.style.display = 'none'
              }} />
            ) : (
              <Globe size={14} className={styles.icon} />
            )}
            <span>{item.title}</span>
          </div>
        </button>
      )
    })
  }

  const renderContextMenu = () => {
    if (!contextMenu) return null

    const { x, y, type, targetId } = contextMenu
    const bookmark = type === 'bookmark' ? bookmarks.find(b => b.id === targetId) : null
    const folder = type === 'folder' && targetId !== 'other-bookmarks' ? bookmarks.find(b => b.id === targetId) : null
    const isOtherBookmarks = targetId === 'other-bookmarks'

    const handleOpenInNewTab = () => {
      if (bookmark) {
        addTab(bookmark.url)
      }
    }

    const handleOpenInNewWindow = () => {
      if (bookmark) {
        ;(window as any).bambooApi.newWindow(false, bookmark.url)
      }
    }

    const handleOpenInPrivateWindow = () => {
      if (bookmark) {
        ;(window as any).bambooApi.newWindow(true, bookmark.url)
      }
    }

    const handleOpenAllInTabs = () => {
      const items = bookmarks.filter(b => b.folderId === targetId && !b.isFolder && !b.isSeparator)
      items.forEach(item => addTab(item.url))
    }

    const handleOpenAllInNewWindow = () => {
      const items = bookmarks.filter(b => b.folderId === targetId && !b.isFolder && !b.isSeparator)
      if (items.length > 0) {
        ;(window as any).bambooApi.newWindow(false, items[0].url)
      }
    }

    const handleOpenAllInPrivate = () => {
      const items = bookmarks.filter(b => b.folderId === targetId && !b.isFolder && !b.isSeparator)
      if (items.length > 0) {
        ;(window as any).bambooApi.newWindow(true, items[0].url)
      }
    }

    const handleCut = () => {
      const item = bookmark || folder
      if (item) {
        setClipboard({ item, mode: 'cut' })
      }
    }

    const handleCopy = () => {
      const item = bookmark || folder
      if (item) {
        setClipboard({ item, mode: 'copy' })
      }
    }

    const handlePasteClick = () => {
      let targetFolderId: string | undefined = undefined
      if (type === 'folder') {
        targetFolderId = targetId
      } else if (type === 'bookmark' && bookmark) {
        targetFolderId = bookmark.folderId
      }
      handlePaste(targetFolderId)
    }

    const handleAddSeparatorClick = async () => {
      let targetFolderId: string | undefined = undefined
      if (type === 'folder') {
        targetFolderId = targetId
      } else if (type === 'bookmark' && bookmark) {
        targetFolderId = bookmark.folderId
      }
      await addBookmark({
        title: '',
        url: '',
        isSeparator: true,
        folderId: targetFolderId
      })
    }

    const handleEditClick = () => {
      if (type === 'bookmark') {
        setModal({ type: 'edit-bookmark', targetId })
      } else if (type === 'folder' && !isOtherBookmarks) {
        setModal({ type: 'edit-folder', targetId })
      }
    }

    const handleDeleteClick = async () => {
      if (targetId) {
        await removeBookmark(targetId)
      }
    }

    return (
      <div 
        className={styles.contextMenu} 
        style={{ top: y, left: x }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {type === 'bookmark' && (
          <>
            <button className={styles.menuItem} type="button" onClick={handleOpenInNewTab}>
              Открыть в новой вкладке
            </button>
            <button className={styles.menuItem} type="button" onClick={handleOpenInNewWindow}>
              Открыть в новом окне
            </button>
            <button className={styles.menuItem} type="button" onClick={handleOpenInPrivateWindow}>
              Открыть в приватном окне
            </button>
            <div className={styles.divider} />
            <button className={styles.menuItem} type="button" onClick={handleEditClick}>
              Изменить закладку...
            </button>
            <button className={styles.menuItem} type="button" onClick={handleDeleteClick}>
              Удалить закладку
            </button>
            <div className={styles.divider} />
            <button className={styles.menuItem} type="button" onClick={handleCut}>
              Вырезать
            </button>
            <button className={styles.menuItem} type="button" onClick={handleCopy}>
              Копировать
            </button>
            <button 
              className={`${styles.menuItem} ${!clipboard ? styles.disabled : ''}`} 
              disabled={!clipboard}
              type="button"
              onClick={handlePasteClick}
            >
              Вставить
            </button>
            <div className={styles.divider} />
          </>
        )}

        {type === 'folder' && (
          <>
            <button className={styles.menuItem} type="button" onClick={handleOpenAllInTabs}>
              Открыть все во вкладках
            </button>
            <button className={styles.menuItem} type="button" onClick={handleOpenAllInNewWindow}>
              Открыть все в новом окне
            </button>
            <button className={styles.menuItem} type="button" onClick={handleOpenAllInPrivate}>
              Открыть все в приватном окне
            </button>
            <div className={styles.divider} />
            <button className={styles.menuItem} disabled={isOtherBookmarks} type="button" onClick={handleEditClick}>
              Изменить папку...
            </button>
            <button className={styles.menuItem} disabled={isOtherBookmarks} type="button" onClick={handleDeleteClick}>
              Удалить папку
            </button>
            <div className={styles.divider} />
            <button className={styles.menuItem} disabled={isOtherBookmarks} type="button" onClick={handleCut}>
              Вырезать
            </button>
            <button className={styles.menuItem} disabled={isOtherBookmarks} type="button" onClick={handleCopy}>
              Копировать
            </button>
            <button 
              className={`${styles.menuItem} ${!clipboard ? styles.disabled : ''}`} 
              disabled={!clipboard}
              type="button"
              onClick={handlePasteClick}
            >
              Вставить
            </button>
            <div className={styles.divider} />
          </>
        )}

        {type === 'empty' && (
          <>
            <button className={styles.menuItem} type="button" onClick={() => setModal({ type: 'create-bookmark' })}>
              Создать закладку...
            </button>
            <button className={styles.menuItem} type="button" onClick={() => setModal({ type: 'create-folder' })}>
              Создать папку...
            </button>
            <button className={styles.menuItem} type="button" onClick={handleAddSeparatorClick}>
              Добавить разделитель
            </button>
            <div className={styles.divider} />
            <button 
              className={`${styles.menuItem} ${!clipboard ? styles.disabled : ''}`} 
              disabled={!clipboard}
              type="button"
              onClick={handlePasteClick}
            >
              Вставить
            </button>
            <div className={styles.divider} />
          </>
        )}

        {/* Common items for bookmark/folder contexts */}
        {type !== 'empty' && (
          <>
            <button 
              className={styles.menuItem} 
              type="button"
              onClick={() => {
                let targetFolderId: string | undefined = undefined
                if (type === 'folder') targetFolderId = targetId
                else if (type === 'bookmark' && bookmark) targetFolderId = bookmark.folderId
                setModal({ type: 'create-bookmark', targetId: targetFolderId })
              }}
            >
              Создать закладку...
            </button>
            <button 
              className={styles.menuItem} 
              type="button"
              onClick={() => {
                let targetFolderId: string | undefined = undefined
                if (type === 'folder') targetFolderId = targetId
                else if (type === 'bookmark' && bookmark) targetFolderId = bookmark.folderId
                setModal({ type: 'create-folder', targetId: targetFolderId })
              }}
            >
              Создать папку...
            </button>
            <button className={styles.menuItem} type="button" onClick={handleAddSeparatorClick}>
              Добавить разделитель
            </button>
            <div className={styles.divider} />
          </>
        )}

        <div className={`${styles.menuItem} ${styles.menuItemWithSub}`}>
          <div className={styles.itemLeft}>
            <span>Панель закладок</span>
          </div>
          <span className={styles.shortcutText}>&gt;</span>
          <div className={styles.submenuContainer}>
            <div className={styles.submenu}>
              <button 
                className={styles.menuItem} 
                type="button"
                onClick={() => setBookmarksBarVisibility('always')}
              >
                <div className={styles.itemLeft}>
                  {bookmarksBarVisibility === 'always' && <Check size={14} className={styles.icon} />}
                  <span>Всегда показывать</span>
                </div>
              </button>
              <button 
                className={styles.menuItem} 
                type="button"
                onClick={() => setBookmarksBarVisibility('newtab')}
              >
                <div className={styles.itemLeft}>
                  {bookmarksBarVisibility === 'newtab' && <Check size={14} className={styles.icon} />}
                  <span>Показывать только на новой вкладке</span>
                </div>
              </button>
              <button 
                className={styles.menuItem} 
                type="button"
                onClick={() => setBookmarksBarVisibility('never')}
              >
                <div className={styles.itemLeft}>
                  {(bookmarksBarVisibility as string) === 'never' && <Check size={14} className={styles.icon} />}
                  <span>Никогда не показывать</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <button 
          className={styles.menuItem} 
          type="button"
          onClick={() => setShowOtherBookmarks(!showOtherBookmarks)}
        >
          <div className={styles.itemLeft}>
            {showOtherBookmarks && <Check size={14} className={styles.icon} />}
            <span>Отображать другие закладки</span>
          </div>
        </button>

        <div className={styles.divider} />

        <button 
          className={styles.menuItem} 
          type="button"
          onClick={() => addTab('bamboo://settings')}
        >
          Управление закладками
        </button>
      </div>
    )
  }

  const renderModal = () => {
    if (!modal || !modal.type) return null

    const isFolderModal = modal.type === 'create-folder' || modal.type === 'edit-folder'
    const titleText = modal.type === 'create-bookmark' ? 'Создать закладку'
      : modal.type === 'edit-bookmark' ? 'Изменить закладку'
      : modal.type === 'create-folder' ? 'Создать папку'
      : 'Изменить папку'

    const allFolders = bookmarks.filter(b => b.isFolder && b.id !== modal.targetId)

    return (
      <div className={styles.modalOverlay} onClick={() => setModal(null)}>
        <form 
          className={styles.modal} 
          onClick={(e) => e.stopPropagation()}
          onSubmit={handleModalSave}
        >
          <div className={styles.modalHeader}>
            <h3>{titleText}</h3>
            <button type="button" className={styles.closeModalBtn} onClick={() => setModal(null)}>
              <X size={18} />
            </button>
          </div>
          <div className={styles.modalBody}>
            <div className={styles.inputGroup}>
              <label>Название</label>
              <input 
                type="text" 
                required
                placeholder={isFolderModal ? "Название папки" : "Название закладки"}
                value={modalName} 
                onChange={(e) => setModalName(e.target.value)} 
                autoFocus
              />
            </div>
            {!isFolderModal && (
              <div className={styles.inputGroup}>
                <label>URL</label>
                <input 
                  type="text" 
                  required
                  placeholder="https://example.com"
                  value={modalUrl} 
                  onChange={(e) => setModalUrl(e.target.value)} 
                />
              </div>
            )}
            <div className={styles.inputGroup}>
              <label>Папка</label>
              <select 
                value={modalFolderId} 
                onChange={(e) => setModalFolderId(e.target.value)}
              >
                <option value="">Панель закладок (Корень)</option>
                <option value="other-bookmarks">Other Bookmarks</option>
                {allFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.modalFooter}>
            <button 
              type="button" 
              className={`${styles.btn} ${styles.cancelBtn}`} 
              onClick={() => setModal(null)}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className={`${styles.btn} ${styles.saveBtn}`}
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div 
      className={styles.bookmarksBar} 
      onContextMenu={(e) => handleContextMenu(e, 'empty')}
    >
      <div className={styles.bookmarksList}>
        {rootBookmarks.map((item) => {
          if (item.isSeparator) {
            return <div key={item.id} className={styles.separatorItem} />
          }
          if (item.isFolder) {
            return (
              <div key={item.id} style={{ position: 'relative' }}>
                <button
                  className={`${styles.bookmarkItem} ${openFolderId === item.id ? styles.activeFolder : ''}`}
                  onClick={() => setOpenFolderId(openFolderId === item.id ? null : item.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'folder', item.id)}
                  type="button"
                >
                  <Folder size={14} className={styles.folderIcon} />
                  <span className={styles.title}>{item.title}</span>
                </button>
                {openFolderId === item.id && (
                  <div className={styles.dropdownMenu}>
                    {renderDropdownItems(item.id)}
                  </div>
                )}
              </div>
            )
          }
          return (
            <button
              key={item.id}
              className={styles.bookmarkItem}
              onClick={() => handleBookmarkClick(item.url)}
              onContextMenu={(e) => handleContextMenu(e, 'bookmark', item.id)}
              type="button"
            >
              {item.favicon ? (
                <img src={item.favicon} className={styles.favicon} alt="" onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }} />
              ) : (
                <Globe size={14} className={styles.favicon} />
              )}
              <span className={styles.title}>{item.title}</span>
            </button>
          )
        })}
      </div>

      {showOtherBookmarks && (
        <div className={styles.foldersRight}>
          <div style={{ position: 'relative' }}>
            <button 
              className={`${styles.bookmarkItem} ${openFolderId === 'other-bookmarks' ? styles.activeFolder : ''}`}
              onClick={() => setOpenFolderId(openFolderId === 'other-bookmarks' ? null : 'other-bookmarks')}
              onContextMenu={(e) => handleContextMenu(e, 'folder', 'other-bookmarks')}
              type="button"
            >
              <Folder size={14} className={styles.folderIcon} />
              <span className={styles.title}>Other Bookmarks</span>
            </button>
            {openFolderId === 'other-bookmarks' && (
              <div className={styles.dropdownMenu} style={{ right: 0 }}>
                {renderDropdownItems('other-bookmarks')}
              </div>
            )}
          </div>
        </div>
      )}

      {renderContextMenu()}
      {renderModal()}
    </div>
  )
}

export default BookmarksBar
