'use client';

import { CreateEnrollmentForm } from '@/features/enrollment/enrollment-actions';
import type { SchoolOption } from '@/features/enrollment/enrollment-form-model';
import type { FamilyDetail } from './admin-families-api';

export function AdminFamilyEnrollmentForm({
  family,
  schools,
}: {
  family: FamilyDetail;
  schools: SchoolOption[];
}) {
  const father = family.parents.find((parent) => parent.parentType === 'FATHER') ?? null;
  const mother = family.parents.find((parent) => parent.parentType === 'MOTHER') ?? null;
  const guardian =
    family.parents.find((parent) => parent.isPrimaryContact) ?? father ?? mother ?? null;
  const address = family.addresses.find((item) => item.isActive) ?? family.addresses[0];
  const emergency =
    family.emergencyContacts.find((item) => item.isActive) ?? family.emergencyContacts[0];

  return (
    <CreateEnrollmentForm
      adminFamilyId={family.id}
      schools={schools}
      existingStudents={[]}
      guardianPhone={family.primaryPhone ?? guardian?.phoneNumber ?? ''}
      savedParents={{
        father: father
          ? {
              firstName: father.firstName,
              lastName: father.lastName,
              nationalId: father.nationalId,
              phoneNumber: father.phoneNumber,
            }
          : null,
        mother: mother
          ? {
              firstName: mother.firstName,
              lastName: mother.lastName,
              nationalId: mother.nationalId,
              phoneNumber: mother.phoneNumber,
            }
          : null,
      }}
      defaults={{
        guardian: guardian
          ? {
              firstName: guardian.firstName,
              lastName: guardian.lastName,
              nationalId: guardian.nationalId,
              relationshipType: guardian.parentType === 'MOTHER' ? 'MOTHER' : 'FATHER',
            }
          : undefined,
        address: address
          ? {
              title: address.title,
              province: address.province,
              city: address.city,
              streetAddress: address.streetAddress,
              postalCode: address.postalCode ?? undefined,
              latitude: address.latitude ?? undefined,
              longitude: address.longitude ?? undefined,
            }
          : undefined,
        emergencyContact: emergency
          ? {
              firstName: emergency.firstName,
              lastName: emergency.lastName,
              relationship: emergency.relationship,
              phoneNumber: emergency.phoneNumber,
            }
          : undefined,
      }}
    />
  );
}
