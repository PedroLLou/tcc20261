import React, { useState, useEffect } from 'react';
import api from '../services/api';
import CadastroPessoa, { Person } from './CadastroPessoa'; 

const PersonPage: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  
  // Controle da Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);

  const fetchPersons = async () => {
    try {
      const response = await api.get('/persons');
      setPersons(response.data);
    } catch (err) {
      console.error('Erro ao buscar', err);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const handleDelete = async (id: number) => {
    if(window.confirm('Excluir registro?')) {
      await api.delete(`/persons/${id}`);
      fetchPersons();
    }
  };

  const handleOpenNew = () => {
    setPersonToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (person: Person) => {
    setPersonToEdit(person);
    setIsModalOpen(true);
  };

  return (
    <div className="page-background">
      <div className="header-container">
        <h1 className="page-title">Pessoas</h1>
        <button onClick={handleOpenNew} className="btn-add">+ Adicionar</button>
      </div>

      <div className="card-listagem">
        <table className="custom-table">
          <thead>
            <tr>
              <th className="custom-th">ID</th>
              <th className="custom-th">Nome</th>
              <th className="custom-th">Idade</th>
              <th className="custom-th">E-mail</th>
              <th className="custom-th">Ações</th>
            </tr>
          </thead>
          <tbody>
            {persons.map(person => (
              <tr key={person.id} className="custom-tr">
                <td className="custom-td">{person.id}</td>
                <td className="custom-td">{person.name}</td>
                <td className="custom-td">{person.age}</td>
                <td className="custom-td">{person.email}</td>
                <td className="custom-td">
                  <button onClick={() => handleOpenEdit(person)} className="btn-edit">Editar</button>
                  <button onClick={() => handleDelete(person.id)} className="btn-delete">Excluir</button>
                </td>
              </tr>
            ))}
            {persons.length === 0 && (
              <tr>
                <td colSpan={5} className="custom-td" style={{ textAlign: 'center', color: '#999' }}>
                  Nenhuma pessoa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AQUI ESTÁ A MODAL */}
      <CadastroPessoa 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchPersons} 
        personToEdit={personToEdit} 
      />

    </div>
  );
};

export default PersonPage;