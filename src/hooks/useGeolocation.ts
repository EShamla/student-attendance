'use client';

import { useState, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
  });

  const getPosition = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('הדפדפן שלך אינו תומך ב-GPS'));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
            loading: false,
          });
          resolve(position.coords);
        },
        (error) => {
          let message: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'יש לאשר גישה למיקום בהגדרות המכשיר';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'לא ניתן לקבל מיקום. נסה שוב';
              break;
            case error.TIMEOUT:
              message = 'הבקשה לקבלת מיקום פגה. נסה שוב';
              break;
            default:
              message = 'שגיאה לא ידועה בקבלת מיקום';
          }
          setState((prev) => ({ ...prev, error: message, loading: false }));
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { ...state, getPosition };
}
