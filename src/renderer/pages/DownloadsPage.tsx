import React from 'react'
import { useDownloadStore } from '../store/useDownloadStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { Download, File, ExternalLink, Folder, Trash2, Globe } from 'lucide-react'
import styles from './DownloadsPage.module.scss'

const DownloadsPage: React.FC = () => {
  const { downloads } = useDownloadStore()
  const { t } = useSettingsStore()

  const handleOpen = (path: string) => {
    ;(window as any).bambooApi.openFile(path)
  }

  const handleShowInFolder = (path: string) => {
    ;(window as any).bambooApi.showItemInFolder(path)
  }

  return (
    <div className={styles.downloadsPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{t('common.downloads')}</h1>
        </div>

        <div className={styles.list}>
          {downloads.map((d) => (
            <div key={d.id} className={styles.item}>
              <div className={styles.fileIconBox}>
                <File size={32} />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{d.name}</div>
                <div className={styles.details}>
                  {Math.round(d.received / 1024 / 1024 * 10) / 10} MB / {Math.round(d.size / 1024 / 1024 * 10) / 10} MB
                  • {d.status}
                </div>
                {d.status === 'progressing' && (
                  <div className={styles.progressContainer}>
                    <div 
                      className={styles.progressBar} 
                      style={{ width: `${(d.received / d.size) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <div className={styles.actions}>
                <button onClick={() => handleOpen(d.path)} disabled={d.status !== 'completed'}>
                  <ExternalLink size={18} />
                </button>
                <button onClick={() => handleShowInFolder(d.path)}>
                  <Folder size={18} />
                </button>
              </div>
            </div>
          ))}
          {downloads.length === 0 && (
            <div className={styles.empty}>No downloads yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DownloadsPage
