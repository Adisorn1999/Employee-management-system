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
import { useToast } from "@/components/ui/toast";
import { useFinanceChannelTypes, useFinanceProviders, useFinanceTemplates } from "@/hooks/useFinance";
import type { FinanceTemplatePayload } from "@/services/finance.service";
import type { FinanceChannelType, FinanceFieldTemplate, FinanceProvider } from "@/types/finance";

function providerLabel(provider?: FinanceProvider | null, fallback?: string) {
  if (!provider) return fallback || "-";
  return `${provider.name} (${provider.code})`;
}

function templateChannelType(template?: FinanceFieldTemplate | null) {
  if (!template) return null;
  return template.channelType ?? template.providerRecord?.channelType ?? null;
}

export default function FinanceTemplatesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceFieldTemplate | null>(null);
  const [channelTypeFilter, setChannelTypeFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const templateParams = useMemo(
    () => ({
      channelTypeId: channelTypeFilter || undefined,
      providerId: providerFilter || undefined,
    }),
    [channelTypeFilter, providerFilter]
  );
  const providerParams = useMemo(
    () => ({
      channelTypeId: channelTypeFilter || undefined,
    }),
    [channelTypeFilter]
  );
  const { channelTypesQuery } = useFinanceChannelTypes();
  const { providersQuery } = useFinanceProviders(providerParams);
  const { providersQuery: activeProvidersQuery } = useFinanceProviders({ isActive: "true" });
  const { templatesQuery, createMutation, updateMutation, deleteMutation } = useFinanceTemplates(templateParams);
  const channelTypes = channelTypesQuery.data ?? [];
  const providers = providersQuery.data ?? [];
  const activeProviders = activeProvidersQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  useEffect(() => {
    if (providerFilter && !providers.some((provider) => provider.id === providerFilter)) {
      setProviderFilter("");
    }
  }, [providerFilter, providers]);

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
          <p className="mt-1 text-sm text-muted-foreground">กำหนดชุดหัวข้อข้อมูลตามประเภทช่องทางและผู้ให้บริการที่มีอยู่แล้ว</p>
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
          <div className="grid gap-3 pt-3 md:grid-cols-2">
            <Select value={channelTypeFilter} onChange={(event) => setChannelTypeFilter(event.target.value)}>
              <option value="">ทุกประเภทช่องทาง</option>
              {channelTypes.map((channelType) => (
                <option key={channelType.id} value={channelType.id}>{channelType.name}</option>
              ))}
            </Select>
            <Select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
              <option value="">ทุกผู้ให้บริการ</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{providerLabel(provider)}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ Template</TableHead>
                <TableHead>ประเภทช่องทาง</TableHead>
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
                  <TableCell>{templateChannelType(template)?.name || "-"}</TableCell>
                  <TableCell>{providerLabel(template.providerRecord, template.provider)}</TableCell>
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
      <TemplateDialog
        open={open}
        template={selected}
        channelTypes={channelTypes.filter((channelType) => channelType.isActive || channelType.id === templateChannelType(selected)?.id)}
        providers={activeProviders}
        onOpenChange={setOpen}
        onSubmit={saveTemplate}
      />
    </DashboardShell>
  );
}

function TemplateDialog({
  open,
  template,
  channelTypes,
  providers,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  template: FinanceFieldTemplate | null;
  channelTypes: FinanceChannelType[];
  providers: FinanceProvider[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: FinanceTemplatePayload) => Promise<void>;
}) {
  const initialChannelTypeId = templateChannelType(template)?.id ?? channelTypes[0]?.id ?? "";
  const [channelTypeId, setChannelTypeId] = useState(initialChannelTypeId);
  const [providerId, setProviderId] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const availableProviders = providers.filter((provider) => provider.channelTypeId === channelTypeId);

  useEffect(() => {
    if (!open) return;
    const nextChannelTypeId = templateChannelType(template)?.id ?? channelTypes[0]?.id ?? "";
    const nextProviderId = template?.providerId ?? providers.find((provider) => provider.channelTypeId === nextChannelTypeId)?.id ?? "";
    setChannelTypeId(nextChannelTypeId);
    setProviderId(nextProviderId);
    setName(template?.name ?? "");
    setIsActive(template?.isActive ?? true);
    setError(null);
  }, [channelTypes, open, providers, template]);

  useEffect(() => {
    if (!open || !channelTypeId) return;
    if (!availableProviders.some((provider) => provider.id === providerId)) {
      setProviderId(availableProviders[0]?.id ?? "");
    }
  }, [availableProviders, channelTypeId, open, providerId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!providerId) {
      setError("กรุณาเลือกผู้ให้บริการที่ใช้งานอยู่");
      return;
    }
    try {
      await onSubmit({ providerId, name, isActive });
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
          <DialogDescription>Template จะใช้ผู้ให้บริการจากหน้าจัดการ Provider เท่านั้น</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="ชื่อ Template"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
          <Field label="ประเภทช่องทาง">
            <Select value={channelTypeId} onChange={(event) => setChannelTypeId(event.target.value)} required>
              {channelTypes.map((channelType) => <option key={channelType.id} value={channelType.id}>{channelType.name}</option>)}
            </Select>
          </Field>
          <Field label="ผู้ให้บริการ">
            <Select value={providerId} onChange={(event) => setProviderId(event.target.value)} required>
              {availableProviders.map((provider) => <option key={provider.id} value={provider.id}>{providerLabel(provider)}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input className="h-4 w-4" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> ใช้งาน Template</label>
          {availableProviders.length === 0 && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">ไม่มีผู้ให้บริการที่ใช้งานอยู่ในประเภทช่องทางนี้</p>}
          {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit" disabled={!providerId}>บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-2">{children}</div></div>;
}
