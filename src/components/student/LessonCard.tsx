'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, CheckCircle, ChevronLeft } from 'lucide-react';
import type { Lesson, Attendance } from '@/lib/supabase/types';

interface LessonCardProps {
  lesson: Lesson & { courses?: { name: string; code: string } };
  attendance?: Attendance;
}

export default function LessonCard({ lesson, attendance }: LessonCardProps) {
  const now = new Date();
  const start = new Date(lesson.scheduled_at);
  const end = new Date(start.getTime() + lesson.duration_minutes * 60000);
  const isActive = now >= start && now <= end;
  const isPast = now > end;
  const isFuture = now < start;

  return (
    <Card className={`${isActive ? 'border-green-400 shadow-md' : ''} ${isPast && !attendance ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold">{lesson.courses?.name}</p>
              <Badge variant="outline" className="text-xs">{lesson.courses?.code}</Badge>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  {' — '}
                  {end.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {lesson.location_name && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{lesson.location_name}</span>
                </div>
              )}
            </div>

            {/* Status badges */}
            <div className="flex gap-2 mt-2">
              {isActive && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs animate-pulse">
                  פעיל עכשיו
                </Badge>
              )}
              {isFuture && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                  מתוכנן
                </Badge>
              )}
              {isPast && !attendance && (
                <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">
                  הסתיים
                </Badge>
              )}
              {attendance && (
                <Badge className={`text-xs hover:${attendance.status === 'present' ? 'bg-green-100' : 'bg-amber-100'} ${attendance.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  <CheckCircle className="h-3 w-3 ml-1" />
                  {attendance.status === 'present' ? 'נרשמת' : 'נרשמת (איחור)'}
                </Badge>
              )}
            </div>
          </div>

          {/* Check-in button */}
          {isActive && !attendance && lesson.location_lat && (
            <Link href={`/student/checkin/${lesson.id}`}>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
                רישום
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </Link>
          )}
          {isActive && !attendance && !lesson.location_lat && (
            <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs shrink-0">
              אין GPS
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
