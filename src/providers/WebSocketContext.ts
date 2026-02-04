import { createContext } from 'react';

export interface WSMessage {
  type: string;
  // Ticket events
  ticket_id?: number;
  title?: string;
  // Common
  message?: string;
  user_id?: number;
  is_admin?: boolean;
  // Balance events
  amount_kopeks?: number;
  amount_rubles?: number;
  new_balance_kopeks?: number;
  new_balance_rubles?: number;
  description?: string;
  // Subscription events
  expires_at?: string;
  new_expires_at?: string;
  tariff_name?: string;
  days_left?: number;
  // Device purchase events
  devices_added?: number;
  new_device_limit?: number;
  // Traffic purchase events
  traffic_gb_added?: number;
  new_traffic_limit_gb?: number;
  // Autopay events
  required_kopeks?: number;
  required_rubles?: number;
  balance_kopeks?: number;
  balance_rubles?: number;
  reason?: string;
  // Account events (ban/warning)
  // Referral events
  bonus_kopeks?: number;
  bonus_rubles?: number;
  referral_name?: string;
  // Payment events
  payment_method?: string;
}

export type MessageHandler = (message: WSMessage) => void;

export interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (handler: MessageHandler) => () => void;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);
