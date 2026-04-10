import React, { useState } from 'react';
import PersonPage from './pages/PersonPage';
import CadastroPessoa from './pages/CadastroPessoa'; // Importando a tela nova!

function App() {
  // Estado para controlar qual tela está ativa na tela: 'lista' ou 'cadastro'
  const [telaAtual, setTelaAtual] = useState<'lista' | 'cadastro'>('lista');
  
  // Estado para guardar os dados da pessoa se clicarmos em "Editar"
  const [personEdit, setPersonEdit] = useState<any>(null);

  // Função para ir para a tela de cadastro (pode receber uma pessoa ou ir vazio)
  const irParaCadastro = (person: any = null) => {
    setPersonEdit(person);
    setTelaAtual('cadastro');
  };

  // Função para voltar para a lista limpa
  const irParaLista = () => {
    setTelaAtual('lista');
    setPersonEdit(null);
  };

  return (
    <>
      {telaAtual === 'lista' ? (
        <PersonPage onGoToCadastro={irParaCadastro} />
      ) : (
        <CadastroPessoa onBack={irParaLista} personToEdit={personEdit} />
      )}
    </>
  );
}

export default App;