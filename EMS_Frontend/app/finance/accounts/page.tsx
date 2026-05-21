"use client";

import { AxiosError } from "axios";
import { ArrowDown, ArrowUp, Check, Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAccountLines, useFinanceAccounts, useResolvedFinanceTemplate } from "@/hooks/useFinance";
import type { FinanceAccountPayload } from "@/services/finance.service";
import type {
  AccountLine,
  FinanceAccount,
  FinanceAccountCategory,
  FinanceAccountFieldValue,
  FinanceAccountStatus,
  FinanceFieldDefinition,
  FinanceFieldType,
} from "@/types/finance";

const categories: FinanceAccountCategory[] = ["PERSONAL_BANK", "CORPORATE_BANK", "WALLET", "GATEWAY"];
const statuses: FinanceAccountStatus[] = ["ACTIVE", "INACTIVE", "EXPIRED", "SUSPENDED"];
const providers = ["KBANK", "SCB", "BBL", "KTB", "TRUEWALLET", "OPN", "2C2P", "GBPRIMEPAY", "CUSTOM"];
const ACCOUNT_LINE_FIELD_KEY = "account_line";

const categoryLabel: Record<FinanceAccountCategory, string> = {
  PERSONAL_BANK: "บัญชีธนาคารส่วนตัว",
  CORPORATE_BANK: "บัญชีธนาคารบริษัท",
  WALLET: "วอเลท",
  GATEWAY: "เกตเวย์",
};

const statusLabel: Record<FinanceAccountStatus, string> = {
  ACTIVE: "ใช้งาน",
  INACTIVE: "ปิดใช้งาน",
  EXPIRED: "หมดอายุ",
  SUSPENDED: "ระงับ",
};

