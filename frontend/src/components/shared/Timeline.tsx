import React from 'react';
import { GrievanceLog, LogEventType } from '../../types';
import { LOG_EVENT_LABEL, formatDateTime } from '../../utils';

const EVENT_STYLE: Record<LogEventType, { icon: string; ring: string; bg: string }> = {
  [LogEventType.CREATED]:           { icon: '📝', ring: 'ring-blue-100',    bg: 'bg-blue-50'    },
  [LogEventType.STATUS_CHANGED]:    { icon: '🔄', ring: 'ring-indigo-100',  bg: 'bg-indigo-50'  },
  [LogEventType.ASSIGNED]:          { icon: '👤', ring: 'ring-purple-100',  bg: 'bg-purple-50'  },
  [LogEventType.REASSIGNED]:        { icon: '🔀', ring: 'ring-purple-100',  bg: 'bg-purple-50'  },
  [LogEventType.REMARK_ADDED]:      { icon: '💬', ring: 'ring-gray-100',    bg: 'bg-gray-50'    },
  [LogEventType.PHOTO_UPLOADED]:    { icon: '📷', ring: 'ring-teal-100',    bg: 'bg-teal-50'    },
  [LogEventType.SUPPORT_ADDED]:    { icon: '🤝', ring: 'ring-emerald-100', bg: 'bg-emerald-50'  },
  [LogEventType.SLA_BREACHED]:      { icon: '⚠️', ring: 'ring-red-100',     bg: 'bg-red-50'     },
  [LogEventType.ESCALATED]:         { icon: '🔺', ring: 'ring-orange-100',  bg: 'bg-orange-50'  },
  [LogEventType.FEEDBACK_SUBMITTED]:{ icon: '⭐', ring: 'ring-yellow-100',  bg: 'bg-yellow-50'  },
  [LogEventType.REOPENED]:          { icon: '🔓', ring: 'ring-orange-100',  bg: 'bg-orange-50'  },
  [LogEventType.CLOSED]:            { icon: '✅', ring: 'ring-emerald-100', bg: 'bg-emerald-50' },
};

export function Timeline({ logs }: { logs: GrievanceLog[] }) {
  if (!logs.length) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-sm text-gray-400">No activity yet</p>
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {logs.map((log, idx) => {
        const style = EVENT_STYLE[log.eventType] ?? EVENT_STYLE[LogEventType.REMARK_ADDED];
        return (
          <li key={log._id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-xl ring-2 ${style.ring} ${style.bg} flex items-center justify-center text-sm flex-shrink-0 mt-0.5`}>
                {style.icon}
              </div>
              {idx < logs.length - 1 && (
                <div className="w-px flex-1 bg-gray-100 my-1" />
              )}
            </div>
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800">
                  {LOG_EVENT_LABEL[log.eventType]}
                </p>
                <time className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  {formatDateTime(log.createdAt)}
                </time>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{log.description}</p>
              {log.actor && (
                <p className="text-xs text-gray-400 mt-1 font-medium">by {log.actor.name}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}