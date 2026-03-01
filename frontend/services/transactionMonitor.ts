// services/transactionMonitor.ts
type EventCallback = (data: any) => void;

class TransactionMonitor {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout = 2000;
  private connectionChangeCallbacks: ((status: { isConnected: boolean; reconnectAttempts: number }) => void)[] = [];
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private isConnecting = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      this.ws = new WebSocket('wss://qchain-ai-backend.onrender.com/ws');

      this.ws.onopen = () => {
        // console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.startHeartbeat();
        this.notifyConnectionChange(true, this.reconnectAttempts);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.stopHeartbeat();
        this.notifyConnectionChange(false, this.reconnectAttempts);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectTimeout * Math.pow(1.5, this.reconnectAttempts - 1));
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(data: any) {
    const { type, ...payload } = data;
    
    if (type && this.eventListeners.has(type)) {
      const callbacks = this.eventListeners.get(type) || [];
      callbacks.forEach(callback => callback(payload));
    }
  }

  private notifyConnectionChange(isConnected: boolean, reconnectAttempts: number) {
    this.connectionChangeCallbacks.forEach(callback => 
      callback({ isConnected, reconnectAttempts })
    );
  }

  onConnectionChange(callback: (status: { isConnected: boolean; reconnectAttempts: number }) => void) {
    this.connectionChangeCallbacks.push(callback);
    return () => {
      this.connectionChangeCallbacks = this.connectionChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  on(eventType: string, callback: EventCallback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
    
    return () => {
      const callbacks = this.eventListeners.get(eventType) || [];
      this.eventListeners.set(eventType, callbacks.filter(cb => cb !== callback));
    };
  }

  sendTransaction(transaction: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'new_transaction',
        ...transaction
      }));
    }
  }

  async checkTransaction(txData: any): Promise<any> {
    try {
      const response = await fetch('https://qchain-ai-backend.onrender.com/predict-fraud-real-time', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: txData.amount,
          fee: 0.001,
          sender_wallet: txData.sender_wallet,
          receiver_wallet: txData.to,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check transaction');
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking transaction:', error);
      // Fallback
      return {
        fraud: txData.amount > 4,
        probability: txData.amount > 6 ? 0.98 : txData.amount > 4 ? 0.8 : 0.1,
        severity: txData.amount > 4 ? 'High' : 'Low',
        reason: txData.amount > 4 ? 'Amount exceeds risk threshold' : 'Amount within limits',
        risk_score: txData.amount > 6 ? 98 : txData.amount > 4 ? 80 : 10
      };
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const transactionMonitor = new TransactionMonitor();

