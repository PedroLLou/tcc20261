import React from 'react';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Carregando...' }) => (
  <p role="status">{message}</p>
);

export default LoadingState;
