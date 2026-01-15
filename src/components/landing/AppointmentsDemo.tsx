import React, { useState, useEffect } from 'react';
import { Stethoscope, Eye, Smile, Bell, MapPin, Clock } from 'lucide-react';

const appointments = [
  { 
    type: 'GP', 
    icon: Stethoscope, 
    title: 'GP Check-up', 
    date: 'Today',
    time: '10:30 AM',
    location: 'Health Centre',
    color: 'bg-blue-500'
  },
  { 
    type: 'Eye', 
    icon: Eye, 
    title: 'Eye Test', 
    date: 'Tomorrow',
    time: '2:00 PM',
    location: 'Opticians',
    color: 'bg-purple-500'
  },
  { 
    type: 'Dental', 
    icon: Smile, 
    title: 'Dental Check', 
    date: 'Friday',
    time: '9:15 AM',
    location: 'Dental Practice',
    color: 'bg-green-500'
  },
];

const AppointmentsDemo = () => {
  const [visibleAppointments, setVisibleAppointments] = useState<number[]>([]);
  const [reminderPulse, setReminderPulse] = useState(false);

  useEffect(() => {
    const appointmentTimer = setInterval(() => {
      setVisibleAppointments(prev => {
        if (prev.length >= appointments.length) {
          return [];
        }
        return [...prev, prev.length];
      });
    }, 1100);

    const pulseTimer = setInterval(() => {
      setReminderPulse(prev => !prev);
    }, 1500);

    return () => {
      clearInterval(appointmentTimer);
      clearInterval(pulseTimer);
    };
  }, []);

  return (
    <div className="space-y-2">
      {appointments.map((apt, index) => {
        const Icon = apt.icon;
        const isVisible = visibleAppointments.includes(index);
        const isToday = apt.date === 'Today';

        return (
          <div
            key={index}
            className={`p-2.5 rounded-lg bg-background border transition-all duration-500 ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-30 scale-95'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className={`p-1.5 rounded-md ${apt.color} text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{apt.title}</span>
                  {isToday && isVisible && (
                    <Bell className={`h-3.5 w-3.5 text-amber-500 transition-transform duration-300 ${
                      reminderPulse ? 'scale-110' : 'scale-100'
                    }`} />
                  )}
                </div>
                {isVisible && (
                  <div className="animate-fade-in">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.date}, {apt.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {apt.location}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AppointmentsDemo;
