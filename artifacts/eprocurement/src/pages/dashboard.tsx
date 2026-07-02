import { Shell } from "@/components/layout/Shell";
import { 
  useGetDashboardStats, 
  useGetRecentRequisitions, 
  useGetPendingApprovals,
  useGetStageBreakdown,
  useGetMe,
  getGetPendingApprovalsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

function StatCard({ title, value, label, valueClass = "" }: { title: string, value: string | number, label?: string, valueClass?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold font-mono ${valueClass}`}>{value}</div>
        {label && <p className="text-xs text-muted-foreground mt-1">{label}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved': return <Badge variant="success">Approved</Badge>;
    case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
    case 'pending': return <Badge variant="warning">Pending</Badge>;
    default: return <Badge variant="secondary" className="capitalize">{status}</Badge>;
  }
}

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: stats } = useGetDashboardStats();
  const { data: recentReqs } = useGetRecentRequisitions();
  const { data: stageBreakdown } = useGetStageBreakdown();
  
  // Only approvers and admins have meaningful pending approvals to action
  const { data: pendingApprovals } = useGetPendingApprovals({
    query: {
      enabled: user?.role === 'approver' || user?.role === 'admin',
      queryKey: getGetPendingApprovalsQueryKey(),
    }
  });

  return (
    <Shell>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of procurement activities.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Spends" value={stats ? formatCurrency(stats.totalAmount) : "$0.00"} valueClass="text-primary" />
        <StatCard title="All Reqs" value={stats?.total || 0} />
        <StatCard title="Pending" value={stats?.pending || 0} valueClass="text-amber-600" />
        <StatCard title="Approved" value={stats?.approved || 0} valueClass="text-emerald-600" />
        <StatCard title="Rejected" value={stats?.rejected || 0} valueClass="text-red-600" />
        <StatCard title="Drafts" value={stats?.draft || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          <Card className="flex flex-col h-[400px]">
            <CardHeader>
              <CardTitle>Approval Stages Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {stageBreakdown && stageBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" />
                    <YAxis dataKey="stageName" type="category" width={100} tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} />
                    <Tooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{ borderRadius: '6px', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stageBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No pipeline data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Requisitions</CardTitle>
              <Link href="/requisitions" className="text-sm font-medium text-primary hover:underline">View All</Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentReqs?.map(req => (
                  <Link key={req.id} href={`/requisitions/${req.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold">{req.prfNumber}</span>
                        <span className="font-medium">{req.title}</span>
                        {req.isUrgent && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">URGENT</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span>{req.creatorName}</span>
                        <span>•</span>
                        <span>{req.department}</span>
                        <span>•</span>
                        <span>{formatDate(req.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-medium">{formatCurrency(req.totalAmount)}</div>
                      <div className="mt-1"><StatusBadge status={req.status} /></div>
                    </div>
                  </Link>
                ))}
                {recentReqs?.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">No recent requisitions found.</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          
          {(user?.role === 'approver' || user?.role === 'admin') && (
            <Card className="border-amber-200 dark:border-amber-900/50 shadow-md">
              <CardHeader className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/50 pb-4">
                <CardTitle className="text-amber-900 dark:text-amber-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Action Required
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-amber-100 dark:divide-amber-900/50">
                  {pendingApprovals?.map(req => (
                    <Link key={req.id} href={`/requisitions/${req.id}`} className="block p-4 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">{req.prfNumber}</span>
                        <span className="font-mono text-sm font-semibold">{formatCurrency(req.totalAmount)}</span>
                      </div>
                      <div className="font-medium text-sm line-clamp-1">{req.title}</div>
                      <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                        <span>{req.department}</span>
                        <span>Stage {req.currentStage}</span>
                      </div>
                    </Link>
                  ))}
                  {pendingApprovals?.length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Your queue is empty.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </Shell>
  );
}
