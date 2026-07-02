import { Shell } from "@/components/layout/Shell";
import { useGetRequisition, useSubmitRequisition, useApproveRequisition, useRejectRequisition, useGetMe, getGetRequisitionQueryKey, getListRequisitionsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

const STAGES = [
  "Department Head",
  "Budget Review",
  "Procurement",
  "Compliance",
  "Finance",
  "Director",
  "Final Sign-off"
];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved': return <Badge variant="success" className="text-sm px-3 py-1">Approved</Badge>;
    case 'rejected': return <Badge variant="destructive" className="text-sm px-3 py-1">Rejected</Badge>;
    case 'pending': return <Badge variant="warning" className="text-sm px-3 py-1 animate-pulse">Pending Review</Badge>;
    default: return <Badge variant="secondary" className="capitalize text-sm px-3 py-1">{status}</Badge>;
  }
}

export default function RequisitionDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  
  const { data: req, isLoading } = useGetRequisition(numId, {
    query: { enabled: !!numId, queryKey: getGetRequisitionQueryKey(numId) }
  });

  const submitMut = useSubmitRequisition();
  const approveMut = useApproveRequisition();
  const rejectMut = useRejectRequisition();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: getGetRequisitionQueryKey(numId) });
    queryClient.invalidateQueries({ queryKey: getListRequisitionsQueryKey() });
  };

  if (isLoading || !req || !user) {
    return <Shell><div className="text-muted-foreground p-8">Loading detail...</div></Shell>;
  }

  const isCreator = req.creatorId === user.id;
  const isAdmin = user.role === 'admin';
  const isApproverAtCurrentStage = user.role === 'approver' && user.approvalStage === req.currentStage;
  
  const canSubmit = req.status === 'draft' && (isCreator || isAdmin);
  const canApproveReject = req.status === 'pending' && (isApproverAtCurrentStage || isAdmin);

  const handleSubmit = () => {
    submitMut.mutate({ id: numId }, { onSuccess: invalidateData });
  };

  const handleApprove = () => {
    approveMut.mutate({ id: numId, data: { comments: "Approved." } }, { onSuccess: invalidateData });
  };

  const handleReject = () => {
    rejectMut.mutate({ id: numId, data: { comments: rejectComment } }, { 
      onSuccess: () => {
        setRejectOpen(false);
        setRejectComment("");
        invalidateData();
      }
    });
  };

  return (
    <Shell>
      <div className="mb-6">
        <Link href="/requisitions" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Requisitions
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{req.title}</h1>
              {req.isUrgent && <Badge variant="destructive">URGENT</Badge>}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span className="bg-muted px-2 py-0.5 rounded text-foreground font-bold">{req.prfNumber}</span>
              <span>Requested {formatDate(req.createdAt)}</span>
              <span>by {req.creatorName} ({req.department})</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <StatusBadge status={req.status} />
            {canSubmit && (
              <Button onClick={handleSubmit} disabled={submitMut.isPending} className="w-full">
                {submitMut.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            {canApproveReject && (
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={approveMut.isPending}>
                  Approve Stage {req.currentStage}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Justification & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                <p className="text-sm leading-relaxed">{req.description || "No description provided."}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-md border border-border/50">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Business Justification
                </h4>
                <p className="text-sm leading-relaxed italic text-muted-foreground">"{req.justification}"</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <div className="text-xl font-bold font-mono text-primary">{formatCurrency(req.totalAmount)}</div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {req.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                      <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Approval Workflow */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Chain</CardTitle>
              <CardDescription>7-Stage enterprise workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted ml-3 space-y-6 pb-2">
                {STAGES.map((stageName, idx) => {
                  const stageNum = idx + 1;
                  const record = req.approvalHistory.find(h => h.stage === stageNum);
                  const isCurrent = req.status === 'pending' && req.currentStage === stageNum;
                  const isFuture = req.status === 'pending' && (req.currentStage || 1) < stageNum;
                  const isDraft = req.status === 'draft';
                  
                  let icon = <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center -ml-[13px] z-10 relative mt-0.5 text-[10px] font-bold text-muted-foreground">{stageNum}</div>;
                  let contentClass = "text-muted-foreground";
                  
                  if (record) {
                    if (record.action === 'approved') {
                      icon = <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-background rounded-full -ml-[13px] z-10 relative mt-0.5" />;
                      contentClass = "text-foreground";
                    } else if (record.action === 'rejected') {
                      icon = <XCircle className="w-6 h-6 text-destructive bg-background rounded-full -ml-[13px] z-10 relative mt-0.5" />;
                      contentClass = "text-destructive font-medium";
                    }
                  } else if (isCurrent) {
                    icon = <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-background shadow-[0_0_0_2px_rgba(245,158,11,0.2)] flex items-center justify-center -ml-[13px] z-10 relative mt-0.5"><Clock className="w-3 h-3 text-white" /></div>;
                    contentClass = "text-amber-600 font-bold";
                  }

                  return (
                    <div key={stageNum} className="pl-6 relative">
                      <div className="absolute left-0 top-0">{icon}</div>
                      <div className={`text-sm ${contentClass}`}>
                        {stageNum}. {stageName}
                      </div>
                      {record && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded border mt-2">
                          <div className="font-semibold">{record.approverName}</div>
                          <div className="text-[10px] opacity-70 mb-1">{formatDate(record.createdAt)}</div>
                          {record.comments && <div className="italic text-foreground/80">"{record.comments}"</div>}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="mt-1 text-xs text-amber-600/80 font-medium">Awaiting review...</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>
              You must provide a reason for rejecting this request. It will be returned to the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Comment</Label>
              <Textarea 
                value={rejectComment} 
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="State the reason for rejection..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectComment.trim() || rejectMut.isPending}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
