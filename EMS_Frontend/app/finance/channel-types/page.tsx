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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useFinanceChannelTypes } from "@/hooks/useFinance";
import type { FinanceChannelTypePayload } from "@/services/finance.service";
import type { FinanceChannelType, FinanceChannelTypeCode } from "@/types/finance";

const channelTypeCodes: FinanceChannelTypeCode[] = ["BANK", "TRUEWALLET", "GATEWAY"];

function getErrorMessage(error: unknown) {
  return error instanceof AxiosError ? error.response?.data?.message || error.message || "บันทึกไม่สำเร็จ" : "บันทึกไม่สำเร็จ";
}

export default function FinanceChannelTypesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceChannelType | null>(null);
  const { channelTypesQuery, createMutation, updateMutation, deleteMutation } = useFinanceChannelTypes();
  const channelTypes = channelTypesQuery.data ?? [];

  async function saveChannelType(payload: FinanceChannelTypePayload) {
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, payload });
      toast({ title: "บันทึกประเภทช่องทางแล้ว", description: payload.name });
      return;
    }
    await createMutation.mutateAsync(payload);
    toast({ title: "เพิ่มประเภทช่องทางแล้ว", description: payload.name });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">ประเภทช่องทาง</h1>
          <p className="mt-1 text-sm text-muted-foreground">จัดการ Channel Type สำหรับ Template บัญชีการเงิน</p>
        </div>
        <Button onClick={() => { setSelected(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          เพิ่มประเภทช่องทาง
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Channel Types</CardTitle>
          <CardDescription>{channelTypes.length} รายการ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-28 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelTypesQuery.isLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell></TableRow>}
              {!channelTypesQuery.isLoading && channelTypes.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ยังไม่มีประเภทช่องทาง</TableCell></TableRow>}
              {channelTypes.map((channelType) => (
                <TableRow key={channelType.id}>
                  <TableCell className="font-medium">{channelType.name}</TableCell>
                  <TableCell className="font-mono text-xs">{channelType.code}</TableCell>
                  <TableCell>{channelType.description || "-"}</TableCell>
                  <TableCell><Badge variant={channelType.isActive ? "secondary" : "outline"}>{channelType.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" aria-label="แก้ไขประเภทช่องทาง" onClick={() => { setSelected(channelType); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" aria-label="ปิดประเภทช่องทาง" onClick={() => deleteMutation.mutate(channelType.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ChannelTypeDialog open={open} channelType={selected} onOpenChange={setOpen} onSubmit={saveChannelType} />
    </DashboardShell>
  );
}

function ChannelTypeDialog({ open, channelType, onOpenChange, onSubmit }: { open: boolean; channelType: FinanceChannelType | null; onOpenChange: (open: boolean) => void; onSubmit: (payload: FinanceChannelTypePayload) => Promise<void>; }) {
  const [code, setCode] = useState<FinanceChannelTypeCode>("BANK");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCode(channelType?.code ?? "BANK");
    setName(channelType?.name ?? "");
    setDescription(channelType?.description ?? "");
    setIsActive(channelType?.isActive ?? true);
    setError(null);
  }, [channelType, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSubmit({ code, name, description: description || undefined, isActive });
      onOpenChange(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{channelType ? "แก้ไขประเภทช่องทาง" : "เพิ่มประเภทช่องทาง"}</DialogTitle>
          <DialogDescription>ใช้สำหรับจัดกลุ่มผู้ให้บริการใน Template</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Code"><Select value={code} onChange={(event) => setCode(event.target.value as FinanceChannelTypeCode)} disabled={Boolean(channelType)}>{channelTypeCodes.map((item) => <option key={item} value={item}>{item}</option>)}</Select></Field>
          <Field label="ชื่อ"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="คำอธิบาย"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input className="h-4 w-4" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> ใช้งาน</label>
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
