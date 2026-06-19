import { API_BASE_URL } from '../config/api'
import { useAuthStore } from '../store/useAuthStore'

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean
}

export const apiClient = async (endpoint: string, options: FetchOptions = {}) => {
  const { requiresAuth = true, headers, ...restOptions } = options
  const url = `${API_BASE_URL}${endpoint}`
  
  const authStore = useAuthStore.getState()
  let token = authStore.accessToken
  let hasRefreshToken = false

  if (requiresAuth && token) {
    hasRefreshToken = Boolean(await window.bambooApi.authGetToken('refreshToken'))
  }

  if (requiresAuth && !token) {
    if (endpoint.startsWith('/api/browser/sync/')) {
      throw new Error('Login to Bamboo Account to enable sync')
    }
    throw new Error('Authentication required')
  }

  let reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>)
  }

  if (requiresAuth && token) {
    reqHeaders['Authorization'] = `Bearer ${token}`
  }

  try {
    let response = await fetch(url, { ...restOptions, headers: reqHeaders })

    // Try to refresh token if 401 Unauthorized
    if (response.status === 401 && requiresAuth && hasRefreshToken) {
      try {
        const newToken = await window.bambooApi.authApiRefresh()
        authStore.setAccessToken(newToken)
        await window.bambooApi.authSetToken('accessToken', newToken)
        
        token = newToken
        reqHeaders['Authorization'] = `Bearer ${newToken}`
        response = await fetch(url, { ...restOptions, headers: reqHeaders })
      } catch (refreshError) {
        // Refresh failed, logout and force the user back through Bamboo Account
        authStore.logout()
        if (endpoint.startsWith('/api/browser/sync/')) {
          authStore.setError('Login to Bamboo Account to enable sync')
        }
        throw new Error('Session expired. Please log in again.')
      }
    } else if (response.status === 401 && requiresAuth) {
      authStore.logout()
      if (endpoint.startsWith('/api/browser/sync/')) {
        authStore.setError('Login to Bamboo Account to enable sync')
      }
      throw new Error('Session expired. Please log in again.')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new Error(errorData?.message || `Error ${response.status}: ${response.statusText}`)
    }

    // Attempt to parse json
    const isJson = response.headers.get('content-type')?.includes('application/json')
    if (isJson) {
      return await response.json()
    }
    return response
  } catch (error: any) {
    throw new Error(error.message || 'Network error')
  }
}
