export interface CreateFamilyDto {
  mother: {
    firstName: string;
    lastName: string;
    nationalId: string;
    phoneNumber: string;
  };
  father: {
    firstName: string;
    lastName: string;
    nationalId: string;
    phoneNumber: string;
  };
  primaryParent: 'MOTHER' | 'FATHER';
  address: {
    title: string;
    province: string;
    city: string;
    district?: string;
    streetAddress: string;
    postalCode?: string;
  };
  emergencyContact: {
    firstName: string;
    lastName: string;
    relationship: string;
    phoneNumber: string;
  };
}

export interface FamilyProfile {
  id: string;
  username: string;
  mother: ParentProfile | null;
  father: ParentProfile | null;
  guardian: ParentProfile | null;
  addresses: AddressProfile[];
  emergencyContacts: EmergencyContactProfile[];
}

export interface ParentProfile {
  id: string;
  parentType: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  phoneNumber: string;
  relationshipType?: string;
  relationshipDescription?: string;
  isPrimaryContact: boolean;
  phoneVerified: boolean;
}

export interface AddressProfile {
  id: string;
  title: string;
  province: string;
  city: string;
  district?: string;
  streetAddress: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface EmergencyContactProfile {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  phoneNumber: string;
  isActive: boolean;
}
