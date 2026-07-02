import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFieldArray, useForm } from "react-hook-form";
import { Trash2, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCreateRequisition } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type LineItemForm = {
  description: string;
  quantity: number;
  unitPrice: number;
  category: string;
};

type FormValues = {
  title: string;
  description: string;
  department: string;
  isUrgent: boolean;
  justification: string;
  lineItems: LineItemForm[];
};

export default function NewRequisition() {
  const [, setLocation] = useLocation();
  const createReq = useCreateRequisition();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      department: "",
      isUrgent: false,
      justification: "",
      lineItems: [
        { description: "", quantity: 1, unitPrice: 0, category: "Office Supplies" }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems"
  });

  const lineItems = form.watch("lineItems");
  const totalAmount = lineItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);

  const onSubmit = form.handleSubmit((data) => {
    // Coerce numbers
    const payload = {
      ...data,
      lineItems: data.lineItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice)
      }))
    };

    createReq.mutate({ data: payload }, {
      onSuccess: (res) => {
        toast({ title: "Draft saved", description: "Requisition drafted successfully." });
        setLocation(`/requisitions/${res.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create requisition.", variant: "destructive" });
      }
    });
  });

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">New Requisition</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                <Input id="title" {...form.register("title", { required: true })} placeholder="e.g. Q3 Software Licenses" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                <Input id="department" {...form.register("department", { required: true })} placeholder="e.g. IT, HR, Finance" />
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2 h-9">
                  <Checkbox 
                    id="isUrgent" 
                    checked={form.watch("isUrgent")} 
                    onCheckedChange={(checked) => form.setValue("isUrgent", checked as boolean)} 
                  />
                  <Label htmlFor="isUrgent" className="text-destructive font-semibold cursor-pointer">Mark as Urgent</Label>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...form.register("description")} placeholder="Briefly describe the purchase..." />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="justification">Business Justification <span className="text-destructive">*</span></Label>
                <Textarea id="justification" {...form.register("justification", { required: true })} placeholder="Why is this purchase necessary right now?" className="min-h-[100px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <div className="text-sm font-semibold">
              Grand Total: <span className="font-mono text-primary text-lg ml-2">{formatCurrency(totalAmount)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header row for larger screens */}
              <div className="hidden md:grid grid-cols-12 gap-4 pb-2 border-b text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Description</div>
                <div className="col-span-3">Category</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Unit Price</div>
                <div className="col-span-1 text-center">Del</div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-muted/20 p-4 md:p-0 md:bg-transparent rounded-md border md:border-none">
                  <div className="col-span-1 md:col-span-4 space-y-2 md:space-y-0">
                    <Label className="md:hidden text-xs">Description</Label>
                    <Input {...form.register(`lineItems.${index}.description`, { required: true })} placeholder="Item description" />
                  </div>
                  <div className="col-span-1 md:col-span-3 space-y-2 md:space-y-0">
                    <Label className="md:hidden text-xs">Category</Label>
                    <Select 
                      value={form.watch(`lineItems.${index}.category`)} 
                      onValueChange={(val) => form.setValue(`lineItems.${index}.category`, val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                        <SelectItem value="IT Equipment">IT Equipment</SelectItem>
                        <SelectItem value="Services">Services</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2 md:space-y-0">
                    <Label className="md:hidden text-xs">Quantity</Label>
                    <Input type="number" min="1" step="1" {...form.register(`lineItems.${index}.quantity`)} className="text-right font-mono" />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2 md:space-y-0 relative">
                    <Label className="md:hidden text-xs">Unit Price</Label>
                    <span className="absolute left-3 top-2.5 text-muted-foreground hidden md:block">$</span>
                    <Input type="number" min="0" step="0.01" {...form.register(`lineItems.${index}.unitPrice`)} className="text-right font-mono md:pl-7" />
                  </div>
                  <div className="col-span-1 flex justify-end md:justify-center mt-2 md:mt-0">
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={() => append({ description: "", quantity: 1, unitPrice: 0, category: "Office Supplies" })} className="mt-4 border-dashed border-2">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button type="button" variant="ghost" onClick={() => setLocation("/requisitions")}>Cancel</Button>
          <Button type="submit" disabled={createReq.isPending}>Save as Draft</Button>
        </div>
      </form>
    </Shell>
  );
}
