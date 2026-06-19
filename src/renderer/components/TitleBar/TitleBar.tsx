import React from 'react'
import { Minus, Square, X } from 'lucide-react'
import styles from './TitleBar.module.scss'

const TitleBar: React.FC = () => {
  const handleControl = (action: 'minimize' | 'maximize' | 'close') => {
    ;(window as any).bambooApi.windowControl(action)
  }

  return (
    <div className={styles.titleBar}>
      <div className={styles.controls}>
        <button onClick={() => handleControl('minimize')} className={styles.controlBtn}>
          <Minus size={14} />
        </button>
        <button onClick={() => handleControl('maximize')} className={styles.controlBtn}>
          <Square size={12} />
        </button>
        <button onClick={() => handleControl('close')} className={`${styles.controlBtn} ${styles.closeBtn}`}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
