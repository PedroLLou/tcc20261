import React, { useState, useEffect } from 'react';
import api from '../services/api';

export interface Person {
  id: number;
  name: string;
  age: number;
  email: string;
}

interface CadastroProps {
  isOpen: boolean;           
  onClose: () => void;     
  onSuccess: () => void;    
  personToEdit?: Person | null;
}

const CadastroPessoa: React.FC<CadastroProps> = ({ isOpen, onClose, onSuccess, personToEdit }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  // Toda vez que abrir a modal, limpa ou preenche os dados
  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setAge(personToEdit.age.toString());
      setEmail(personToEdit.email);
      setPassword(''); 
    } else {
      setName('');
      setAge('');
      setEmail('');
      setPassword('');
    }
    setMessage('');
  }, [personToEdit, isOpen]);

  // Se a modal não estiver aberta, retorna null (não renderiza nada)
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const personData = { name, age: Number(age), email, password };
      if (personToEdit) {
        await api.put(`/persons/${personToEdit.id}`, personData);
      } else {
        await api.post('/persons', personData);
      }
      onSuccess(); // Atualiza a listagem
      onClose();   // Fecha a modal
    } catch (err: any) {
      setMessage(`❌ ${err.response?.data?.message || 'Erro ao salvar'}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* Cabeçalho da Modal */}
        <div className="modal-header">
          <h2 className="page-title" style={{ fontSize: '1.4rem' }}>
            {personToEdit ? 'Editar Pessoa' : 'Novo Cadastro'}
          </h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        {/* Corpo da Modal */}
        <div className="modal-body">
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn-save">
                {personToEdit ? 'Atualizar Dados' : 'Salvar Pessoa'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CadastroPessoa;