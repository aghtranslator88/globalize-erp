/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  currentRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  currentRole,
  children,
  fallback = null
}) => {
  if (allowedRoles.includes(currentRole)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};

export default RoleGuard;
