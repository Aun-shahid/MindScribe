// src/utils/events.ts
// Simple event system for cross-component communication

export type AppEvent = 'patient-created' | 'patient-updated' | 'patient-deleted' | 'session-created' | 'session-updated';

export const emitAppEvent = (eventName: AppEvent, data?: any) => {
  const event = new CustomEvent(`therapease:${eventName}`, {
    detail: data,
  });
  window.dispatchEvent(event);
};

export const listenToAppEvent = (eventName: AppEvent, callback: (data?: any) => void) => {
  const handler = (event: CustomEvent) => {
    callback(event.detail);
  };
  
  window.addEventListener(`therapease:${eventName}`, handler as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener(`therapease:${eventName}`, handler as EventListener);
  };
};