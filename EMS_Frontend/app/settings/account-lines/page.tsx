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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAccountLines } from "@/hooks/useFinance";
import type { AccountLinePayload } from "@/services/finance.service";
import type { AccountLine } from "@/types/finance";

export default function AccountLinesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AccountLine | null>(null);
  const { accountLinesQuery, createMutation, updateMutation, deleteMutation } = useAccountLines();
  const accountLines = accountLinesQuery.data ?? [];

  async function saveAccountLine(payload: AccountLinePayload) {
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, payload });
      toast({ title: "บันทึกสายบัญชีแล้ว", description: payload.name });
      return;
    }
    await createMutation.mutateAsync(payload);
    toast({ title: "เพิ่มสายบัญชีแล้ว", description: payload.name });
  }

  async function deactivateAccountLine(accountLine: AccountLine) {
    await deleteMutation.mutateAsync(accountLine.id);
    toast({ title: "ปิดใช้งานสายบัญชีแล้ว", description: accountLine.name });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">สายบัญชี</h1>
          <p className="mt-1 text-sm text-muted-foreground">บัญชีนี้มาจากใคร และใครดูแลบัญชี</p>
        </div>
        <Button onClick={() => { setSelected(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          เพิ่มสายบัญชี
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการสายบัญชี</CardTitle>
          <CardDescription>{accountLines.length} รายการ</CardDescription>
        </CardHeader>
        <CardContent>
          {accountLinesQuery.isError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">โหลดข้อมูลสายบัญชีไม่สำเร็จ</div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อสายบัญชี</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>รายละเอียด</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-28 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountLinesQuery.isLoading && (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell></TableRow>
              )}
              {!accountLinesQuery.isLoading && accountLines.length === 0 && (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">ยังไม่มีสายบัญชี</TableCell></TableRow>
              )}
              {accountLines.map((accountLine) => (
                <TableRow key={accountLine.id}>
                  <TableCell className="font-medium">{accountLine.name}</TableCell>
                  <TableCell className="font-mono text-xs">{accountLine.code}</TableCell>
                  <TableCell>{accountLine.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={accountLine.isActive ? "secondary" : "outline"}>
                      {accountLine.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" aria-label="แก้ไขสายบัญชี" onClick={() => { setSelected(accountLine); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline" aria-label="ปิดใช้งานสายบัญชี" onClick={() => deactivateAccountLine(accountLine)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AccountLineDialog open={open} accountLine={selected} onOpenChange={setOpen} onSubmit={saveAccountLine} />
    </DashboardShell>
  );
}

function AccountLineDialog({
  open,
  accountLine,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  accountLine: AccountLine | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: AccountLinePayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(accountLine?.name ?? "");
    setCode(accountLine?.code ?? "");
    setDescription(accountLine?.description ?? "");
    setIsActive(accountLine?.isActive ?? true);
    setError(null);
  }, [accountLine, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !code.trim()) {
      setError("กรุณาระบุชื่อสายบัญชีและรหัส");
      return;
    }
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        isActive,
      });
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof AxiosError ? saveError.response?.data?.message || "บันทึกไม่สำเร็จ" : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{accountLine ? "แก้ไขสายบัญชี" : "เพิ่มสายบัญชี"}</DialogTitle>
          <DialogDescription>กำหนดสายบัญชีสำหรับเลือกในหน้าบัญชีการเงิน</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อสายบัญชี">
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field label="รหัส">
              <Input value={code} onChange={(event) => setCode(event.target.value)} required />
            </Field>
          </div>
          <Field label="รายละเอียด">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input className="h-4 w-4" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            ใช้งาน
          </label>
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
