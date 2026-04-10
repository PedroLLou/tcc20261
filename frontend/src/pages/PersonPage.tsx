import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Person {
  id: number;
  name: string;
  age: number;
  email: string;
}

interface ListagemProps {
  onGoToCadastro: (person?: Person) => void;
}

const PersonPage: React.FC<ListagemProps> = ({ onGoToCadastro }) => {
  const [persons, setPersons] = useState<Person[]>([]);

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

  return (
    <div className="page-background">
      <div className="header-container">
        <h1 className="page-title">Pessoas</h1>
        <button onClick={() => onGoToCadastro()} className="btn-add">+ Adicionar</button>
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
                  <button onClick={() => onGoToCadastro(person)} className="btn-edit">Editar</button>
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
    </div>
  );
};

export default PersonPage;