import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingPage from './LandingPage';

const LandingPageWrapper: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  return <LandingPage onGetStarted={handleGetStarted} />;
};

export default LandingPageWrapper; 