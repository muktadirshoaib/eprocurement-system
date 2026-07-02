import { Shell } from "@/components/layout/Shell";
import { useListUsers, useCreateUser, useUpdateUser, useDeactivateUser, useGetMe, getListUsersQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function AdminUsers() {
  const { data: currentUser } = useGetMe();
  const [, setLocation] = useLocation();
  const { data: users, isLoading } = useListUsers({
    query: { enabled: currentUser?.role === 'admin', queryKey: getListUsersQueryKey() }
  });
  
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deactivateMut = useDeactivateUser();
  const queryClient = useQueryClient();
  
  const [openCreate, setOpenCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setLocation("/dashboard");
    }
  }, [currentUser, setLocation]);

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "basic_user",
      department: "",
      approvalStage: "null"
    }
  });

  const editForm = useForm({
    defaultValues: {
      fullName: "",
      role: "basic_user",
      department: "",
      approvalStage: "null",
      isActive: true,
      password: ""
    }
  });

  // Keep create form role watched for conditional fields
  const createRole = form.watch("role");
  const editRole = editForm.watch("role");

  const onCreateSubmit = form.handleSubmit((data) => {
    const payload = {
      ...data,
      approvalStage: data.role === 'approver' && data.approvalStage !== "null" ? Number(data.approvalStage) : null
    };
    
    createMut.mutate({ data: payload }, {
      onSuccess: () => {
        setOpenCreate(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    });
  });

  const onEditSubmit = editForm.handleSubmit((data) => {
    if (!editingUser) return;
    
    const payload: any = {
      fullName: data.fullName,
      role: data.role,
      department: data.department,
      isActive: data.isActive,
      approvalStage: data.role === 'approver' && data.approvalStage !== "null" ? Number(data.approvalStage) : null
    };
    if (data.password) {
      payload.password = data.password;
    }
    
    updateMut.mutate({ id: editingUser.id, data: payload }, {
      onSuccess: () => {
        setEditingUser(null);
        editForm.reset();
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    });
  });

  const handleDeactivate = () => {
    if (!deactivateId) return;
    deactivateMut.mutate({ id: deactivateId }, {
      onSuccess: () => {
        setDeactivateId(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    });
  };

  const openEdit = (u: any) => {
    editForm.reset({
      fullName: u.fullName,
      role: u.role,
      department: u.department,
      approvalStage: u.approvalStage ? String(u.approvalStage) : "null",
      isActive: u.isActive,
      password: ""
    });
    setEditingUser(u);
  };

  if (currentUser?.role !== 'admin') return null;

  return (
    <Shell>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Configure roles, departments, and approval stages.</p>
        </div>
        
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="w-4 h-4 mr-2" /> Add User</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new employee to the system and set their access level.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreateSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input {...form.register("fullName", { required: true })} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input {...form.register("username", { required: true })} placeholder="jdoe" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input {...form.register("department", { required: true })} placeholder="e.g. IT, Finance" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" {...form.register("password", { required: true })} placeholder="Temp password" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Role</Label>
                  <Select value={createRole} onValueChange={(v) => form.setValue("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic_user">Basic User (Requester)</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                      <SelectItem value="admin">System Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createRole === 'approver' && (
                  <div className="space-y-2 col-span-2 p-4 bg-muted/30 border rounded-md">
                    <Label className="text-primary">Approval Stage Assignment</Label>
                    <Select value={form.watch("approvalStage")} onValueChange={(v) => form.setValue("approvalStage", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Stage 1: Department Head</SelectItem>
                        <SelectItem value="2">Stage 2: Budget Review</SelectItem>
                        <SelectItem value="3">Stage 3: Procurement</SelectItem>
                        <SelectItem value="4">Stage 4: Compliance</SelectItem>
                        <SelectItem value="5">Stage 5: Finance</SelectItem>
                        <SelectItem value="6">Stage 6: Director</SelectItem>
                        <SelectItem value="7">Stage 7: Final Sign-off</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">Which stage of the 7-step process does this user approve?</p>
                  </div>
                )}
              </div>
              <DialogFooter className="pt-4">
                <Button variant="ghost" type="button" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending}>Create User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-center">Stage</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : (
              users?.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{u.username}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'approver' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{u.department}</TableCell>
                  <TableCell className="text-center">
                    {u.approvalStage ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {u.approvalStage}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {u.isActive && u.id !== currentUser.id && (
                        <Button variant="ghost" size="icon" onClick={() => setDeactivateId(u.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Full Name</Label>
                <Input {...editForm.register("fullName", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input {...editForm.register("department", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.watch("isActive") ? "true" : "false"} onValueChange={(v) => editForm.setValue("isActive", v === "true")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => editForm.setValue("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic_user">Basic User (Requester)</SelectItem>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="admin">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === 'approver' && (
                <div className="space-y-2 col-span-2 p-4 bg-muted/30 border rounded-md">
                  <Label className="text-primary">Approval Stage</Label>
                  <Select value={editForm.watch("approvalStage")} onValueChange={(v) => editForm.setValue("approvalStage", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Stage 1: Department Head</SelectItem>
                      <SelectItem value="2">Stage 2: Budget Review</SelectItem>
                      <SelectItem value="3">Stage 3: Procurement</SelectItem>
                      <SelectItem value="4">Stage 4: Compliance</SelectItem>
                      <SelectItem value="5">Stage 5: Finance</SelectItem>
                      <SelectItem value="6">Stage 6: Director</SelectItem>
                      <SelectItem value="7">Stage 7: Final Sign-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 col-span-2 mt-4 pt-4 border-t">
                <Label>Reset Password (optional)</Label>
                <Input type="password" {...editForm.register("password")} placeholder="Leave blank to keep current password" />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="ghost" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMut.isPending}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm Dialog */}
      <Dialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this user? They will no longer be able to log in or approve requisitions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setDeactivateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateMut.isPending}>Deactivate User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
