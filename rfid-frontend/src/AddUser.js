import React, { useState } from 'react';
import axios from 'axios';

function AddUser({ onUserAdded }) {
  const [name, setName] = useState('');
  const [tagId, setTagId] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`${process.env.REACT_APP_API_URL}/api/users`, {
      name,
      tag_id: tagId,
      email,
      status: 'active',
      balance: 0
    });
    setName('');
    setTagId('');
    setEmail('');
    onUserAdded();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Add User</h3>
      <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
      <input placeholder="Tag ID" value={tagId} onChange={e => setTagId(e.target.value)} required />
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <button type="submit">Add User</button>
    </form>
  );
}

export default AddUser;
