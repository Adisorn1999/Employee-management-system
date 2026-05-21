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
import { useFinanceDefinitions, useFinanceTemplates } from "@/hooks/useFinance";
import type { FinanceDefinitionPayload } from "@/services/finance.service";
import type { FinanceFieldDefinition, FinanceFieldTemplate, FinanceFieldType } from "@/types/finance";

const fieldTypes: FinanceFieldType[] = ["text", "textarea", "number", "date", "select", "email", "phone", "password"];

export default function FinanceFieldDefinitionsPage() {
  const { toast } = useToast();
  const { templatesQuery } = useFinanceTemplates();
  const templates = templatesQuery.data ?? [];
  const [templateId, setTemplateId] = useState("");
  const params = useMemo(() => ({ templateId: templateId || undefined }), [templateId]);
  const { definitionsQuery, createMutation, updateMutation, deleteMutation } = useFinanceDefinitions(params);
  const definitions = definitionsQuery.data ?? [];
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceFieldDefinition | null>(null);

  useEffect(() => {
    if (!templateId && templates[0]) {
      setTemplateId(templates[0].id);
    }
  }, [templateId, templates]);

  async function saveDefinition(payload: FinanceDefinitionPayload) {
    if (selected) {
      await updateMutation.mutateAsync({ id: selected.id, payload });
      toast({ title: "บันทึกหัวข้อข้อมูลแล้ว", description: payload.labelTh });
      return;
    }
    await createMutation.mutateAsync(payload);
    toast({ title: "เพิ่มหัวข้อข้อมูลแล้ว", description: payload.labelTh });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">ตั้งค่าหัวข้อข้อมูล</h1>
          <p className="mt-1 text-sm text-muted-foreground">จัดการ Dynamic Fields ที่ใช้ในแต่ละ Template</p>
        </div>
        <Button disabled={!templateId} onClick={() => { setSelected(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />
          เพิ่มหัวข้อ
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>หัวข้อข้อมูลตาม Template</CardTitle>
            <CardDescription>{definitions.length} หัวข้อ</CardDescription>
          </div>
          <Select className="md:w-80" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name} - {template.provider}</option>)}
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ลำดับ</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>หัวข้อ TH</TableHead>
                <TableHead>หัวข้อ EN</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>จำเป็น</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-28 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitionsQuery.isLoading && <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell></TableRow>}
              {!definitionsQuery.isLoading && definitions.length === 0 && <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">ยังไม่มีหัวข้อข้อมูล</TableCell></TableRow>}
              {definitions.map((definition) => (
                <TableRow key={definition.id}>
                  <TableCell>{definition.sortOrder}</TableCell>
                  <TableCell className="font-mono text-xs">{definition.fieldKey}</TableCell>
                  <TableCell className="font-medium">{definition.labelTh}</TableCell>
                  <TableCell>{definition.labelEn}</TableCell>
                  <TableCell>{definition.fieldType}</TableCell>
                  <TableCell>{definition.isRequired ? "ใช่" : "-"}</TableCell>
                  <TableCell><Badge variant={definition.isActive ? "secondary" : "outline"}>{definition.isActive ? "ใช้งาน" : "ปิด"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" aria-label="แก้ไขหัวข้อ" onClick={() => { setSelected(definition); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" aria-label="ปิดหัวข้อ" onClick={() => deleteMutation.mutate(definition.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DefinitionDialog open={open} definition={selected} templates={templates} defaultTemplateId={templateId} onOpenChange={setOpen} onSubmit={saveDefinition} />
    </DashboardShell>
  );
}

function DefinitionDialog({ open, definition, templates, defaultTemplateId, onOpenChange, onSubmit }: { open: boolean; definition: FinanceFieldDefinition | null; templates: FinanceFieldTemplate[]; defaultTemplateId: string; onOpenChange: (open: boolean) => void; onSubmit: (payload: FinanceDefinitionPayload) => Promise<void>; }) {
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [fieldKey, setFieldKey] = useState("");
  const [labelTh, setLabelTh] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [fieldType, setFieldType] = useState<FinanceFieldType>("text");
  const [placeholder, setPlaceholder] = useState("");
  const [options, setOptions] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [isRequired, setIsRequired] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTemplateId(definition?.templateId ?? defaultTemplateId);
    setFieldKey(definition?.fieldKey ?? "");
    setLabelTh(definition?.labelTh ?? "");
    setLabelEn(definition?.labelEn ?? "");
    setFieldType(definition?.fieldType ?? "text");
    setPlaceholder(definition?.placeholder ?? "");
    setOptions(definition?.options?.join("\n") ?? "");
    setSortOrder(definition?.sortOrder ?? 1);
    setIsRequired(definition?.isRequired ?? false);
    setIsActive(definition?.isActive ?? true);
    setError(null);
  }, [defaultTemplateId, definition, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSubmit({
        templateId,
        fieldKey,
        labelTh,
        labelEn,
        fieldType,
        placeholder: placeholder || undefined,
        options: fieldType === "select" ? options.split("\n").map((item) => item.trim()).filter(Boolean) : undefined,
        sortOrder,
        isRequired,
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
          <DialogTitle>{definition ? "แก้ไขหัวข้อข้อมูล" : "เพิ่มหัวข้อข้อมูล"}</DialogTitle>
          <DialogDescription>หัวข้อจะถูกนำไปแสดงในฟอร์มบัญชีตาม Template</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field label="Template"><Select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={Boolean(definition)}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} - {template.provider}</option>)}</Select></Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Field key"><Input value={fieldKey} onChange={(event) => setFieldKey(event.target.value)} required disabled={Boolean(definition)} /></Field>
            <Field label="ประเภทข้อมูล"><Select value={fieldType} onChange={(event) => setFieldType(event.target.value as FinanceFieldType)}>{fieldTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select></Field>
            <Field label="หัวข้อภาษาไทย"><Input value={labelTh} onChange={(event) => setLabelTh(event.target.value)} required /></Field>
            <Field label="หัวข้อภาษาอังกฤษ"><Input value={labelEn} onChange={(event) => setLabelEn(event.target.value)} required /></Field>
            <Field label="Placeholder"><Input value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} /></Field>
            <Field label="ลำดับ"><Input type="number" min={0} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} /></Field>
          </div>
          {fieldType === "select" && <Field label="ตัวเลือก (บรรทัดละ 1 ค่า)"><Input value={options} onChange={(event) => setOptions(event.target.value)} /></Field>}
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input className="h-4 w-4" type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} /> จำเป็นต้องกรอก</label>
            <label className="flex items-center gap-2"><input className="h-4 w-4" type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> ใช้งาน</label>
          </div>
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
