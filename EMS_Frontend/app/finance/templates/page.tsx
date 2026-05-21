"use client";

import { AxiosError } from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useFinanceTemplates } from "@/hooks/useFinance";
import type { FinanceTemplatePayload } from "@/services/finance.service";
import type { FinanceAccountCategory, FinanceFieldTemplate } from "@/types/finance";

const categories: FinanceAccountCategory[] = ["PERSONAL_BANK", "CORPORATE_BANK", "WALLET", "GATEWAY"];
const providers = ["KBANK", "SCB", "BBL", "KTB", "TRUEWALLET", "OPN", "2C2P", "GBPRIMEPAY", "CUSTOM"];
const categoryLabel: Record<FinanceAccountCategory, string> = {
  PERSONAL_BANK: "บัญชีธนาคารส่วนตัว",
  CORPORATE_BANK: "บัญชีธนาคารบริษัท",
  WALLET: "วอเลท",
  GATEWAY: "เกตเวย์",
};

export default function FinanceTemplatesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceFieldTemplate | null>(null);
  const { templatesQuery, createMutation, updateMutation, deleteMutation } = useFinanceTemplates();
  const templates = templatesQuery.data ?? [];

  async function saveTemplate(payload: FinanceTemplatePayload) {
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, payload });
      toast({ title: "บันทึก Template แล้ว", description: payload.name });
      return;
    }
    await createMutation.mutateAsync(payload);
    toast({ title: "สร้าง Template แล้ว", description: payload.name });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">ตั้งค่า Template</h1>
          <p className="mt-1 text-sm text-muted-foreground">กำหนดชุดหัวข้อข้อมูลแยกตามประเภทและผู้ให้บริการ</p>
        </div>
        <Button onClick={() => { setSelected(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          เพิ่ม Template
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Template บัญชีการเงิน</CardTitle>
          <CardDescription>{templates.length} รายการ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ Template</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>ผู้ให้บริการ</TableHead>
                <TableHead>หัวข้อข้อมูล</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-28 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesQuery.isLoading && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell></TableRow>}
              {!templatesQuery.isLoading && templates.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">ยังไม่มี Template</TableCell></TableRow>}
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{categoryLabel[template.category]}</TableCell>
                  <TableCell>{template.provider}</TableCell>
                  <TableCell>{template.fieldDefinitions.length}</TableCell>
                  <TableCell><Badge variant={template.isActive ? "secondary" : "outline"}>{template.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" aria-label="แก้ไข Template" onClick={() => { setSelected(template); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" aria-label="ปิด Template" onClick={() => deleteMutation.mutate(template.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <TemplateDialog open={open} template={selected} onOpenChange={setOpen} onSubmit={saveTemplate} />
    </DashboardShell>
  );
}

function TemplateDialog({ open, template, onOpenChange, onSubmit }: { open: boolean; template: FinanceFieldTemplate | null; onOpenChange: (open: boolean) => void; onSubmit: (payload: FinanceTemplatePayload) => Promise<void>; }) {
  const [category, setCategory] = useState<FinanceAccountCategory>("PERSONAL_BANK");
  const [provider, setProvider] = useState("KBANK");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory(template?.category ?? "PERSONAL_BANK");
    setProvider(template?.provider ?? "KBANK");
    setName(template?.name ?? "");
    setIsActive(template?.isActive ?? true);
    setError(null);
  }, [open, template]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSubmit({ category, provider, name, isActive });
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof AxiosError ? saveError.response?.data?.message || "บันทึกไม่สำเร็จ" : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? "แก้ไข Template" : "เพิ่ม Template"}</DialogTitle>
          <DialogDescription>Template จะถูกใช้โหลดหัวข้อข้อมูลอัตโนมัติเมื่อเพิ่มบัญชี</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="ชื่อ Template"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="ประเภท"><Select value={category} onChange={(event) => setCategory(event.target.value as FinanceAccountCategory)}>{categories.map((item) => <option key={item} value={item}>{categoryLabel[item]}</option>)}</Select></Field>
          <Field label="ผู้ให้บริการ"><Select value={provider} onChange={(event) => setProvider(event.target.value)}>{providers.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <label className="flex items-center gap-2 text-sm"><input className="h-4 w-4" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> ใช้งาน Template</label>
          {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-2">{children}</div></div>;
}
