import React from 'react';
import { CommunicationsSetupPage } from './CommunicationsSetupPage';

// Backward compatibility export
export function EmailSetupPage({ suppliers }) {
  return <CommunicationsSetupPage suppliers={suppliers} />;
}

export default EmailSetupPage;
