import { getInitials, timeAgo } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityEntry {
  _id: string;
  userName: string;
  avatarColor: string;
  aiMessage: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-1">📭 No activity yet</p>
        <p className="text-sm">Start tracking your progress to see updates here</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-2">
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <div
            key={activity._id}
            className={`flex gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors ${i === 0 ? 'activity-enter' : ''}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5"
              style={{ backgroundColor: activity.avatarColor }}
            >
              {getInitials(activity.userName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm">{activity.userName}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(activity.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activity.aiMessage}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
