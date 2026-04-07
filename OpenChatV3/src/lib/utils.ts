import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth } from '../firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: any) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const message = error?.message || String(error);
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Create a user-friendly message
  let userMessage = 'An unexpected error occurred. Please try again.';
  if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    userMessage = 'You do not have permission to perform this action. Please check your account status.';
  } else if (message.includes('quota-exceeded')) {
    userMessage = 'The service is currently at capacity. Please try again later.';
  } else if (message.includes('offline')) {
    userMessage = 'You appear to be offline. Please check your internet connection.';
  } else if (message.includes('not-found')) {
    userMessage = 'The requested resource was not found.';
  }

  const finalError = new Error(JSON.stringify(errInfo));
  (finalError as any).userMessage = userMessage;
  throw finalError;
}

export function getUserFriendlyError(error: any): string {
  if (error?.userMessage) return error.userMessage;
  try {
    const parsed = JSON.parse(error.message);
    const message = parsed.error || '';
    if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
      return 'You do not have permission to perform this action.';
    }
    if (message.includes('quota-exceeded')) {
      return 'Service quota exceeded. Please try again later.';
    }
    if (message.includes('offline')) {
      return 'Network error. Please check your connection.';
    }
  } catch (e) {
    // Not a JSON error
  }
  return error?.message || 'An unknown error occurred.';
}
