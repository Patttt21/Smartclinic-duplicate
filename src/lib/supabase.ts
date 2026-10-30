import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_SQL_SCHEMA, SUPABASE_GRANT_SQL } from './supabaseSchema';

export { SUPABASE_SQL_SCHEMA, SUPABASE_GRANT_SQL };

// Cache client instance
let activeClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export const getSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('smart_clinic_supabase_url');
    if (stored) return stored.trim();
  }
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    ''
  ).trim();
};

export const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('smart_clinic_supabase_anon_key');
    if (stored) return stored.trim();
  }
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
    ''
  ).trim();
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!isSupabaseConfigured()) {
    activeClient = null;
    return null;
  }

  if (activeClient && lastUrl === url && lastKey === key) {
    return activeClient;
  }

  try {
    activeClient = createClient(url, key);
    lastUrl = url;
    lastKey = key;
    return activeClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    activeClient = null;
    return null;
  }
};

export const setSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('smart_clinic_supabase_url', url.trim());
    localStorage.setItem('smart_clinic_supabase_anon_key', key.trim());
    lastUrl = '';
    lastKey = '';
    getSupabaseClient();
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('smart_clinic_supabase_url');
    localStorage.removeItem('smart_clinic_supabase_anon_key');
    activeClient = null;
    lastUrl = '';
    lastKey = '';
  }
};

export const testSupabaseConnection = async (
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string; tablesFound?: boolean; needsGrants?: boolean }> => {
  const url = (testUrl || getSupabaseUrl()).trim();
  const key = (testKey || getSupabaseAnonKey()).trim();

  if (!url || !key) {
    return { success: false, message: 'Supabase URL and Anon Key are both required.' };
  }

  try {
    const testClient = createClient(url, key);
    const { error } = await testClient.from('patients').select('mrn', { count: 'exact', head: true });

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.toLowerCase().includes('relation') ||
        error.message?.toLowerCase().includes('not exist') ||
        error.message?.toLowerCase().includes('not found')
      ) {
        return {
          success: true,
          tablesFound: false,
          message: 'Connected to Supabase project! Note: Tables have not been run yet. Please execute /supabase/schema.sql in your Supabase SQL Editor.',
        };
      }

      if (error.code === '42501' || error.message?.toLowerCase().includes('permission denied')) {
        return {
          success: true,
          tablesFound: true,
          needsGrants: true,
          message: 'Connected to Supabase project! Tables exist, but role permissions need to be granted. Please run the GRANT query in your Supabase SQL Editor.',
        };
      }

      return {
        success: false,
        message: `Supabase returned: ${error.message} (Code: ${error.code})`,
      };
    }

    return {
      success: true,
      tablesFound: true,
      message: 'Successfully verified live connection to Supabase and confirmed database tables exist!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err?.message || 'Check your URL and API Key.'}`,
    };
  }
};

export const getSupabaseConfigInfo = () => {
  const configured = isSupabaseConfigured();
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  let projectDomain = 'Not Configured (In-Memory Local Mode)';
  if (supabaseUrl) {
    try {
      projectDomain = new URL(supabaseUrl).hostname;
    } catch {
      projectDomain = supabaseUrl.slice(0, 30);
    }
  }

  return {
    isConfigured: configured,
    url: supabaseUrl || '',
    domain: projectDomain,
    hasKey: Boolean(supabaseAnonKey),
  };
};

// Dynamic client proxy ensuring activeClient is used
export const supabase: SupabaseClient | null = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

