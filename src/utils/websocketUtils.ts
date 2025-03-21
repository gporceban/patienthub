
import { supabase } from '@/integrations/supabase/client';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface WebSocketMessage {
  type: string;
  transcript?: string;
  error?: any;
  message?: string;
}

export interface TranscriptionWebSocketConfig {
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onMessage?: (data: WebSocketMessage) => void;
  onError?: (error: any) => void;
  maxRetryAttempts?: number;
  initialBackoffTime?: number;
}

export class TranscriptionWebSocket {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private backoffTime: number;
  private maxRetryAttempts: number;
  private config: TranscriptionWebSocketConfig;
  private state: WebSocketState = {
    isConnected: false,
    isConnecting: false,
    error: null
  };

  constructor(config: TranscriptionWebSocketConfig) {
    this.config = config;
    this.maxRetryAttempts = config.maxRetryAttempts || 3;
    this.backoffTime = config.initialBackoffTime || 1000;
  }

  async connect() {
    try {
      this.state.isConnecting = true;
      this.state.error = null;
      
      console.log('Requesting OpenAI token for transcription...');
      const { data, error } = await supabase.functions.invoke('realtime-transcription-token');
      
      if (error) {
        console.error('Error getting transcription token:', error);
        throw new Error(`Erro ao obter token: ${error.message}`);
      }
      
      if (!data?.client_secret?.value) {
        console.error('Invalid token response:', data);
        throw new Error('Token inválido recebido');
      }
      
      const token = data.client_secret.value;
      console.log('Token received, connecting to WebSocket...');
      
      if (this.ws) {
        try {
          this.ws.close();
        } catch (e) {
          console.error('Error closing existing websocket:', e);
        }
      }
      
      this.ws = new WebSocket('wss://api.openai.com/v1/audio/realtime/transcription');
      
      this.ws.onopen = () => {
        console.log('WebSocket connection opened for transcription');
        this.retryCount = 0;
        this.backoffTime = this.config.initialBackoffTime || 1000;
        
        if (!this.ws) return;
        
        // Send authentication message with the token
        this.ws.send(JSON.stringify({
          type: "auth",
          client_secret: token
        }));
        
        console.log('Authentication message sent to WebSocket');
        
        if (this.config.onOpen) {
          this.config.onOpen();
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          if (data.error) {
            console.error('WebSocket error from server:', data.error);
            this.state.error = `Erro do servidor: ${data.error.message || data.error}`;
            
            if (this.config.onError) {
              this.config.onError(data.error);
            }
            return;
          }
          
          if (this.config.onMessage) {
            this.config.onMessage(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`WebSocket closed with code ${event.code}: ${event.reason}`);
        this.state.isConnected = false;
        
        if (this.config.onClose) {
          this.config.onClose(event.code, event.reason);
        }
      };
      
      this.ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        this.state.error = 'Erro na conexão de transcrição. Tentando reconectar...';
        
        if (this.config.onError) {
          this.config.onError(event);
        }
      };
      
      return true;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.state.error = `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      this.state.isConnected = false;
      return false;
    } finally {
      this.state.isConnecting = false;
    }
  }

  retry() {
    if (this.retryCount < this.maxRetryAttempts) {
      this.retryCount += 1;
      const retryTime = this.calculateRetryTime();
      
      console.log(`Retrying connection (attempt ${this.retryCount} of ${this.maxRetryAttempts}) in ${Math.round(retryTime)}ms...`);
      
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
      
      this.retryTimeout = setTimeout(() => {
        this.connect();
      }, retryTime);
      
      return true;
    } else {
      console.log('Max retry attempts reached, giving up...');
      this.state.error = 'Falha ao conectar ao serviço de transcrição após várias tentativas. Por favor, tente novamente mais tarde.';
      return false;
    }
  }

  private calculateRetryTime(): number {
    const backoffTime = this.backoffTime * Math.pow(1.5, this.retryCount - 1);
    const jitter = backoffTime * 0.1 * Math.random();
    return Math.min(10000, backoffTime + jitter);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  close() {
    console.log('Closing WebSocket connection...');
    
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.ws = null;
    }
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    this.state.isConnected = false;
    this.state.isConnecting = false;
  }

  getState(): WebSocketState {
    return {...this.state};
  }

  setConnected(connected: boolean) {
    this.state.isConnected = connected;
  }
}
