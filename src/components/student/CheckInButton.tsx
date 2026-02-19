'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { isWithinRadius, haversineDistance } from '@/lib/geofencing';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { Lesson } from '@/lib/supabase/types';

interface CheckInButtonProps {
  lesson: Lesson;
}

type CheckInState = 'idle' | 'locating' | 'submitting' | 'success' | 'error';

export default function CheckInButton({ lesson }: CheckInButtonProps) {
  const { getPosition } = useGeolocation();
  const router = useRouter();
  const [state, setState] = useState<CheckInState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [distance, setDistance] = useState<number | null>(null);

  async function handleCheckIn() {
    // 1. בדיקה ששיעור משויך למיקום GPS
    if (!lesson.location_lat || !lesson.location_lng) {
      toast.error('לשיעור זה לא הוגדר מיקום GPS');
      return;
    }

    setState('locating');
    setErrorMessage('');

    let coords: GeolocationCoordinates;
    try {
      coords = await getPosition();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה בקבלת מיקום';
      setErrorMessage(msg);
      setState('error');
      return;
    }

    // 2. חישוב מרחק ואימות רדיוס (50 מטר)
    const dist = haversineDistance(
      coords.latitude,
      coords.longitude,
      lesson.location_lat,
      lesson.location_lng
    );
    setDistance(dist);

    const withinRange = isWithinRadius(
      coords.latitude,
      coords.longitude,
      lesson.location_lat,
      lesson.location_lng,
      50
    );

    if (!withinRange) {
      setErrorMessage(`אינך נמצא בטווח הכיתה (50 מטר). מרחק נוכחי: ${dist.toFixed(0)} מטר`);
      setState('error');
      return;
    }

    // 3. שליחת הנוכחות עם שיוך מוסדי
    setState('submitting');

    const res = await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: lesson.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        // הזרקת מזהה המוסד מהשיעור לרשומת הנוכחות
        schoolId: (lesson as any).school_id 
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErrorMessage(data.error ?? 'שגיאה ברישום הנוכחות');
      setState('error');
      return;
    }

    setState('success');
    toast.success('נוכחות נרשמה בהצלחה בבית ספר פדרמן! ✓');
    setTimeout(() => router.push('/student/dashboard'), 2000);
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="bg-green-100 p-4 rounded-full">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <p className="text-xl font-bold text-green-700">נרשמת בהצלחה!</p>
        <p className="text-gray-500 text-sm">מועבר לדף הבית...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">לא ניתן לרשום נוכחות</p>
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
            {distance != null && distance > 50 && (
              <p className="text-xs text-red-400 mt-2">
                טיפ: וודא שה-GPS מופעל ושאתה בתוך בניין פדרמן
              </p>
            )}
          </div>
        </div>
      )}

      <Button
        onClick={handleCheckIn}
        disabled={state === 'locating' || state === 'submitting'}
        className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all active:scale-95"
      >
        {state === 'locating' && (
          <>
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            מאתר מיקום GPS...
          </>
        )}
        {state === 'submitting' && (
          <>
            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
            רושם נוכחות...
          </>
        )}
        {(state === 'idle' || state === 'error') && (
          <>
            <MapPin className="ml-2 h-5 w-5" />
            ביצוע נוכחות (פדרמן)
          </>
        )}
      </Button>

      {(state === 'idle' || state === 'error') && (
        <p className="text-center text-xs text-gray-400 italic">
          המיקום מאומת מול רדיוס הכיתה (50 מטר)
        </p>
      )}
    </div>
  );
}