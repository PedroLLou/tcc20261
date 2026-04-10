import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Person {
  id: number;
  name: string;
  age: number;
  email: string;
}

interface CadastroProps {
  onBack: () => void;
  personToEdit?: Person | null;
}

const CadastroPessoa: React.FC<CadastroProps> = ({ onBack, personToEdit }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setAge(personToEdit.age.toString());
      setEmail(personToEdit.email);
      setPassword(''); 
    }}, [personToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const personData = { name, age: Number(age), email, password };
      if (personToEdit) {
        await api.put(`/persons/${personToEdit.id}`, personData);
      } else {
        await api.post('/persons', personData);
      }
      onBack();
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Erro ao salvar'}`);
    }
  };

  return (
    <div className="page-background">
      <div className="header-container">
        <h1 className="page-title">{personToEdit ? 'Editar Cadastro' : 'Novo Cadastro'}</h1>
        <button onClick={onBack} className="btn-back">⬅ Voltar para Listagem</button>
      </div>

      <div className="card-cadastro">
        <form onSubmit={handleSubmit} className="form-container">
          <div className="input-group">
            <label className="form-label">Nome Completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="form-input" />
          </div>
          
          <div className="row-grid">
            <div className="input-group">
              <label className="form-label">Idade</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} required className="form-input" />
            </div>
            <div className="input-group">
              <label className="form-label">E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="form-input" />
            </div>
          </div>

          <div className="input-group">
            <label className="form-label">Senha {(!personToEdit) && '*'}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!personToEdit} className="form-input" />
          </div>

          {message && <div style={{color: 'red', marginBottom: '15px'}}>{message}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="submit" className="btn-save">
              {personToEdit ? 'Atualizar Dados' : 'Salvar Pessoa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CadastroPessoa;