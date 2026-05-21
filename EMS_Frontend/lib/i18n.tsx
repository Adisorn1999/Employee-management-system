"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "th" | "en";

type TranslationKey =
  | "nav.dashboard"
  | "nav.employees"
  | "nav.employeeList"
  | "nav.departmentsAndPositions"
  | "nav.departments"
  | "nav.positions"
  | "nav.workManagement"
  | "nav.shiftList"
  | "nav.scheduleAttendance"
  | "nav.monthlyOff"
  | "nav.leaveRequests"
  | "nav.reports"
  | "nav.attendanceReport"
  | "nav.lateOtReport"
  | "nav.offDayReport"
  | "nav.employeeSummary"
  | "nav.financeAccounts"
  | "nav.financeAccountList"
  | "nav.financeTemplates"
  | "nav.financeFieldDefinitions"
  | "nav.financeChannelTypes"
  | "nav.financeProviders"
  | "nav.settings"
  | "nav.accountLines"
  | "app.subtitle"
  | "app.phaseTitle"
  | "app.phaseDescription"
  | "topbar.logout"
  | "topbar.language";

const STORAGE_KEY = "ems-language";
const DEFAULT_LANGUAGE: Language = "th";

const translations: Record<Language, Record<TranslationKey, string>> = {
  th: {
    "nav.dashboard": "หน้าหลัก",
    "nav.employees": "พนักงาน",
    "nav.employeeList": "รายชื่อพนักงาน",
    "nav.departmentsAndPositions": "แผนกและตำแหน่ง",
    "nav.departments": "แผนก",
    "nav.positions": "ตำแหน่ง",
    "nav.workManagement": "การจัดการงาน",
    "nav.shiftList": "รายการกะ",
    "nav.scheduleAttendance": "ตารางกะและเข้างาน",
    "nav.monthlyOff": "วันหยุดประจำเดือน",
    "nav.leaveRequests": "คำขอลางาน",
    "nav.reports": "รายงาน",
    "nav.attendanceReport": "รายงานเข้างาน",
    "nav.lateOtReport": "รายงานมาสาย / OT",
    "nav.offDayReport": "รายงานวันหยุด",
    "nav.employeeSummary": "สรุปพนักงาน",
    "nav.financeAccounts": "บัญชีการเงิน",
    "nav.financeAccountList": "รายการบัญชี",
    "nav.financeTemplates": "ตั้งค่า Template",
    "nav.financeFieldDefinitions": "ตั้งค่าหัวข้อข้อมูล",
    "nav.financeChannelTypes": "ประเภทช่องทาง",
    "nav.financeProviders": "ผู้ให้บริการ",
    "nav.settings": "ตั้งค่า",
    "nav.accountLines": "สายบัญชี",
    "app.subtitle": "ระบบจัดการงาน",
    "app.phaseTitle": "เฟส 1",
    "app.phaseDescription": "ระบบหลักสำหรับเข้าสู่ระบบ เมนู และข้อมูลพนักงาน",
    "topbar.logout": "ออกจากระบบ",
    "topbar.language": "ภาษา",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.employees": "Employees",
    "nav.employeeList": "Employee List",
    "nav.departmentsAndPositions": "Departments & Positions",
    "nav.departments": "Departments",
    "nav.positions": "Positions",
    "nav.workManagement": "Work Management",
    "nav.shiftList": "Shift List",
    "nav.scheduleAttendance": "Schedule & Attendance",
    "nav.monthlyOff": "Monthly Off",
    "nav.leaveRequests": "Leave Requests",
    "nav.reports": "Reports",
    "nav.attendanceReport": "Attendance Report",
    "nav.lateOtReport": "Late / OT Report",
    "nav.offDayReport": "Off Day Report",
    "nav.employeeSummary": "Employee Summary",
    "nav.financeAccounts": "Finance Accounts",
    "nav.financeAccountList": "Account List",
    "nav.financeTemplates": "Templates",
    "nav.financeFieldDefinitions": "Field Definitions",
    "nav.financeChannelTypes": "Channel Types",
    "nav.financeProviders": "Providers",
    "nav.settings": "Settings",
    "nav.accountLines": "Account Lines",
    "app.subtitle": "Operations Console",
    "app.phaseTitle": "Phase 1",
    "app.phaseDescription": "Core auth, navigation, and employee records.",
    "topbar.logout": "Logout",
    "topbar.language": "Language",
  },
};

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getStoredLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const storedLanguage = localStorage.getItem(STORAGE_KEY);
  return storedLanguage === "en" || storedLanguage === "th" ? storedLanguage : DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setLanguageState(getStoredLanguage());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key) => translations[language][key],
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
