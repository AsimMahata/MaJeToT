import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SectionCardProps {
  section: {
    id: string;
    title: string;
    color: string;
    topics?: Array<{ id: string; label: string }>;
    lectures?: { label: string; total: number };
  };
  topicsCompleted: number;
  lecturesDone: number;
}

export default function SectionCard({ section, topicsCompleted, lecturesDone }: SectionCardProps) {
  const navigate = useNavigate();
  const totalTopics = section.topics?.length || 0;
  const totalLectures = section.lectures?.total || 0;

  let overallPct = 0;
  let parts = 0;
  if (totalTopics > 0) { overallPct += (topicsCompleted / totalTopics) * 100; parts++; }
  if (totalLectures > 0) { overallPct += (lecturesDone / totalLectures) * 100; parts++; }
  if (parts > 0) overallPct /= parts;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group overflow-hidden"
      onClick={() => navigate(`/section/${section.id}`)}
    >
      <div className="flex">
        <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: section.color }} />
        <CardContent className="p-5 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
              {section.title}
            </h3>
            <span className="text-sm font-bold ml-2 shrink-0" style={{ color: section.color }}>
              {Math.round(overallPct)}%
            </span>
          </div>

          {totalTopics > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Topics</span>
                <span>{topicsCompleted} / {totalTopics}</span>
              </div>
              <Progress
                value={(topicsCompleted / totalTopics) * 100}
                indicatorColor={section.color}
                className="h-2"
              />
            </div>
          )}

          {totalLectures > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{section.lectures!.label}</span>
                <span>{lecturesDone} / {totalLectures}</span>
              </div>
              <Progress
                value={(lecturesDone / totalLectures) * 100}
                indicatorColor={section.color}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
