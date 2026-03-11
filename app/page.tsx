"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'bootstrap/dist/css/bootstrap.min.css';
import { createClient } from '@supabase/supabase-js';

// Inicialização do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [loading, setLoading] = useState(false);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    tipo: 'entrada',
    valor: ''
  });

  // CARREGAR DADOS DA NUVEM
  const carregarCaixa = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('controle_caixa')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
        setLancamentos(data);
    }
    setLoading(false);
  };

  useEffect(() => { carregarCaixa(); }, []);

  // SALVAR OU ATUALIZAR
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const valorNum = parseFloat(formData.valor);

    if (isEditing !== null) {
      const { error } = await supabase
        .from('controle_caixa')
        .update({ 
            data: formData.data, 
            descricao: formData.descricao, 
            tipo: formData.tipo, 
            valor: valorNum 
        })
        .eq('id', isEditing);
      
      if (!error) {
          setIsEditing(null);
          alert("Lançamento atualizado!");
      }
    } else {
      const { error } = await supabase
        .from('controle_caixa')
        .insert([{ 
            data: formData.data, 
            descricao: formData.descricao, 
            tipo: formData.tipo, 
            valor: valorNum 
        }]);
      
      if (!error) alert("Lançamento salvo na nuvem!");
    }

    setFormData({ ...formData, descricao: '', valor: '' });
    await carregarCaixa(); // Força a atualização da lista
  };

  const excluir = async (id: number) => {
    if (confirm("Excluir este lançamento da nuvem?")) {
      const { error } = await supabase.from('controle_caixa').delete().eq('id', id);
      if (!error) carregarCaixa();
    }
  };

  // CÁLCULOS GERAIS
  const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
  const totalSaidas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
  const saldoGeral = totalEntradas - totalSaidas;

  // LÓGICA DE FILTRO CORRIGIDA (split 'T' para evitar erro de fuso horário)
  const lancamentosFiltrados = lancamentos.filter(l => {
      if (!l.data) return false;
      return l.data.split('T')[0] === filtroData;
  });

  const gerarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 167, 69);
    doc.text('Arte Mãos e Flores - Caixa', 14, 20);
    doc.setFontSize(12);
    doc.text(`Relatório do Dia: ${new Date(filtroData + 'T12:00:00').toLocaleDateString('pt-BR')}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Descrição', 'Tipo', 'Valor']],
      body: lancamentosFiltrados.map(l => [
        new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
        l.descricao,
        l.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA',
        `R$ ${l.valor.toFixed(2)}`
      ]),
      headStyles: { fillColor: [40, 167, 69] }
    });
    doc.save(`caixa-${filtroData}.pdf`);
  };

  return (
    <div className="container py-4">
      <header className="d-flex justify-content-center align-items-center mb-5 border-bottom pb-4 gap-3">
        <Image src="/logo.png" alt="Logo" width={60} height={60} onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="text-center text-md-start">
          <h1 className="text-success fw-bold mb-0">Arte Mãos e Flores</h1>
          <h4 className="text-secondary text-uppercase small mb-0">Controle Financeiro na Nuvem</h4>
        </div>
      </header>

      {/* RESUMO FINANCEIRO */}
      <div className="card border-0 shadow-sm bg-success text-white p-3 mb-4 text-center">
        <small className="fw-bold opacity-75">SALDO TOTAL ACUMULADO (GERAL)</small>
        <h2 className="fw-bold mb-0">R$ {saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        <div style={{ height: '20px' }}>
          {loading && <div className="spinner-border spinner-border-sm mt-1"></div>}
        </div>
      </div>

      <div className="row g-4">
        {/* FORMULÁRIO */}
        <div className="col-lg-4">
          <div className={`card shadow border-0 ${isEditing ? 'border-primary' : ''}`}>
            <div className={`card-header ${isEditing ? 'bg-primary' : 'bg-dark'} text-white py-3`}>
              <h5 className="mb-0 text-center fw-bold">{isEditing ? '📝 Editar Lançamento' : '💰 Novo Lançamento'}</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Data</label>
                  <input type="date" className="form-control" value={formData.data} required
                    onChange={e => setFormData({ ...formData, data: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Descrição</label>
                  <input type="text" className="form-control" placeholder="Ex: Venda Buquê" required
                    value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Operação</label>
                  <select className="form-select" value={formData.tipo}
                    onChange={e => setFormData({ ...formData, tipo: e.target.value as 'entrada' | 'saida' })}>
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (-)</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Valor (R$)</label>
                  <input type="number" step="0.01" className="form-control form-control-lg fw-bold text-success" required
                    value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
                </div>
                <button type="submit" disabled={loading} className={`btn ${isEditing ? 'btn-primary' : 'btn-success'} w-100 py-2 fw-bold shadow-sm`}>
                  {isEditing ? 'SALVAR ALTERAÇÕES' : 'LANÇAR NO CAIXA'}
                </button>
                {isEditing && (
                    <button type="button" onClick={() => { setIsEditing(null); setFormData({...formData, descricao: '', valor: ''})}} 
                            className="btn btn-link w-100 mt-2 text-muted text-decoration-none small">Cancelar Edição</button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* LISTAGEM FILTRADA */}
        <div className="col-lg-8">
          <div className="card border-0 shadow">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 flex-wrap gap-2">
              <h5 className="mb-0 fw-bold text-secondary text-uppercase small">Caderno de Lançamentos</h5>
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">Filtrar dia:</span>
                <input type="date" className="form-control form-control-sm border-success shadow-sm" 
                       value={filtroData} onChange={e => setFiltroData(e.target.value)} />
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-center">
                <thead className="table-light">
                  <tr>
                    <th>Data</th>
                    <th className="text-start ps-4">Descrição</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosFiltrados.length === 0 ? (
                    <tr><td colSpan={4} className="py-5 text-muted">Nenhum registro para {new Date(filtroData + 'T12:00:00').toLocaleDateString('pt-BR')}.</td></tr>
                  ) : (
                    lancamentosFiltrados.map(l => (
                      <tr key={l.id}>
                        <td className="small text-muted">{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="text-start fw-semibold ps-4 text-dark">{l.descricao}</td>
                        <td className={`fw-bold ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                          {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toFixed(2)}
                        </td>
                        <td>
                          <div className="btn-group">
                            <button onClick={() => {
                                setFormData({data: l.data.split('T')[0], descricao: l.descricao, tipo: l.tipo, valor: l.valor.toString()});
                                setIsEditing(l.id);
                                window.scrollTo(0,0);
                            }} className="btn btn-sm btn-outline-primary px-2 py-0">Editar</button>
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
              <div className="card-footer bg-white border-0 py-3 text-center">
                <button onClick={gerarPDF} className="btn btn-dark btn-sm w-100 fw-bold shadow-sm">
                  🖨️ IMPRIMIR PDF DESTE DIA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="text-center mt-5 text-muted small pb-4">
        Arte Mãos e Flores - Sistema de Gestão Financeira v3.0
      </footer>
    </div>
  );
}