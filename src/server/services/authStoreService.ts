/**
 * Smart Clinic — Serverless Auth & OTP Persistence Store
 * Solves multi-instance / short-lived lambda desynchronization on Vercel:
 * 1. Layer 1: In-Memory Map (microsecond local lookup)
 * 2. Layer 2: /tmp Local Disk File Storage (survives warm lambdas & instance recycles)
 * 3. Layer 3: Supabase Cloud PostgreSQL Tables (auth_credentials, auth_otps)
 */

import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface StoredCredential {
  email: string;
  hash: string;
  salt: string;
  role: string;
  failedAttempts: number;
  lockedUntil: number | null;
  lastLoginAt?: string;
  updatedAt: string;
}

export interface StoredOtp {
  codeHash: string;
  codePlain?: string;
  channel: 'email' | 'sms';
  destination: string;
  purpose: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  metadata?: Record<string, any>;
}

const TMP_DIR = '/tmp';
const CREDENTIALS_FILE = path.join(TMP_DIR, 'smart_clinic_credentials.json');
const OTPS_FILE = path.join(TMP_DIR, 'smart_clinic_otps.json');

class AuthStoreService {
  private memCredentials = new Map<string, StoredCredential>();
  private memOtps = new Map<string, StoredOtp>();
  private supabase: SupabaseClient | null = null;
  private isSupabaseTableReady = true;

  constructor() {
    this.hydrateFromDisk();
  }

  public setSupabaseClient(client: SupabaseClient | null) {
    this.supabase = client;
  }

