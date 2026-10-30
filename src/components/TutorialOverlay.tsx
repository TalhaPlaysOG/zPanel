import React from 'react';

export const TutorialOverlay: React.FC<{ onComplete: () => void; panelName: string }> = ({ onComplete }) => {
  React.useEffect(() => {
    onComplete();
  }, [onComplete]);
  return null;
};
