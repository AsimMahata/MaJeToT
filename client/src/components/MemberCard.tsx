import { getInitials } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Flame } from 'lucide-react';

interface MemberCardProps {
  member: {
    _id: string;
    name: string;
    avatarColor: string;
    currentStreak: number;
  };
  progressPct: number;
  onClick?: () => void;
}

export default function MemberCard({ member, progressPct, onClick }: MemberCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-md"
        style={{ backgroundColor: member.avatarColor }}
      >
        {getInitials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{member.name}</span>
          {member.currentStreak > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0">
              <Flame className="w-3 h-3" />
              {member.currentStreak}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">{Math.round(progressPct)}%</span>
        </div>
      </div>
    </div>
  );
}
