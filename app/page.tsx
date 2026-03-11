"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Lancamento {
  id: number;
  data: string;
  descricao: string;
  tipo: 'entrada' | 'saida';
  valor: number;
}

export default function CadernoCaixa() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    tipo: 'entrada',
    valor: ''
  });
  
  // NOVO: Estado para o filtro de data (inicia com a data de hoje)
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const salvos = localStorage.getItem('caixa_arte_maos');
    if (salvos) setLancamentos(JSON.parse(salvos));
  }, []);

  useEffect(() => {
    localStorage.setItem('caixa_arte_maos', JSON.stringify(lancamentos));
  }, [lancamentos]);

  // Cálculos baseados em TODOS os lançamentos (Saldo Geral)
  const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
  const totalSaidas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
  const saldoGeral = totalEntradas - totalSaidas;

  // FILTRAGEM: Registros que aparecem na tabela
  const lancamentosFiltrados = lancamentos.filter(l => l.data === filtroData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(formData.valor);
    if (!valorNum || valorNum <= 0) return alert("Insira um valor válido");

    if (isEditing !== null) {
      setLancamentos(prev => prev.map(l => 
        l.id === isEditing ? { ...formData, id: isEditing, valor: valorNum, tipo: formData.tipo as 'entrada' | 'saida' } : l
      ));
      setIsEditing(null);
    } else {
      const novo: Lancamento = {
        id: Date.now(),
        data: formData.data,
        descricao: formData.descricao,
        tipo: formData.tipo as 'entrada' | 'saida',
        valor: valorNum
      };
      setLancamentos([novo, ...lancamentos]);
    }
    setFormData({ ...formData, descricao: '', valor: '' });
  };

  const prepararEdicao = (l: Lancamento) => {
    setFormData({ data: l.data, descricao: l.descricao, tipo: l.tipo, valor: l.valor.toString() });
    setIsEditing(l.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluir = (id: number) => {
    if (confirm("Deseja apagar este lançamento?")) {
      setLancamentos(lancamentos.filter(l => l.id !== id));
    }
  };

  const gerarPDFCaixa = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 167, 69);
    doc.text('Arte Mãos e Flores', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Relatório Financeiro - Dia Selecionado: ${filtroData}`, 14, 28);
    
    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Descrição', 'Tipo', 'Valor']],
      body: lancamentosFiltrados.map(l => [
        new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}),
        l.descricao,
        l.tipo.toUpperCase(),
        `R$ ${l.valor.toFixed(2)}`
      ]),
      headStyles: { fillColor: [40, 167, 69] }
    });
    doc.save(`caixa-${filtroData}.pdf`);
  };

  return (
    <div className="container py-4">
      <header className="d-flex justify-content-center align-items-center mb-5 border-bottom pb-4 flex-wrap gap-3">
        <Image src="/logo.png" alt="Logo" width={65} height={65} className="shadow-sm rounded-circle"
               onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="text-center text-md-start">
          <h1 className="text-success fw-bold mb-0">Arte Mãos e Flores</h1>
          <h4 className="text-secondary text-uppercase small mb-0 fw-semibold">Controle de Caixa</h4>
        </div>
      </header>

      {/* SALDO GERAL (Sempre visível) */}
      <div className="row g-3 mb-4 text-center">
        <div className="col-12">
          <div className="card border-0 shadow-sm bg-success text-white p-3">
            <small className="fw-bold opacity-75 text-uppercase">Saldo Geral Acumulado</small>
            <h2 className="fw-bold mb-0">R$ {saldoGeral.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* FORMULÁRIO */}
        <div className="col-lg-4">
          <div className={`card shadow border-0 ${isEditing ? 'border-primary' : ''}`}>
            <div className={`card-header ${isEditing ? 'bg-primary' : 'bg-dark'} text-white py-3 text-center`}>
              <h5 className="mb-0 fw-bold">{isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Data</label>
                  <input type="date" className="form-control" value={formData.data} required
                    onChange={e => setFormData({ ...formData, data: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Descrição</label>
                  <input type="text" className="form-control" placeholder="Ex: Venda Arranjo" required
                    value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Tipo</label>
                  <select className="form-select" value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida' })}>
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Valor (R$)</label>
                  <input type="number" step="0.01" className="form-control form-control-lg fw-bold text-success" required
                    value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
                </div>
                <button type="submit" className={`btn ${isEditing ? 'btn-primary' : 'btn-success'} w-100 py-2 fw-bold`}>
                  {isEditing ? 'ATUALIZAR' : 'LANCAR'}
                </button>
                {isEditing && (
                  <button type="button" onClick={() => {setIsEditing(null); setFormData({...formData, descricao: '', valor: ''})}} 
                          className="btn btn-link w-100 mt-2 text-muted small">Cancelar</button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* LISTAGEM COM FILTRO */}
        <div className="col-lg-8">
          <div className="card border-0 shadow">
            <div className="card-header bg-white py-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0 fw-bold text-secondary">Histórico do Caderno</h5>
                <div className="d-flex align-items-center gap-2">
                  <span className="small text-muted fw-bold text-nowrap">Ver dia:</span>
                  <input type="date" className="form-control form-control-sm border-success shadow-sm" 
                         value={filtroData} onChange={e => setFiltroData(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-center">
                <thead className="table-light">
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosFiltrados.length === 0 ? (
                    <tr><td colSpan={4} className="py-5 text-muted">Nenhum lançamento para esta data.</td></tr>
                  ) : (
                    lancamentosFiltrados.map(l => (
                      <tr key={l.id}>
                        <td className="small">{new Date(l.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                        <td className="text-start fw-semibold ps-4">{l.descricao}</td>
                        <td className={`fw-bold ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                          {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toFixed(2)}
                        </td>
                        <td>
                          <div className="btn-group">
                            <button onClick={() => prepararEdicao(l)} className="btn btn-sm btn-outline-primary px-2 py-0">Editar</button>
                            <button onClick={() => excluir(l.id)} className="btn btn-sm btn-outline-danger px-2 py-0">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {lancamentosFiltrados.length > 0 && (
              <div className="card-footer bg-white border-0 py-3">
                <button onClick={gerarPDFCaixa} className="btn btn-dark btn-sm w-100 fw-bold">
                  🖨️ GERAR PDF DESTE DIA ({filtroData})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}