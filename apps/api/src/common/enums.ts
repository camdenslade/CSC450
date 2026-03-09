// apps/api/src/common/enums.ts

export enum Platform {
    PAYPAL  = 'paypal',
    VENMO   = 'venmo',
    CASHAPP = 'cashapp',
}

export enum FriendStatus {
    PENDING  = 'pending',
    ACCEPTED = 'accepted',
    BLOCKED  = 'blocked',
}

export enum FriendSource {
    CONTACTS = 'contacts',
    IMPORT   = 'import',
    MANUAL   = 'manual',
}

export enum BillStatus {
    OPEN      = 'open',
    SETTLED   = 'settled',
    CANCELLED = 'cancelled',
}

export enum ParticipantState {
    PENDING  = 'pending',
    REMINDED = 'reminded',
    PAID     = 'paid',
}
