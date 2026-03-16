import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const activities = [
  { id: 1, project: "Riyadh Metro", action: "Drawing Approved", user: "Sarah K.", time: "10 mins ago", status: "success" },
  { id: 2, project: "Jeddah Tower", action: "Site Inspection Report", user: "Mohammed A.", time: "1 hour ago", status: "pending" },
  { id: 3, project: "NEOM Infrastructure", action: "Contract Signed", user: "Ahmed S.", time: "3 hours ago", status: "success" },
  { id: 4, project: "King Salman Park", action: "Material Request", user: "Omar F.", time: "5 hours ago", status: "pending" },
  { id: 5, project: "Red Sea Airport", action: "HSE Incident Logged", user: "Faisal R.", time: "1 day ago", status: "destructive" },
];

export function ProjectActivity() {
  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-[200px]">Project</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((activity) => (
            <TableRow key={activity.id} className="border-border/50 transition-colors hover:bg-muted/50">
              <TableCell className="font-medium">{activity.project}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={activity.status as any} className="text-xs font-normal">
                    {activity.status === 'success' ? 'Completed' : activity.status === 'pending' ? 'In Progress' : 'Alert'}
                  </Badge>
                  <span className="text-sm">{activity.action}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{activity.user}</TableCell>
              <TableCell className="text-right text-muted-foreground">{activity.time}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}