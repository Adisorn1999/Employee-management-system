"use client";

import { AxiosError } from "axios";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import { useFinanceChannelTypes, useFinanceProviders } from "@/hooks/useFinance";
import type { FinanceProviderPayload } from "@/services/finance.service";
import type { FinanceChannelType, FinanceProvider } from "@/types/finance";

function getErrorMessage(error: unknown) {
  return error instanceof AxiosError ? error.response?.data?.message || error.message || "บันทึกไม่สำเร็จ" : "บันทึกไม่สำเร็จ";
}

export default function FinanceProvidersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceProvider | null>(null);
  const [channelTypeFilter, setChannelTypeFilter] = useState("");
  const providerParams = useMemo(() => ({ channelTypeId: channelTypeFilter || undefined }), [channelTypeFilter]);
  const { channelTypesQuery } = useFinanceChannelTypes();
  const { providersQuery, createMutation, updateMutation, deleteMutation } = useFinanceProviders(providerParams);
  const channelTypes = channelTypesQuery.data ?? [];
  const providers = providersQuery.data ?? [];

  async function saveProvider(payload: FinanceProviderPayload) {
    if (selected) {
      await updateMutation.mutateAsync({
        id: selected.id,
        payload: {
          code: payload.code,
          name: payload.name,
          description: payload.description,
          isActive: payload.isActive,
        },
      });
      toast({ title: "บันทึกผู้ให้บริการแล้ว", description: payload.name });
      return;
    }
    await createMutation.mutateAsync(payload);
    toast({ title: "เพิ่มผู้ให้บริการแล้ว", description: payload.name });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">ผู้ให้บริการ</h1>
          <p className="mt-1 text-sm text-muted-foreground">จัดการ Provider และผูกกับประเภทช่องทาง</p>
        </div>
        <Button onClick={() => { setSelected(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          เพิ่มผู้ให้บริการ
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
          <CardDescription>{providers.length} รายการ</CardDescription>
          <div className="pt-3">
            <Select className="md:w-80" value={channelTypeFilter} onChange={(event) => setChannelTypeFilter(event.target.value)}>
              <option value="">ทุกประเภทช่องทาง</option>
              {channelTypes.map((channelType) => <option key={channelType.id} value={channelType.id}>{channelType.name}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>ประเภทช่องทาง</TableHead>
                <TableHead>คำอธิบาย</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-28 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providersQuery.isLoading && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell></TableRow>}
              {!providersQuery.isLoading && providers.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">ยังไม่มีผู้ให้บริการ</TableCell></TableRow>}
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell className="font-mono text-xs">{provider.code}</TableCell>
                  <TableCell>{provider.channelType?.name || "-"}</TableCell>
                  <TableCell>{provider.description || "-"}</TableCell>
                  <TableCell><Badge variant={provider.isActive ? "secondary" : "outline"}>{provider.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" aria-label="แก้ไขผู้ให้บริการ" onClick={() => { setSelected(provider); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" aria-label="ปิดผู้ให้บริการ" onClick={() => deleteMutation.mutate(provider.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ProviderDialog open={open} provider={selected} channelTypes={channelTypes} onOpenChange={setOpen} onSubmit={saveProvider} />
    </DashboardShell>
  );
}

function ProviderDialog({ open, provider, channelTypes, onOpenChange, onSubmit }: { open: boolean; provider: FinanceProvider | null; channelTypes: FinanceChannelType[]; onOpenChange: (open: boolean) => void; onSubmit: (payload: FinanceProviderPayload) => Promise<void>; }) {
  const [channelTypeId, setChannelTypeId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChannelTypeId(provider?.channelTypeId ?? channelTypes.find((channelType) => channelType.isActive)?.id ?? "");
    setCode(provider?.code ?? "");
    setName(provider?.name ?? "");
    setDescription(provider?.description ?? "");
    setIsActive(provider?.isActive ?? true);
    setError(null);
  }, [channelTypes, open, provider]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelTypeId) {
      setError("กรุณาเลือกประเภทช่องทาง");
      return;
    }
    try {
      await onSubmit({ channelTypeId, code, name, description: description || undefined, isActive });
      onOpenChange(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{provider ? "แก้ไขผู้ให้บริการ" : "เพิ่มผู้ให้บริการ"}</DialogTitle>
          <DialogDescription>Provider จะถูกใช้ใน Template dropdown ตามประเภทช่องทาง</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="ประเภทช่องทาง">
            <Select value={channelTypeId} onChange={(event) => setChannelTypeId(event.target.value)} disabled={Boolean(provider)} required>
              {channelTypes.filter((channelType) => channelType.isActive || channelType.id === channelTypeId).map((channelType) => (
                <option key={channelType.id} value={channelType.id}>{channelType.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code"><Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required disabled={Boolean(provider)} /></Field>
            <Field label="ชื่อ"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          </div>
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
