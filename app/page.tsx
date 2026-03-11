"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // Importe necessário para a logo

interface Lancamento {
  id: number;
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
}

export default function CadernoCaixa() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    tipo: 'entrada',
    valor: ''
  });

  // Persistência local (LocalStorage)
  useEffect(() => {
    const salvos = localStorage.getItem('caixa_arte_maos');
    if (salvos) setLancamentos(JSON.parse(salvos));
  }, []);

  useEffect(() => {
    localStorage.setItem('caixa_arte_maos', JSON.stringify(lancamentos));
  }, [lancamentos]);

  // Cálculos de Resumo
  const totalEntradas = lancamentos
    .filter(l => l.tipo === 'entrada')
    .reduce((acc, l) => acc + l.valor, 0);

  const totalSaidas = lancamentos
    .filter(l => l.tipo === 'saida')
    .reduce((acc, l) => acc + l.valor, 0);

  const saldo = totalEntradas - totalSaidas;

  const handleLancar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.valor || parseFloat(formData.valor) <= 0) return alert("Insira um valor válido");

    const novo: Lancamento = {
      id: Date.now(),
      data: formData.data,
      descricao: formData.descricao,
      tipo: formData.tipo as 'entrada' | 'saida',
      valor: parseFloat(formData.valor)
    };

    // Adiciona o novo no topo da lista
    setLancamentos([novo, ...lancamentos]);
    setFormData({ ...formData, descricao: '', valor: '' });
  };

  const deletar = (id: number) => {
    if (confirm("Deseja apagar este lançamento do caderno?")) {
      setLancamentos(lancamentos.filter(l => l.id !== id));
    }
  };

  return (
    <div className="container py-4">
      {/* CABEÇALHO COM LOGO */}
      <header className="d-flex justify-content-center align-items-center mb-5 border-bottom pb-4 flex-wrap gap-3">
        <Image 
          src="/logo.png" // Nome da imagem na pasta public
          alt="Logo Arte Mãos e Flores"
          width={70} 
          height={70} 
          className="me-2 shadow-sm rounded-circle"
          style={{ objectFit: 'contain' }}
          // Proteção para não dar erro no build se a imagem não existir
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        <div className="text-center text-md-start">
          <h1 className="text-success fw-bold mb-0">Arte Mãos e Flores</h1>
          <h4 className="text-secondary text-uppercase small mb-0 fw-semibold">Caderno de Lançamentos de Caixa</h4>
        </div>
      </header>

      {/* CARDS DE RESUMO */}
      <div className="row g-3 mb-4 text-center">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body">
              <small className="text-muted text-uppercase fw-bold">Entradas</small>
              <h3 className="text-success fw-bold">R$ {totalEntradas.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-light">
            <div className="card-body">
              <small className="text-muted text-uppercase fw-bold">Saídas</small>
              <h3 className="text-danger fw-bold">R$ {totalSaidas.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-success text-white">
            <div className="card-body">
              <small className="text-uppercase fw-bold opacity-75">Saldo Total</small>
              <h3 className="fw-bold">R$ {saldo.toFixed(2)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* FORMULÁRIO DE LANÇAMENTO */}
        <div className="col-lg-4">
          <div className="card border-0 shadow p-3">
            <h5 className="mb-3 text-success">Lançar no Caixa</h5>
            <form onSubmit={handleLancar}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Data</label>
                <input type="date" className="form-control" value={formData.data} required
                  onChange={e => setFormData({ ...formData, data: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Descrição do Lançamento</label>
                <input type="text" className="form-control" placeholder="Ex: Pagamento Fornecedor de Flores" required
                  value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Operação</label>
                <select className="form-select" value={formData.tipo}
                  onChange={e => setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida' })}>
                  <option value="entrada">Entrada (Venda/Dinheiro (+) )</option>
                  <option value="saida">Saída (Gasto/Pagamento (-) )</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Valor da Transação (R$)</label>
                <input type="number" step="0.01" className="form-control form-control-lg text-success fw-bold" placeholder="0,00" required
                  value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-success w-100 py-2 fw-bold shadow-sm">LANÇAR NO CAIXA</button>
            </form>
          </div>
        </div>

        {/* LISTAGEM (O CADERNO) */}
        <div className="col-lg-8">
          <div className="card border-0 shadow">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th className="text-end">Valor</th>
                    <th className="text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">Nenhum lançamento no caderno.</td></tr>
                  ) : (
                    lancamentos.map(l => (
                      <tr key={l.id}>
                        <td>{new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                        <td className="fw-semibold text-dark">{l.descricao}</td>
                        <td className={`text-end fw-bold ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                          {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toFixed(2)}
                        </td>
                        <td className="text-center">
                          <button onClick={() => deletar(l.id)} className="btn btn-sm btn-outline-secondary border-0">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="text-center mt-5 text-muted small pb-3">
        © {new Date().getFullYear()} Arte Mãos e Flores - Controle Interno
      </footer>
    </div>
  );
}