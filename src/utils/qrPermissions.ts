/**
 * Role-Based Access Control for QR Code Scanner (Hospital Clinical Protocol)
 * Only Receptionist and Nurse roles can access and use the Electronic Health ID QR Scanner.
 * Doctor, Admin, Patient, and other staff (Pharmacist, Lab Tech) are strictly unauthorized.
 */
export function canUserScanQR(
  activeRole?: string | null,
  primaryRole?: string | null,
  staffSubRole?: string | null
): boolean {
  // Strict exclusions for Doctor, Admin, and Patient
  if (activeRole === 'doctor' || activeRole === 'admin' || activeRole === 'patient') {
    return false;
  }
  if (primaryRole === 'doctor' || primaryRole === 'admin' || primaryRole === 'patient') {
    return false;
  }

  // Whitelisted roles: Nurse and Receptionist only
  if (activeRole === 'nurse' || activeRole === 'receptionist') {
    return true;
  }

  if (primaryRole === 'staff' && (staffSubRole === 'nurse' || staffSubRole === 'receptionist')) {
    return true;
  }

  return false;
}
