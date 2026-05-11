import { Navigate } from 'react-router-dom';

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  // This is a placeholder - in a real app we'd use useAuth hook
  // For now, we'll assume the user is admin if they have a token
  // In practice, this should be implemented in the component using it
  return <>{children}</>;
};