function blankField(sortOrder: number): FinanceAccountFieldValue {
  return { fieldKey: "", labelSnapshot: "", value: "", sortOrder, isActive: true };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function dateValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function getFinanceAccountLineId(account?: FinanceAccount | null) {
  return account?.accountLineId ?? account?.fieldValues?.find((field) => field.fieldKey === ACCOUNT_LINE_FIELD_KEY)?.value ?? "";
}

function getAccountLineLabel(account: FinanceAccount, accountLinesById: Map<string, AccountLine>) {
  const accountLineId = getFinanceAccountLineId(account);
  if (account.accountLine) return account.accountLine.name;
  if (!accountLineId) return "-";
  const accountLine = accountLinesById.get(accountLineId);
  return accountLine ? `${accountLine.name} (${accountLine.code})` : accountLineId;
}

function mergeAccountLineField(fields: FinanceAccountFieldValue[], accountLineId: string) {
  const nextFields = fields.filter((field) => field.fieldKey !== ACCOUNT_LINE_FIELD_KEY);
  if (!accountLineId) return nextFields;
  return [
    ...nextFields,
    {
      fieldKey: ACCOUNT_LINE_FIELD_KEY,
      labelSnapshot: "สายบัญชี",
      value: accountLineId,
      sortOrder: nextFields.length + 1,
      isActive: true,
    },
  ];
}

function mergeTemplateFieldValues(fields: FinanceAccountFieldValue[], definitions: FinanceFieldDefinition[]) {
  const activeDefinitions = definitions.filter((definition) => definition.isActive);
  const existingKeys = new Set(fields.map((field) => field.fieldKey));
  const missingFields = activeDefinitions.filter((definition) => !existingKeys.has(definition.fieldKey)).map(definitionToValue);
  return [...fields, ...missingFields].map((field, index) => ({ ...field, sortOrder: index + 1 }));
}

export default function FinanceAccountsPage() {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<FinanceAccountCategory | "">("");
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState<FinanceAccountStatus | "">("");
  const [accountLineId, setAccountLineId] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinanceAccount | null>(null);
  const [detailAccount, setDetailAccount] = useState<FinanceAccount | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      keyword: keyword.trim() || undefined,
      category: category || undefined,
      provider: provider || undefined,
      status: status || undefined,
    }),
    [category, keyword, page, provider, status]
  );
  const { accountsQuery, createMutation, updateMutation, deleteMutation } = useFinanceAccounts(params);
  const { accountLinesQuery } = useAccountLines();
  const accountLines = accountLinesQuery.data ?? [];
  const accountLinesById = useMemo(() => new Map(accountLines.map((line) => [line.id, line])), [accountLines]);
  const accounts = useMemo(
    () =>
      (accountsQuery.data?.data ?? []).filter((account) =>
        accountLineId ? getFinanceAccountLineId(account) === accountLineId : true
      ),
    [accountLineId, accountsQuery.data?.data]
  );
  const meta = accountsQuery.data?.meta;

  function openCreate() {
    setSelectedAccount(null);
    setDialogOpen(true);
  }

  function openEdit(account: FinanceAccount) {
    setSelectedAccount(account);
    setDialogOpen(true);
  }

  function openDetail(account: FinanceAccount) {
    setDetailAccount(account);
  }

  async function saveAccount(payload: FinanceAccountPayload) {
    if (selectedAccount) {
      await updateMutation.mutateAsync({ id: selectedAccount.id, payload });
      toast({ title: "บันทึกบัญชีแล้ว", description: payload.displayName });
      return;
    }
    await createMutation.mutateAsync(payload);
    toast({ title: "สร้างบัญชีการเงินแล้ว", description: payload.displayName });
  }

  async function deactivateAccount(account: FinanceAccount) {
    await deleteMutation.mutateAsync(account.id);
    toast({ title: "ปิดใช้งานบัญชีแล้ว", description: account.displayName });
  }

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">บัญชีการเงิน</h1>
          <p className="mt-1 text-sm text-muted-foreground">จัดการบัญชีธนาคาร วอเลท และเกตเวย์ พร้อมข้อมูลตาม Template</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          เพิ่มบัญชี
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการบัญชี</CardTitle>
          <CardDescription>{meta ? `${meta.total} รายการ` : "ข้อมูลบัญชีการเงินทั้งหมด"}</CardDescription>
          <div className="grid gap-3 pt-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="ค้นหาชื่อบัญชี เลขบัญชี หรือหมายเหตุ" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} />
            </div>
            <Select value={category} onChange={(event) => { setCategory(event.target.value as FinanceAccountCategory | ""); setPage(1); }}>
              <option value="">ทุกประเภท</option>
              {categories.map((item) => <option key={item} value={item}>{categoryLabel[item]}</option>)}
            </Select>
            <Select value={provider} onChange={(event) => { setProvider(event.target.value); setPage(1); }}>
              <option value="">ทุกผู้ให้บริการ</option>
              {providers.map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
            <Select value={status} onChange={(event) => { setStatus(event.target.value as FinanceAccountStatus | ""); setPage(1); }}>
              <option value="">ทุกสถานะ</option>
              {statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}
            </Select>
            <Select value={accountLineId} onChange={(event) => { setAccountLineId(event.target.value); setPage(1); }}>
              <option value="">ทุกสายบัญชี</option>
              {accountLines.map((line) => <option key={line.id} value={line.id}>{line.name} ({line.code})</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {accountsQuery.isError && <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">โหลดข้อมูลบัญชีการเงินไม่สำเร็จ</div>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อแสดงผล</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>ผู้ให้บริการ</TableHead>
                <TableHead>ชื่อบัญชี</TableHead>
                <TableHead>เลขบัญชี</TableHead>
                <TableHead>สายบัญชี</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>วันหมดอายุ</TableHead>
                <TableHead className="w-48 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountsQuery.isLoading && <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">กำลังโหลด...</TableCell></TableRow>}
              {!accountsQuery.isLoading && accounts.length === 0 && <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">ยังไม่มีข้อมูลบัญชี</TableCell></TableRow>}
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.displayName}</TableCell>
                  <TableCell>{categoryLabel[account.category]}</TableCell>
                  <TableCell>{account.provider}</TableCell>
                  <TableCell>{account.accountName || "-"}</TableCell>
                  <TableCell>{account.accountNumber || "-"}</TableCell>
                  <TableCell>{getAccountLineLabel(account, accountLinesById)}</TableCell>
                  <TableCell><Badge variant={account.status === "ACTIVE" ? "secondary" : "outline"}>{statusLabel[account.status]}</Badge></TableCell>
                  <TableCell>{formatDate(account.expireDate)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" aria-label="ดูรายละเอียด" onClick={() => openDetail(account)}>
                        <Eye className="h-4 w-4" />
                        ดูรายละเอียด
                      </Button>
                      <Button size="icon" variant="outline" aria-label="แก้ไขบัญชี" onClick={() => openEdit(account)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="outline" aria-label="ปิดใช้งานบัญชี" onClick={() => deactivateAccount(account)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">หน้า {meta.page} จาก {meta.totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>ก่อนหน้า</Button>
                <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>ถัดไป</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FinanceAccountDialog open={dialogOpen} account={selectedAccount} accountLines={accountLines} onOpenChange={setDialogOpen} onSubmit={saveAccount} />
      <FinanceAccountDetailDialog
        open={Boolean(detailAccount)}
        account={detailAccount}
        accountLinesById={accountLinesById}
        onOpenChange={(open) => {
          if (!open) setDetailAccount(null);
        }}
      />
    </DashboardShell>
  );
}

const detailFieldAliases: Record<string, string[]> = {
  website: ["website", "site", "web", "url", "prefix"],
  usageType: ["usage_type", "usage_target", "usage", "use_type", "lp_usage", "account_type", "ip_usage"],
  ownerType: ["owner_type", "account_owner_type", "ownership_type"],
  branch: ["branch", "bank_branch"],
  atm: ["atm", "atm_status"],
  atmCardNumber: ["atm_card_number", "atm_no", "atm_number", "card_atm_number"],
  dailyLimit: ["daily_limit", "limit_per_day", "daily_transfer_limit"],
  nationalId: ["national_id", "citizen_id", "id_card", "id_card_number"],
  birthDate: ["birth_date", "birthday", "date_of_birth", "dob"],
  phone: ["phone", "mobile", "mobile_phone", "wallet_phone"],
  sim: ["sim", "sim_phone", "sim_ais", "sim_number"],
  email: ["email"],
  address: ["address", "owner_address"],
  appCode: ["app_code", "app_id", "app_password", "application_code"],
  simExpireDate: ["sim_expire_date", "sim_expiry_date", "sim_expired_date"],
  purchaseDate: ["purchase_date", "buy_date", "bought_date"],
  releaseDate: ["release_date", "released_date", "available_date"],
};

const detailLabelAliases: Record<string, string[]> = {
  website: ["เว็บไซต์", "Prefix", "ใช้งานกับ"],
  usageType: ["ประเภทใช้งาน", "ประเภทบัญชี", "IP ใช้งาน", "ใช้งาน"],
  ownerType: ["ประเภทเจ้าของ", "Owner type", "ประเภทเจ้าของบัญชี"],
  branch: ["สาขา"],
  atm: ["ATM"],
  atmCardNumber: ["เลขบัตร ATM"],
  dailyLimit: ["วงเงินต่อวัน"],
  nationalId: ["เลขบัตรประชาชน"],
  birthDate: ["วัน/เดือน/ปีเกิด", "วันเกิด"],
  phone: ["เบอร์", "เบอร์โทร"],
  sim: ["ซิม", "เบอร์ซิม", "เบอร์ซิม AIS"],
  email: ["Email"],
  address: ["ที่อยู่"],
  appCode: ["รหัส APP"],
  simExpireDate: ["วันหมดอายุซิม"],
  purchaseDate: ["วันที่ซื้อ"],
  releaseDate: ["วันที่ปล่อยใช้งาน"],
};

const reservedDetailFieldKeys = [
  "site",
  "siteId",
  "accountLine",
  "accountLineId",
  "usageCategory",
  "usageCategoryId",
  "ownerType",
  "status",
  "bankName",
  "bankProvider",
  "accountName",
  "accountNumber",
  "branch",
  "atm",
  "atmCardNumber",
  "dailyLimit",
  "nationalId",
  "birthDate",
  "phone",
  "simProvider",
  "email",
  "address",
  "appPassword",
  "appCode",
  "simExpiredAt",
  "purchasedAt",
  "activatedAt",
  "releasedAt",
  "note",
  ACCOUNT_LINE_FIELD_KEY,
  ...Object.values(detailFieldAliases).flat(),
].map(normalizeFieldKey);

function normalizeFieldKey(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function displayValue(value?: string | null) {
  const normalized = typeof value === "string" ? value.trim() : value;
  return normalized || "-";
}

function getAdditionalDetailFields(account: FinanceAccount) {
  const reservedKeys = new Set(reservedDetailFieldKeys);
  return (account.fieldValues ?? [])
    .filter((field) => field.isActive !== false && !reservedKeys.has(normalizeFieldKey(field.fieldKey)))
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((field, index) => {
      const fieldWithOptionalLabel = field as FinanceAccountFieldValue & { label?: string; title?: string };
      const label =
        fieldWithOptionalLabel.label?.trim() ||
        fieldWithOptionalLabel.title?.trim() ||
        field.labelSnapshot?.trim() ||
        field.fieldKey?.trim() ||
        `ข้อมูลเพิ่มเติม ${index + 1}`;
      return {
        label,
        value: field.value,
        copyKey: `custom:${field.id || field.fieldKey || index}`,
      };
    });
}

function getDetailFieldValue(account: FinanceAccount, aliasName: keyof typeof detailFieldAliases) {
  const keys = detailFieldAliases[aliasName].map((key) => key.toLowerCase());
  const labels = detailLabelAliases[aliasName].map((label) => label.toLowerCase());
  const field = account.fieldValues?.find((item) => {
    const fieldKey = item.fieldKey.toLowerCase();
    const label = item.labelSnapshot.toLowerCase();
    return keys.includes(fieldKey) || labels.includes(label);
  });
  return field?.value ?? "";
}

function formatMaybeDate(value?: string | null) {
  if (!value) return "-";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return displayValue(value);
  return formatDate(value);
}

function removeDuplicateUsageValue(usageValue: string, websiteValue: string) {
  if (!usageValue || !websiteValue) return usageValue;
  return usageValue.trim() === websiteValue.trim() ? "" : usageValue;
}

function FinanceAccountDetailDialog({
  open,
  account,
  accountLinesById,
  onOpenChange,
}: {
  open: boolean;
  account: FinanceAccount | null;
  accountLinesById: Map<string, AccountLine>;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!account) {
    return <Dialog open={open} onOpenChange={onOpenChange} />;
  }

  async function copyValue(label: string, value: string, key: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    await navigator.clipboard.writeText(normalizedValue);
    setCopiedKey(key);
    toast({ title: "คัดลอกแล้ว", description: label });
    window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
  }

  const websiteValue = getDetailFieldValue(account, "website");
  const usageTypeValue = removeDuplicateUsageValue(getDetailFieldValue(account, "usageType"), websiteValue);
  const additionalFields = getAdditionalDetailFields(account);

  const detailSections = [
    {
      title: "ข้อมูลการใช้งาน",
      fields: [
        { label: "เว็บไซต์", value: websiteValue },
        { label: "สายบัญชี", value: getAccountLineLabel(account, accountLinesById) },
        { label: "ประเภทใช้งาน", value: usageTypeValue },
        { label: "ประเภทเจ้าของ", value: getDetailFieldValue(account, "ownerType") },
        { label: "สถานะ", value: statusLabel[account.status] },
      ],
    },
    {
      title: "ข้อมูลบัญชีธนาคาร",
      fields: [
        { label: "ธนาคาร", value: account.provider },
        { label: "ชื่อบัญชี", value: account.accountName },
        { label: "เลขบัญชี", value: account.accountNumber, copyKey: "accountNumber" },
        { label: "สาขา", value: getDetailFieldValue(account, "branch") },
        { label: "ATM", value: getDetailFieldValue(account, "atm") },
        { label: "เลขบัตร ATM", value: getDetailFieldValue(account, "atmCardNumber") },
        { label: "วงเงินต่อวัน", value: getDetailFieldValue(account, "dailyLimit") },
      ],
    },
    {
      title: "ข้อมูลเจ้าของบัญชี",
      fields: [
        { label: "เลขบัตรประชาชน", value: getDetailFieldValue(account, "nationalId") },
        { label: "วัน/เดือน/ปีเกิด", value: formatMaybeDate(getDetailFieldValue(account, "birthDate")) },
        { label: "เบอร์", value: getDetailFieldValue(account, "phone"), copyKey: "phone" },
        { label: "ซิม", value: getDetailFieldValue(account, "sim") },
        { label: "Email", value: getDetailFieldValue(account, "email"), copyKey: "email" },
        { label: "ที่อยู่", value: getDetailFieldValue(account, "address") },
      ],
    },
    {
      title: "ข้อมูลระบบ",
      fields: [
        { label: "รหัส APP", value: getDetailFieldValue(account, "appCode"), copyKey: "appCode" },
        { label: "วันหมดอายุซิม", value: formatMaybeDate(getDetailFieldValue(account, "simExpireDate")) },
        { label: "วันที่ซื้อ", value: formatMaybeDate(getDetailFieldValue(account, "purchaseDate")) },
        { label: "วันที่เริ่มใช้งาน", value: formatMaybeDate(account.startDate) },
        { label: "วันที่ปล่อยใช้งาน", value: formatMaybeDate(getDetailFieldValue(account, "releaseDate")) },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดบัญชีธนาคาร</DialogTitle>
          <DialogDescription>{displayValue(account.displayName)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          {detailSections.map((section) => (
            <section key={section.title} className="rounded-md border p-4">
              <h3 className="text-base font-semibold tracking-normal">{section.title}</h3>
              <div className="mt-4 divide-y">
                {section.fields.map((field) => {
                  const value = displayValue(field.value);
                  const canCopy = Boolean(field.copyKey && value !== "-");
                  const isCopied = copiedKey === field.copyKey;
                  return (
                    <div key={field.label} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr_auto] sm:items-start">
                      <div className="text-sm text-muted-foreground">{field.label}</div>
                      <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium">{value}</div>
                      {field.copyKey ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={!canCopy}
                          aria-label={`คัดลอก${field.label}`}
                          onClick={() => copyValue(field.label, value, field.copyKey)}
                        >
                          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <section className="rounded-md border p-4 lg:col-span-2">
            <h3 className="text-base font-semibold tracking-normal">ข้อมูลเพิ่มเติม</h3>
            {additionalFields.length ? (
              <div className="mt-4 grid gap-x-6 md:grid-cols-2">
                {additionalFields.map((field) => {
                  const value = displayValue(field.value);
                  const isCopied = copiedKey === field.copyKey;
                  return (
                    <div key={field.copyKey} className="grid gap-2 border-b py-3 sm:grid-cols-[150px_1fr_auto] sm:items-start">
                      <div className="text-sm text-muted-foreground">{field.label}</div>
                      <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium">{value}</div>
                      {value !== "-" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`คัดลอก${field.label}`}
                          onClick={() => copyValue(field.label, value, field.copyKey)}
                        >
                          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">ไม่มีข้อมูลเพิ่มเติม</div>
            )}
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinanceAccountDialog({ open, account, accountLines, onOpenChange, onSubmit }: { open: boolean; account: FinanceAccount | null; accountLines: AccountLine[]; onOpenChange: (open: boolean) => void; onSubmit: (payload: FinanceAccountPayload) => Promise<void>; }) {
  const [category, setCategory] = useState<FinanceAccountCategory>("PERSONAL_BANK");
  const [provider, setProvider] = useState("KBANK");
  const [displayName, setDisplayName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountLineId, setAccountLineId] = useState("");
  const [status, setStatus] = useState<FinanceAccountStatus>("ACTIVE");
  const [startDate, setStartDate] = useState("");
  const [expireDate, setExpireDate] = useState("");
  const [note, setNote] = useState("");
  const [fields, setFields] = useState<FinanceAccountFieldValue[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const templateQuery = useResolvedFinanceTemplate(category, provider);
  const isEdit = Boolean(account);

  useEffect(() => {
    if (!open) return;
    setCategory(account?.category ?? "PERSONAL_BANK");
    setProvider(account?.provider ?? "KBANK");
    setDisplayName(account?.displayName ?? "");
    setAccountName(account?.accountName ?? "");
    setAccountNumber(account?.accountNumber ?? "");
    setAccountLineId(getFinanceAccountLineId(account));
    setStatus(account?.status ?? "ACTIVE");
    setStartDate(dateValue(account?.startDate));
    setExpireDate(dateValue(account?.expireDate));
    setNote(account?.note ?? "");
    setFields(account?.fieldValues?.length ? account.fieldValues.filter((field) => field.fieldKey !== ACCOUNT_LINE_FIELD_KEY) : []);
    setServerError(null);
  }, [account, open]);

  useEffect(() => {
    const template = templateQuery.data;
    if (!open || !template) return;
    setFields((items) => {
      if (!isEdit && items.length === 0) {
        return template.fieldDefinitions.filter((field) => field.isActive).map(definitionToValue);
      }
      return mergeTemplateFieldValues(items, template.fieldDefinitions);
    });
  }, [isEdit, open, templateQuery.data]);

  function updateField(index: number, patch: Partial<FinanceAccountFieldValue>) {
    setFields((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((items) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return items;
      const next = [...items];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next.map((field, itemIndex) => ({ ...field, sortOrder: itemIndex + 1 }));
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    if (!displayName.trim()) {
      setServerError("กรุณาระบุชื่อแสดงผล");
      return;
    }
    const normalizedFields = fields
      .filter((field) => field.fieldKey !== ACCOUNT_LINE_FIELD_KEY)
      .map((field, index) => ({
        fieldKey: field.fieldKey.trim() || `custom_${index + 1}`,
        labelSnapshot: field.labelSnapshot.trim() || field.fieldKey.trim() || `Custom ${index + 1}`,
        value: field.value ?? "",
        sortOrder: index + 1,
        isActive: field.isActive !== false,
      }));
    const fieldsWithAccountLine = mergeAccountLineField(normalizedFields, accountLineId);
    const requiredDefinitions = templateQuery.data?.fieldDefinitions.filter((field) => field.isActive && field.isRequired) ?? [];
    const valuesByKey = new Map(fieldsWithAccountLine.filter((field) => field.isActive).map((field) => [field.fieldKey, field.value]));
    const missing = requiredDefinitions.filter((field) => !valuesByKey.get(field.fieldKey)?.trim());
    if (missing.length) {
      setServerError(`กรุณากรอกข้อมูลที่จำเป็น: ${missing.map((field) => field.labelTh).join(", ")}`);
      return;
    }
    try {
      await onSubmit({
        category,
        provider,
        displayName: displayName.trim(),
        accountName: accountName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        accountLineId: accountLineId || undefined,
        status,
        startDate: startDate || undefined,
        expireDate: expireDate || undefined,
        note: note.trim() || undefined,
        fields: fieldsWithAccountLine,
      });
      onOpenChange(false);
    } catch (error) {
      setServerError(error instanceof AxiosError ? error.response?.data?.message || "บันทึกข้อมูลไม่สำเร็จ" : "บันทึกข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขบัญชีการเงิน" : "เพิ่มบัญชีการเงิน"}</DialogTitle>
          <DialogDescription>เลือกประเภทและผู้ให้บริการเพื่อโหลดหัวข้อข้อมูลตาม Template</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ประเภท">
              <Select value={category} onChange={(event) => setCategory(event.target.value as FinanceAccountCategory)}>
                {categories.map((item) => <option key={item} value={item}>{categoryLabel[item]}</option>)}
              </Select>
            </Field>
            <Field label="ผู้ให้บริการ">
              <Select value={provider} onChange={(event) => setProvider(event.target.value)}>
                {providers.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="ชื่อแสดงผล">
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
            <Field label="สถานะ">
              <Select value={status} onChange={(event) => setStatus(event.target.value as FinanceAccountStatus)}>
                {statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}
              </Select>
            </Field>
            <Field label="ชื่อบัญชี">
              <Input value={accountName} onChange={(event) => setAccountName(event.target.value)} />
            </Field>
            <Field label="เลขบัญชี">
              <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
            </Field>
            <Field label="สายบัญชี">
              <Select value={accountLineId} onChange={(event) => setAccountLineId(event.target.value)}>
                <option value="">ไม่ระบุสายบัญชี</option>
                {accountLines.filter((line) => line.isActive || line.id === accountLineId).map((line) => (
                  <option key={line.id} value={line.id}>{line.name} ({line.code})</option>
                ))}
              </Select>
            </Field>
            <Field label="วันที่เริ่มใช้งาน">
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </Field>
            <Field label="วันหมดอายุ">
              <Input type="date" value={expireDate} onChange={(event) => setExpireDate(event.target.value)} />
            </Field>
          </div>
          <Field label="หมายเหตุ">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>

          <Tabs defaultValue="fields">
            <TabsList>
              <TabsTrigger value="fields">ข้อมูลเพิ่มเติม</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
            </TabsList>
            <TabsContent value="fields" className="space-y-3 pt-4">
              {fields.map((field, index) => {
                const definition = templateQuery.data?.fieldDefinitions.find((item) => item.fieldKey === field.fieldKey);
                return (
                  <div key={`${field.fieldKey}-${index}`} className={`grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_1fr_1.6fr_auto] md:items-end ${field.isActive === false ? "opacity-60" : ""}`}>
                    <Field label="Key">
                      <Input value={field.fieldKey} onChange={(event) => updateField(index, { fieldKey: event.target.value })} />
                    </Field>
                    <Field label="หัวข้อ">
                      <Input value={field.labelSnapshot} onChange={(event) => updateField(index, { labelSnapshot: event.target.value })} />
                    </Field>
                    <Field label={definition?.isRequired ? "ค่า (จำเป็น)" : "ค่า"}>
                      <DynamicInput definition={definition} value={field.value} onChange={(value) => updateField(index, { value })} />
                    </Field>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="icon" onClick={() => moveField(index, -1)} aria-label="เลื่อนขึ้น"><ArrowUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => moveField(index, 1)} aria-label="เลื่อนลง"><ArrowDown className="h-4 w-4" /></Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => updateField(index, { isActive: field.isActive === false })} aria-label="เปิดปิดหัวข้อ"><EyeOff className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={() => setFields((items) => [...items, blankField(items.length + 1)])}>
                <Plus className="h-4 w-4" />
                เพิ่มหัวข้อเอง
              </Button>
            </TabsContent>
            <TabsContent value="template" className="pt-4 text-sm text-muted-foreground">
              {templateQuery.data ? `${templateQuery.data.name} (${templateQuery.data.fieldDefinitions.length} หัวข้อ)` : "ยังไม่มี Template สำหรับประเภทและผู้ให้บริการนี้"}
            </TabsContent>
          </Tabs>
          {serverError && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button type="submit">บันทึก</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function definitionToValue(definition: FinanceFieldDefinition): FinanceAccountFieldValue {
  return {
    fieldKey: definition.fieldKey,
    labelSnapshot: definition.labelTh || definition.labelEn,
    value: "",
    sortOrder: definition.sortOrder,
    isActive: true,
  };
}

function DynamicInput({ definition, value, onChange }: { definition?: FinanceFieldDefinition; value: string; onChange: (value: string) => void }) {
  const typeByField: Record<FinanceFieldType, string> = {
    text: "text",
    textarea: "text",
    number: "number",
    date: "date",
    select: "text",
    email: "email",
    phone: "tel",
    password: "password",
  };
  if (definition?.fieldType === "textarea") {
    return <Textarea placeholder={definition.placeholder ?? undefined} value={value} onChange={(event) => onChange(event.target.value)} />;
  }
  if (definition?.fieldType === "select" && definition.options?.length) {
    return (
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">เลือกข้อมูล</option>
        {definition.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </Select>
    );
  }
  return <Input type={definition ? typeByField[definition.fieldType] : "text"} placeholder={definition?.placeholder ?? undefined} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
