import React, { useState } from 'react';
import api from '../services/api';

const PersonPage: React.FC = () => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/persons', { name, age: Number(age) });
      setMessage('Person created successfully!');
      setName('');
      setAge('');
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Error creating person');
    }
  };

  return (
    <div>
      <h1>Create Person</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          required
        />
        <input
          type="number"
          value={age}
          onChange={e => setAge(e.target.value)}
          placeholder="Age"
          required
        />
        <button type="submit">Save</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default PersonPage;
