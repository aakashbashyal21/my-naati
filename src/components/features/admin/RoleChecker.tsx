import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { checkUserRole, updateUserRole, getAllUsersWithRoles } from '../../../utils/adminHelper';
import { Button } from '../../shared/ui/Button';

const RoleChecker: React.FC = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkCurrentUserRole();
      loadAllUsers();
    }
  }, [user]);

  const checkCurrentUserRole = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const role = await checkUserRole(user.email);
      setUserRole(role);

    } catch (error) {
      console.error('Error checking role:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await getAllUsersWithRoles();
      setAllUsers(users);

    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const makeSuperAdmin = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      await updateUserRole(user.email, 'super_admin');
      await checkCurrentUserRole();
      await loadAllUsers();
      alert('Role updated to super_admin!');
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error updating role');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to check your role.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Role Checker</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current User</h2>
        <div className="space-y-2">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Role:</strong> {userRole?.role || 'Loading...'}</p>
          <p><strong>Created:</strong> {userRole?.created_at ? new Date(userRole.created_at).toLocaleString() : 'N/A'}</p>
        </div>
        
        <div className="mt-4">
          <Button
            onClick={makeSuperAdmin}
            disabled={loading || userRole?.role === 'super_admin'}
            variant="primary"
          >
            {loading ? 'Updating...' : 'Make Super Admin'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">All Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Role</th>
                <th className="text-left py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleChecker; 