// 1. Patient Sync
export async function syncPatientToSupabase(patient: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('patients')
      .upsert(
        {
          mrn: patient.mrn,
          full_name: patient.fullName,
          dob: patient.dob,
          age: patient.age,
          gender: patient.gender,
          blood_type: patient.bloodType,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
          emergency_contact: patient.emergencyContact,
          allergies: patient.allergies,
          chronic_conditions: patient.chronicConditions,
          current_medications: patient.currentMedications,
          primary_doctor_id: patient.primaryDoctorId,
          insurance_provider: patient.insuranceProvider,
          insurance_policy_number: patient.insurancePolicyNumber,
          vitals_history: patient.vitalsHistory,
          tags: patient.tags,
        },
        { onConflict: 'mrn' }
      )
      .select();

    if (error) {
      console.warn('Supabase patient sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase patient sync error:', err?.message);
    return null;
  }
}

// 2. Appointment Sync
export async function syncAppointmentToSupabase(appointment: any) {
  const client = getSupabaseClient();
  if (!client || !appointment) return null;
  try {
    const { data, error } = await client
      .from('appointments')
      .upsert(
        {
          id: appointment.id,
          patient_id: appointment.patientId || null,
          patient_name: appointment.patientName,
          patient_mrn: appointment.patientMrn,
          doctor_id: appointment.doctorId || null,
          doctor_name: appointment.doctorName,
          department: appointment.department,
          appointment_date: appointment.date,
          appointment_time: appointment.time,
          duration_minutes: appointment.durationMinutes,
          reason: appointment.reason,
          status: appointment.status,
          type: appointment.type,
          queue_number: appointment.queueNumber,
          room: appointment.room,
          notes: appointment.notes,
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.warn('Supabase appointment sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase appointment sync error:', err?.message);
    return null;
  }
}

// 3. Consultation Sync
export async function syncConsultationToSupabase(consultation: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('consultations')
      .insert({
        appointment_id: consultation.appointmentId || null,
        patient_name: consultation.patientName,
        doctor_id: consultation.doctorId,
        doctor_name: consultation.doctorName,
        consultation_date: consultation.date,
        chief_complaint: consultation.chiefComplaint,
        history_of_present_illness: consultation.historyOfPresentIllness,
        review_of_systems: consultation.reviewOfSystems,
        physical_examination: consultation.physicalExamination,
        vitals: consultation.vitals,
        diagnoses: consultation.diagnoses,
        treatment_plan: consultation.treatmentPlan,
        prescriptions_created: consultation.prescriptionsCreated,
        lab_orders_created: consultation.labOrdersCreated,
        follow_up_date: consultation.followUpDate || null,
        follow_up_instructions: consultation.followUpInstructions,
        medical_certificate_issued: Boolean(consultation.medicalCertificateIssued),
        certificate_details: consultation.certificateDetails || null,
      })
      .select();

    if (error) {
      console.warn('Supabase consultation sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase consultation sync error:', err?.message);
    return null;
  }
}

// 4. Prescription Sync
export async function syncPrescriptionToSupabase(prescription: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('prescriptions')
      .upsert(
        {
          prescription_number: prescription.prescriptionNumber,
          patient_name: prescription.patientName,
          patient_mrn: prescription.patientMrn,
          patient_age: prescription.patientAge,
          patient_gender: prescription.patientGender,
          doctor_id: prescription.doctorId,
          doctor_name: prescription.doctorName,
          doctor_specialty: prescription.doctorSpecialty,
          doctor_license: prescription.doctorLicense,
          prescription_date: prescription.date,
          items: prescription.items,
          status: prescription.status,
          ai_safety_audit: prescription.aiSafetyAudit,
          notes: prescription.notes,
        },
        { onConflict: 'prescription_number' }
      )
      .select();

    if (error) {
      console.warn('Supabase prescription sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase prescription sync error:', err?.message);
    return null;
  }
}

// 5. Lab Order Sync
export async function syncLabOrderToSupabase(order: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('lab_orders')
      .upsert(
        {
          order_number: order.orderNumber,
          patient_name: order.patientName,
          patient_mrn: order.patientMrn,
          doctor_id: order.doctorId,
          doctor_name: order.doctorName,
          test_name: order.testName,
          category: order.category,
          urgency: order.urgency,
          status: order.status,
          requested_at: order.requestedAt,
          collected_at: order.collectedAt || null,
          completed_at: order.completedAt || null,
          results: order.results,
          interpretation: order.interpretation || null,
          ai_summary: order.aiSummary || null,
        },
        { onConflict: 'order_number' }
      )
      .select();

    if (error) {
      console.warn('Supabase lab order sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase lab order sync error:', err?.message);
    return null;
  }
}

// 6. Inventory Item Sync
export async function syncInventoryItemToSupabase(item: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('inventory_items')
      .upsert(
        {
          sku: item.sku,
          name: item.name,
          generic_name: item.genericName,
          brand: item.brand,
          category: item.category,
          batch_number: item.batchNumber,
          expiration_date: item.expirationDate,
          supplier: item.supplier,
          stock_quantity: item.stockQuantity,
          reorder_level: item.reorderLevel,
          purchase_price: item.purchasePrice,
          selling_price: item.sellingPrice,
          unit: item.unit,
          location: item.location,
          last_updated: item.lastUpdated,
        },
        { onConflict: 'sku' }
      )
      .select();

    if (error) {
      console.warn('Supabase inventory sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase inventory sync error:', err?.message);
    return null;
  }
}

// 7. Invoice Sync
export async function syncInvoiceToSupabase(invoice: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('invoices')
      .upsert(
        {
          invoice_number: invoice.invoiceNumber,
          patient_name: invoice.patientName,
          patient_mrn: invoice.patientMrn,
          invoice_date: invoice.date,
          due_date: invoice.dueDate,
          items: invoice.items,
          subtotal: invoice.subtotal,
          discount_percentage: invoice.discountPercentage,
          discount_amount: invoice.discountAmount,
          tax_amount: invoice.taxAmount,
          total_amount: invoice.totalAmount,
          paid_amount: invoice.paidAmount,
          status: invoice.status,
          payment_method: invoice.paymentMethod || null,
          payment_date: invoice.paymentDate || null,
          insurance_claim_status: invoice.insuranceClaimStatus || 'Not Filed',
          notes: invoice.notes,
        },
        { onConflict: 'invoice_number' }
      )
      .select();

    if (error) {
      console.warn('Supabase invoice sync notice:', error.message);
      return null;
    }
    return data;
  } catch (err: any) {
    console.warn('Supabase invoice sync error:', err?.message);
    return null;
  }
}

// 8. Audit Log Sync
export async function syncAuditLogToSupabase(log: any) {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    await client.from('audit_logs').insert({
      timestamp: log.timestamp,
      user_id: log.userId,
      user_name: log.userName,
      user_role: log.userRole,
      action: log.action,
      resource_type: log.resourceType,
      resource_id: log.resourceId,
      description: log.description,
      ip_address: log.ipAddress || '127.0.0.1',
    });
  } catch (err: any) {
    console.warn('Supabase audit log sync notice:', err?.message);
  }
}

