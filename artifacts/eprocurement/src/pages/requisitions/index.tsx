import { Shell } from "@/components/layout/Shell";
import { useListRequisitions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved': return <Badge variant="success">Approved</Badge>;
    case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
    case 'pending': return <Badge variant="warning">Pending</Badge>;
    default: return <Badge variant="secondary" className="capitalize">{status}</Badge>;
  }
}

export default function Requisitions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: requisitions, isLoading } = useListRequisitions(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const filtered = requisitions?.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) || 
    r.prfNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.creatorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requisitions</h1>
          <p className="text-muted-foreground mt-1">Manage and track all procurement requests.</p>
        </div>
        <Button asChild>
          <Link href="/requisitions/new">
            <PlusCircle className="mr-2" /> New Request
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm flex flex-col">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PRF, Title, Requester..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-24">PRF No.</TableHead>
              <TableHead>Title & Requester</TableHead>
              <TableHead className="w-32">Department</TableHead>
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="w-24 text-right">Amount</TableHead>
              <TableHead className="w-24 text-center">Stage</TableHead>
              <TableHead className="w-24 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">Loading records...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">No requisitions found.</TableCell>
              </TableRow>
            ) : (
              filtered?.map((req) => (
                <TableRow key={req.id} className="group cursor-pointer">
                  <TableCell className="font-mono font-medium text-xs">
                    <Link href={`/requisitions/${req.id}`} className="absolute inset-0" />
                    {req.prfNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      {req.title}
                      {req.isUrgent && <Badge variant="destructive" className="h-4 px-1 text-[9px]">URGENT</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{req.creatorName}</div>
                  </TableCell>
                  <TableCell className="text-xs">{req.department}</TableCell>
                  <TableCell className="text-xs font-mono">{formatDate(req.createdAt).split(',')[0]}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(req.totalAmount)}</TableCell>
                  <TableCell className="text-center">
                    {req.currentStage ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-bold font-mono">
                        {req.currentStage}
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={req.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Shell>
  );
}
