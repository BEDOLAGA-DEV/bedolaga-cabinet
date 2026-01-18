import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '../store/auth'

export interface WSMessage {
  type: string
  ticket_id?: number
  message?: string
  title?: string
  user_id?: number
  is_admin?: boolean
}

interface UseWebSocketOptions {
  onMessage?: (message: WSMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { accessToken, isAuthenticated } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const optionsRef = useRef(options)

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!accessToken || !isAuthenticated) {
      return
    }

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    cleanup()

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : window.location.host
    const wsUrl = `${protocol}//${host}/cabinet/ws?token=${accessToken}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected')
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        optionsRef.current.onConnect?.()

        // Setup ping interval (every 25 seconds)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25000)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage

          // Ignore pong messages
          if (message.type === 'pong' || message.type === 'connected') {
            return
          }

          optionsRef.current.onMessage?.(message)
        } catch (e) {
          console.error('[WS] Failed to parse message:', e)
        }
      }

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason)
        setIsConnected(false)
        optionsRef.current.onDisconnect?.()

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('[WS] Error:', error)
      }
    } catch (e) {
      console.error('[WS] Failed to connect:', e)
    }
  }, [accessToken, isAuthenticated, cleanup])

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect()
    } else {
      cleanup()
      setIsConnected(false)
    }

    return cleanup
  }, [isAuthenticated, accessToken, connect, cleanup])

  return { isConnected }
}