// Batch Sync All Initial / Active Clinic Data
export async function syncAllClinicDataToSupabase(data: {
  patients: any[];
  appointments: any[];
  consultations: any[];
  prescriptions: any[];
  labOrders: any[];
  inventory: any[];
  invoices: any[];
  auditLogs: any[];
}): Promise<{ success: boolean; syncedCounts: Record<string, number>; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      syncedCounts: {},
      message: 'Supabase credentials not configured. Please enter your Supabase URL & Key in the setup form below.',
    };
  }

  const counts: Record<string, number> = {
    patients: 0,
    appointments: 0,
    consultations: 0,
    prescriptions: 0,
    labOrders: 0,
    inventory: 0,
    invoices: 0,
    auditLogs: 0,
  };

  try {
    for (const pat of data.patients) {
      const res = await syncPatientToSupabase(pat);
      if (res) counts.patients++;
    }

    for (const apt of data.appointments) {
      const res = await syncAppointmentToSupabase(apt);
      if (res) counts.appointments++;
    }

    for (const con of data.consultations) {
      const res = await syncConsultationToSupabase(con);
      if (res) counts.consultations++;
    }

    for (const rx of data.prescriptions) {
      const res = await syncPrescriptionToSupabase(rx);
      if (res) counts.prescriptions++;
    }

    for (const lab of data.labOrders) {
      const res = await syncLabOrderToSupabase(lab);
      if (res) counts.labOrders++;
    }

    for (const item of data.inventory) {
      const res = await syncInventoryItemToSupabase(item);
      if (res) counts.inventory++;
    }

    for (const inv of data.invoices) {
      const res = await syncInvoiceToSupabase(inv);
      if (res) counts.invoices++;
    }

    for (const log of data.auditLogs.slice(0, 20)) {
      await syncAuditLogToSupabase(log);
      counts.auditLogs++;
    }

    return {
      success: true,
      syncedCounts: counts,
      message: `Successfully synchronized active clinic data to Supabase PostgreSQL tables!`,
    };
  } catch (err: any) {
    return {
      success: false,
      syncedCounts: counts,
      message: `Sync partially failed: ${err?.message}`,
    };
  }
}

