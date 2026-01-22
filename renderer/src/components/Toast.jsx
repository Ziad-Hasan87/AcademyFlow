import { useState, useEffect } from 'react';
import { setToastCallback } from '../utils/toast';

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    setToastCallback((message, type) => {
      const id = nextId;
      setNextId(prev => prev + 1);
      
      setToasts(prev => [...prev, { id, message, type }]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, 3000);
    });
  }, [nextId]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#4caf50' : '#2196f3',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '250px',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease-out',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
