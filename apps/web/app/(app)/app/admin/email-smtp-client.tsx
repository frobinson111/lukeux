"use client";

import { useState } from "react";
import type { SmtpConfigRow } from "./page";

export default function EmailSmtpAdmin({
  initialSmtpConfig,
  initialEmailSettings,
}: {
  initialSmtpConfig: SmtpConfigRow | null;
  initialEmailSettings: { otpEnabled: boolean; smtpConfigured: boolean; smtpVerified: boolean };
}) {
  const [otpEnabled, setOtpEnabled] = useState(initialEmailSettings.otpEnabled);
  const [smtpVerified, setSmtpVerified] = useState(initialEmailSettings.smtpVerified);
  const [smtpConfigured, setSmtpConfigured] = useState(initialEmailSettings.smtpConfigured);

  const [host, setHost] = useState(initialSmtpConfig?.host ?? "");
  const [port, setPort] = useState(initialSmtpConfig?.port ?? 587);
  const [username, setUsername] = useState(initialSmtpConfig?.username ?? "");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState(initialSmtpConfig?.encryption ?? "STARTTLS");
  const [fromEmail, setFromEmail] = useState(initialSmtpConfig?.fromEmail ?? "");
  const [fromName, setFromName] = useState(initialSmtpConfig?.fromName ?? "Luke UX");

  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<string | null>(null);
  const [smtpError, setSmtpError] = useState<string | null>(null);

  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [otpToggling, setOtpToggling] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  async function saveSmtpConfig() {
    setSmtpSaving(true);
    setSmtpStatus(null);
    setSmtpError(null);

    if (!password && !initialSmtpConfig?.passwordSet) {
      setSmtpError("Password is required");
      setSmtpSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port,
          username,
          ...(password ? { password } : {}),
          encryption,
          fromEmail,
          fromName,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSmtpError(data?.error || "Failed to save SMTP configuration");
        return;
      }

      setSmtpStatus("SMTP configuration saved");
      setSmtpConfigured(true);
      setSmtpVerified(false);
      setPassword("");
    } catch {
      setSmtpError("Failed to save SMTP configuration");
    } finally {
      setSmtpSaving(false);
    }
  }

  async function sendTest() {
    if (!testEmail) return;
    setTestSending(true);
    setTestStatus(null);
    setTestError(null);

    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setTestError(data?.error || "Failed to send test email");
        return;
      }

      setTestStatus("Test email sent successfully");
      setSmtpVerified(true);
    } catch {
      setTestError("Failed to send test email");
    } finally {
      setTestSending(false);
    }
  }

  async function toggleOtp() {
    setOtpToggling(true);
    setOtpError(null);

    try {
      const res = await fetch("/api/admin/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !otpEnabled }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setOtpError(data?.error || "Failed to toggle OTP");
        return;
      }

      setOtpEnabled(data.otpEnabled);
    } catch {
      setOtpError("Failed to toggle OTP");
    } finally {
      setOtpToggling(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100";

  return (
    <div className="space-y-8">
      {/* Section A: Email Verification Settings */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Email Verification Settings</h3>

        {!smtpConfigured && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            SMTP is not configured. Configure SMTP settings below before enabling OTP verification.
          </div>
        )}

        {smtpConfigured && !smtpVerified && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            SMTP is configured but not verified. Send a test email below to verify your SMTP settings before enabling OTP.
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">
              Email OTP Verification
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {otpEnabled
                ? "New users must verify their email with a 6-digit code"
                : "New users skip email verification (can log in immediately)"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              otpEnabled
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-slate-50 text-slate-600 border border-slate-200"
            }`}>
              {otpEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              onClick={toggleOtp}
              disabled={otpToggling || (!smtpVerified && !otpEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                otpEnabled ? "bg-primary-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  otpEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {otpError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {otpError}
          </div>
        )}
      </div>

      {/* Section B: SMTP Configuration */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900">SMTP Configuration</h3>
          {smtpConfigured && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              smtpVerified
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {smtpVerified ? "Verified" : "Not verified"}
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">SMTP Host</span>
              <input
                className={inputClass}
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.example.com"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Port</span>
              <input
                className={inputClass}
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="587"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Username</span>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Password</span>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initialSmtpConfig?.passwordSet ? "••••••••  (unchanged)" : "Enter password"}
              />
              {initialSmtpConfig?.passwordSet && !password && (
                <p className="text-xs text-slate-500">Leave blank to keep current password</p>
              )}
            </label>
          </div>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Encryption</span>
            <select
              className={inputClass}
              value={encryption}
              onChange={(e) => setEncryption(e.target.value)}
            >
              <option value="SSL_TLS">SSL/TLS (Port 465)</option>
              <option value="STARTTLS">STARTTLS (Port 587)</option>
              <option value="NONE">None</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">From Email</span>
              <input
                className={inputClass}
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@example.com"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-medium text-slate-900">From Name</span>
              <input
                className={inputClass}
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Luke UX"
              />
            </label>
          </div>

          {smtpError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {smtpError}
            </div>
          )}
          {smtpStatus && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {smtpStatus}
            </div>
          )}

          <button
            onClick={saveSmtpConfig}
            disabled={smtpSaving || !host || !username || (!password && !initialSmtpConfig?.passwordSet) || !fromEmail}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {smtpSaving ? "Saving..." : "Save SMTP Settings"}
          </button>
        </div>
      </div>

      {/* Section C: Test Email */}
      {smtpConfigured && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Send Test Email</h3>

          <div className="flex gap-3">
            <input
              className={`${inputClass} flex-1`}
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
            <button
              onClick={sendTest}
              disabled={testSending || !testEmail}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {testSending ? "Sending..." : "Send Test"}
            </button>
          </div>

          {testError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {testError}
            </div>
          )}
          {testStatus && (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {testStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
