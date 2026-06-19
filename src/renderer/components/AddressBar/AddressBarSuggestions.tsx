import React from 'react'
import { Search, Globe, Bookmark, Clock } from 'lucide-react'
import { useBrowserStore } from '../../store/useBrowserStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import styles from './AddressBar.module.scss'

interface SuggestionsProps {
  query: string
  onSelect: (url: string) => void
}

const AddressBarSuggestions: React.FC<SuggestionsProps> = ({ query, onSelect }) => {
  const { history, bookmarks } = useBrowserStore()
  const { searchEngine, searchEngineName } = useSettingsStore()

  if (!query.trim()) return null

  const searchResults = [
    { type: 'search', title: `Search ${searchEngineName} for "${query}"`, url: `${searchEngine}${encodeURIComponent(query)}`, icon: <Search size={14} /> }
  ]

  const bookmarkResults = bookmarks
    .filter(b => b.title.toLowerCase().includes(query.toLowerCase()) || b.url.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .map(b => ({ type: 'bookmark', ...b, icon: <Bookmark size={14} /> }))

  const historyResults = history
    .filter(h => h.title.toLowerCase().includes(query.toLowerCase()) || h.url.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(h => ({ type: 'history', ...h, icon: <Clock size={14} /> }))

  const allResults = [...searchResults, ...bookmarkResults, ...historyResults]

  return (
    <div className={styles.suggestionsContainer}>
      {allResults.map((result, idx) => (
        <div 
          key={idx} 
          className={styles.suggestionItem}
          onMouseDown={() => onSelect(result.url)}
        >
          <span className={styles.suggestionIcon}>{result.icon}</span>
          <span className={styles.suggestionTitle}>{result.title}</span>
          <span className={styles.suggestionUrl}>{result.url}</span>
        </div>
      ))}
    </div>
  )
}

export default AddressBarSuggestions
