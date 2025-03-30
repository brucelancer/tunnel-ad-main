type Listener = (...args: any[]) => void;

/**
 * A simple event emitter implementation for React Native
 * that doesn't rely on browser APIs like window
 */
class SimpleEventEmitter {
  private listeners: { [event: string]: Listener[] } = {};

  /**
   * Add an event listener
   * @param eventName The name of the event to listen for
   * @param listener The callback function
   * @returns A function that removes this listener
   */
  addListener(eventName: string, listener: Listener): { remove: () => void } {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);

    return {
      remove: () => this.removeListener(eventName, listener)
    };
  }

  /**
   * Remove an event listener
   * @param eventName The name of the event
   * @param listenerToRemove The callback function to remove
   */
  removeListener(eventName: string, listenerToRemove: Listener): void {
    if (!this.listeners[eventName]) {
      return;
    }

    const filteredListeners = this.listeners[eventName].filter(
      listener => listener !== listenerToRemove
    );

    this.listeners[eventName] = filteredListeners;
  }

  /**
   * Remove all listeners for an event
   * @param eventName The name of the event
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      delete this.listeners[eventName];
    } else {
      this.listeners = {};
    }
  }

  /**
   * Emit an event with data
   * @param eventName The name of the event to emit
   * @param args The data to pass to listeners
   */
  emit(eventName: string, ...args: any[]): void {
    const eventListeners = this.listeners[eventName];
    if (!eventListeners) {
      return;
    }

    eventListeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }
}

// Create and export a singleton instance
export const eventEmitter = new SimpleEventEmitter(); 