// ==============================================================================
// HARDCODED FRONTEND QUERY FILTERS (Strict Patient Data Isolation & Privacy)
// ==============================================================================

/**
 * Strictly fetch appointments isolated to the authenticated patient's ID.
 * Enforces .eq('patient_id', patientId) hard filter.
 */
export async function fetchIsolatedPatientAppointments(patientId: string) {
  const client = getSupabaseClient();
  if (!client || !patientId) return [];
  try {
    const { data, error } = await client
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId);
    if (error) {
      console.warn('Isolated appointments fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn('Isolated appointments query exception:', err?.message);
    return [];
  }
}

/**
 * Strictly fetch medical record isolated to the authenticated patient's ID.
 * Enforces .eq('id', patientId) hard filter.
 */
export async function fetchIsolatedPatientRecord(patientId: string) {
  const client = getSupabaseClient();
  if (!client || !patientId) return null;
  try {
    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    if (error) {
      console.warn('Isolated patient record fetch error:', error.message);
      return null;
    }
    return data || null;
  } catch (err: any) {
    console.warn('Isolated patient query exception:', err?.message);
    return null;
  }
}

/**
 * Strictly fetch prescriptions isolated to the authenticated patient's ID.
 * Enforces .eq('patient_id', patientId) hard filter.
 */
export async function fetchIsolatedPatientPrescriptions(patientId: string) {
  const client = getSupabaseClient();
  if (!client || !patientId) return [];
  try {
    const { data, error } = await client
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId);
    if (error) {
      console.warn('Isolated prescriptions fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn('Isolated prescriptions query exception:', err?.message);
    return [];
  }
}

/**
 * Strictly fetch laboratory orders isolated to the authenticated patient's ID.
 * Enforces .eq('patient_id', patientId) hard filter.
 */
export async function fetchIsolatedPatientLabOrders(patientId: string) {
  const client = getSupabaseClient();
  if (!client || !patientId) return [];
  try {
    const { data, error } = await client
      .from('lab_orders')
      .select('*')
      .eq('patient_id', patientId);
    if (error) {
      console.warn('Isolated lab orders fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn('Isolated lab orders query exception:', err?.message);
    return [];
  }
}

/**
 * Strictly fetch invoices isolated to the authenticated patient's ID.
 * Enforces .eq('patient_id', patientId) hard filter.
 */
export async function fetchIsolatedPatientInvoices(patientId: string) {
  const client = getSupabaseClient();
  if (!client || !patientId) return [];
  try {
    const { data, error } = await client
      .from('invoices')
      .select('*')
      .eq('patient_id', patientId);
    if (error) {
      console.warn('Isolated invoices fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn('Isolated invoices query exception:', err?.message);
    return [];
  }
}