  /* --------------------------------------------------------------------------
     DISK PERSISTENCE (/tmp)
     -------------------------------------------------------------------------- */
  private hydrateFromDisk(): void {
    try {
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
        const parsed: Record<string, StoredCredential> = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.memCredentials.set(k.toLowerCase(), v);
        }
      }
    } catch (e) {
      // Non-fatal fallback
    }

    try {
      if (fs.existsSync(OTPS_FILE)) {
        const raw = fs.readFileSync(OTPS_FILE, 'utf-8');
        const parsed: Record<string, StoredOtp> = JSON.parse(raw);
        const now = Date.now();
        for (const [k, v] of Object.entries(parsed)) {
          if (v.expiresAt > now) {
            this.memOtps.set(k, v);
          }
        }
      }
    } catch (e) {
      // Non-fatal fallback
    }
  }

  private flushCredentialsToDisk(): void {
    try {
      const obj: Record<string, StoredCredential> = {};
      for (const [k, v] of this.memCredentials.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(obj), 'utf-8');
    } catch {
      // Non-fatal in read-only environments
    }
  }

  private flushOtpsToDisk(): void {
    try {
      const obj: Record<string, StoredOtp> = {};
      const now = Date.now();
      for (const [k, v] of this.memOtps.entries()) {
        if (v.expiresAt > now) {
          obj[k] = v;
        }
      }
      fs.writeFileSync(OTPS_FILE, JSON.stringify(obj), 'utf-8');
    } catch {
      // Non-fatal
    }
  }

  /* --------------------------------------------------------------------------
     CREDENTIALS API
     -------------------------------------------------------------------------- */
  public async getCredential(email: string): Promise<StoredCredential | null> {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check in-memory first
    if (this.memCredentials.has(cleanEmail)) {
      return this.memCredentials.get(cleanEmail)!;
    }

    // Check disk storage next
    this.hydrateFromDisk();
    if (this.memCredentials.has(cleanEmail)) {
      return this.memCredentials.get(cleanEmail)!;
    }

    // Check Supabase cloud database if available
    if (this.supabase && this.isSupabaseTableReady) {
      try {
        const { data, error } = await this.supabase
          .from('auth_credentials')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (error) {
          if (error.code === '42P01') {
            this.isSupabaseTableReady = false;
          }
        } else if (data) {
          const cred: StoredCredential = {
            email: data.email,
            hash: data.hash,
            salt: data.salt,
            role: data.role || 'patient',
            failedAttempts: data.failed_attempts || 0,
            lockedUntil: data.locked_until ? Number(data.locked_until) : null,
            updatedAt: data.updated_at || new Date().toISOString(),
          };
          this.memCredentials.set(cleanEmail, cred);
          this.flushCredentialsToDisk();
          return cred;
        }
      } catch {
        // Fallback gracefully
      }
    }

    return null;
  }

  public getCredentialSync(email: string): StoredCredential | null {
    const cleanEmail = email.trim().toLowerCase();
    if (this.memCredentials.has(cleanEmail)) {
      return this.memCredentials.get(cleanEmail)!;
    }
    this.hydrateFromDisk();
    return this.memCredentials.get(cleanEmail) || null;
  }

  public hasCredentialSync(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    if (this.memCredentials.has(cleanEmail)) return true;
    this.hydrateFromDisk();
    return this.memCredentials.has(cleanEmail);
  }

  public async setCredential(cred: StoredCredential): Promise<void> {
    const cleanEmail = cred.email.trim().toLowerCase();
    this.memCredentials.set(cleanEmail, cred);
    this.flushCredentialsToDisk();

    if (this.supabase && this.isSupabaseTableReady) {
      try {
        await this.supabase.from('auth_credentials').upsert(
          {
            email: cleanEmail,
            hash: cred.hash,
            salt: cred.salt,
            role: cred.role,
            failed_attempts: cred.failedAttempts,
            locked_until: cred.lockedUntil,
            updated_at: cred.updatedAt,
          },
          { onConflict: 'email' }
        );
      } catch {
        // Non-fatal if table not yet run
      }
    }
  }

  /* --------------------------------------------------------------------------
     OTP VERIFICATION API
     -------------------------------------------------------------------------- */
  public async getOtp(key: string): Promise<StoredOtp | null> {
    const now = Date.now();
    // 1. Memory check
    const mem = this.memOtps.get(key);
    if (mem && mem.expiresAt > now) {
      return mem;
    }

    // 2. Disk check
    this.hydrateFromDisk();
    const disk = this.memOtps.get(key);
    if (disk && disk.expiresAt > now) {
      return disk;
    }

    // 3. Supabase check
    if (this.supabase && this.isSupabaseTableReady) {
      try {
        const { data, error } = await this.supabase
          .from('auth_otps')
          .select('*')
          .eq('key', key)
          .maybeSingle();

        if (error) {
          if (error.code === '42P01') {
            this.isSupabaseTableReady = false;
          }
        } else if (data && Number(data.expires_at) > now) {
          const otp: StoredOtp = {
            codeHash: data.code_hash,
            codePlain: data.code_plain,
            channel: data.channel,
            destination: data.destination,
            purpose: data.purpose,
            expiresAt: Number(data.expires_at),
            attempts: data.attempts || 0,
            lastSentAt: Number(data.last_sent_at),
          };
          this.memOtps.set(key, otp);
          this.flushOtpsToDisk();
          return otp;
        }
      } catch {
        // Graceful fallback
      }
    }

    return null;
  }

  public getOtpSync(key: string): StoredOtp | null {
    const now = Date.now();
    const mem = this.memOtps.get(key);
    if (mem && mem.expiresAt > now) return mem;
    this.hydrateFromDisk();
    const disk = this.memOtps.get(key);
    if (disk && disk.expiresAt > now) return disk;
    return null;
  }

  public async setOtp(key: string, record: StoredOtp): Promise<void> {
    this.memOtps.set(key, record);
    this.flushOtpsToDisk();

    if (this.supabase && this.isSupabaseTableReady) {
      try {
        await this.supabase.from('auth_otps').upsert(
          {
            key,
            code_hash: record.codeHash,
            code_plain: record.codePlain || null,
            channel: record.channel,
            destination: record.destination,
            purpose: record.purpose,
            expires_at: record.expiresAt,
            attempts: record.attempts,
            last_sent_at: record.lastSentAt,
          },
          { onConflict: 'key' }
        );
      } catch {
        // Fallback safely
      }
    }
  }

  public async deleteOtp(key: string): Promise<void> {
    this.memOtps.delete(key);
    this.flushOtpsToDisk();

    if (this.supabase && this.isSupabaseTableReady) {
      try {
        await this.supabase.from('auth_otps').delete().eq('key', key);
      } catch {
        // Fallback safely
      }
    }
  }

  public getOtpCount(): number {
    this.hydrateFromDisk();
    return this.memOtps.size;
  }
}

export const authStore = new AuthStoreService();
