'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, MapPin, LocateFixed } from 'lucide-react';
import type { Lesson, Course } from '@/lib/supabase/types';

// Leaflet must be imported dynamically (browser-only)
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

interface LessonFormProps {
  onSuccess: () => void;
  editLesson?: Lesson;
}

export default function LessonForm({ onSuccess, editLesson }: LessonFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState(editLesson?.course_id ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    editLesson?.scheduled_at
      ? new Date(editLesson.scheduled_at).toISOString().slice(0, 16)
      : ''
  );
  const [duration, setDuration] = useState(editLesson?.duration_minutes?.toString() ?? '90');
  const [locationName, setLocationName] = useState(editLesson?.location_name ?? '');
  const [lat, setLat] = useState(editLesson?.location_lat?.toString() ?? '');
  const [lng, setLng] = useState(editLesson?.location_lng?.toString() ?? '');

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    
    async function fetchCourses() {
      // 1. קבלת המוסד של המשתמש המחובר
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (profile?.school_id) {
        // 2. שליפת קורסים השייכים אך ורק למוסד הנוכחי (פדרמן)
        const { data } = await supabase
          .from('courses')
          .select('*, semesters(name)')
          .eq('school_id', profile.school_id)
          .order('name');
        
        setCourses(data ?? []);
      }
    }

    fetchCourses();
  }, [open]);

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    setLat(latitude.toFixed(6));
    setLng(longitude.toFixed(6));
  }, []);

  function handleLocateMe() {
    if (!navigator.geolocation) {
      toast.error('הדפדפן אינו תומך ב-GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        toast.success('מיקום נוכחי אותר');
      },
      () => toast.error('לא ניתן לקבל מיקום')
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      // 3. קבלת ה-school_id לצורך יצירת השיעור
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.school_id) throw new Error('לא נמצא שיוך מוסדי');

      const payload: any = {
        course_id: courseId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration),
        location_name: locationName,
        location_lat: lat ? parseFloat(lat) : null,
        location_lng: lng ? parseFloat(lng) : null,
        school_id: profile.school_id // הזרקת המוסד לכל שיעור חדש
      };

      const { error } = editLesson
        ? await supabase.from('lessons').update(payload).eq('id', editLesson.id)
        : await supabase.from('lessons').insert(payload);

      if (error) throw error;

      toast.success(editLesson ? 'השיעור עודכן' : 'השיעור נוצר בהצלחה בבית ספר פדרמן');
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error('שגיאה בשמירת השיעור: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const mapCenter: [number, number] = lat && lng
    ? [parseFloat(lat), parseFloat(lng)]
    : [31.7683, 35.2137]; // Default: Jerusalem

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="ml-2 h-4 w-4" />
          {editLesson ? 'ערוך שיעור' : 'שיעור חדש'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editLesson ? 'עריכת שיעור' : 'יצירת שיעור חדש'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>קורס</Label>
            <Select value={courseId} onValueChange={setCourseId} required>
              <SelectTrigger>
                <SelectValue placeholder="בחר קורס" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>תאריך ושעה</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>משך (דקות)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="30"
                max="300"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>שם המיקום</Label>
            <Input
              placeholder="בניין פדרמן, אולם 1"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>מיקום GPS של הכיתה</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleLocateMe}>
                <LocateFixed className="ml-1 h-3 w-3" />
                מיקום נוכחי
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">קו רוחב (Lat)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="31.7683"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">קו אורך (Lng)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="35.2137"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="rounded-lg overflow-hidden border h-64 mt-2">
              <MapPicker center={mapCenter} markerPos={lat && lng ? [parseFloat(lat), parseFloat(lng)] : undefined} onMapClick={handleMapClick} />
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              לחץ על המפה לסימון מיקום הכיתה המדויק
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              שמור שיעור
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}