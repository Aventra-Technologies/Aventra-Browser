import React from 'react'
import { useTabStore } from '../store/useTabStore'
import styles from './GoogleServicesPage.module.scss'

const GoogleServicesPage: React.FC = () => {
  const { updateTab, activeTabId } = useTabStore()

  const googleServices = [
    { title: 'Google Search', url: 'https://google.com', description: 'Search the world\'s information, including webpages, images, and videos.' },
    { title: 'Gmail', url: 'https://mail.google.com', description: 'Fast, efficient, and secure email service by Google.' },
    { title: 'Google Drive', url: 'https://drive.google.com', description: 'Store, share, and collaborate on files and folders from any device.' },
    { title: 'Google Docs', url: 'https://docs.google.com', description: 'Create and edit documents directly in your web browser.' },
    { title: 'Google Maps', url: 'https://maps.google.com', description: 'Find local businesses, view maps and get driving directions.' },
    { title: 'YouTube', url: 'https://youtube.com', description: 'Share your videos with friends, family, and the world.' },
    { title: 'Google Translate', url: 'https://translate.google.com', description: 'Instantly translate words, phrases, and web pages between languages.' },
    { title: 'GitHub', url: 'https://github.com', description: 'Let\'s build from here - the AI-powered developer platform.' },
  ]

  const handleServiceClick = (url: string) => {
    if (activeTabId) {
      updateTab(activeTabId, { url })
    }
  }

  return (
    <div className={styles.googleServicesPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <div className={styles.googleLogoContainer}>
              <span className={styles.blue}>G</span>
              <span className={styles.red}>o</span>
              <span className={styles.yellow}>o</span>
              <span className={styles.blue}>g</span>
              <span className={styles.green}>l</span>
              <span className={styles.red}>e</span>
            </div>
            <h1 className={styles.title}>Services</h1>
          </div>
          <p className={styles.subtitle}>Quick access to Google services and productive web applications</p>
        </div>

        <div className={styles.grid}>
          {googleServices.map((service) => (
            <div 
              key={service.url} 
              className={styles.card} 
              onClick={() => handleServiceClick(service.url)}
            >
              <div className={styles.iconWrapper}>
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${new URL(service.url).hostname}&sz=64`} 
                  alt="" 
                  className={styles.favicon}
                />
              </div>
              <div className={styles.info}>
                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardDescription}>{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GoogleServicesPage
