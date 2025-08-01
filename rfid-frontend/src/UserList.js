import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AddUser from './AddUser';

function UserList() {
  const [users, setUsers] = useState([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  const fetchUsers = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/users`, getAuthHeaders())
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  };

  const deleteUser = (id) => {
    axios.delete(`${process.env.REACT_APP_API_URL}/api/users/${id}`, getAuthHeaders())
      .then(() => fetchUsers());
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="user-management">
      <AddUser onUserAdded={fetchUsers} />
      <h2>RFID Users</h2>
      <div className="user-list">
        {users.map(u => (
          <div key={u.id} className="user-card">
            <div className="user-info">
              <h3>{u.name}</h3>
              <p>Email: {u.email}</p>
              <p>Tag ID: {u.tag_id || 'Not assigned'}</p>
              <p>Status: {u.status}</p>
              <p>Balance: ${parseFloat(u.balance || 0).toFixed(2)}</p>
            </div>
            <button onClick={() => deleteUser(u.id)} className="delete-btn">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserList;
