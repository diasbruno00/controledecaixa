"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'bootstrap/dist/css/bootstrap.min.css';
import { createClient } from '@supabase/supabase-js';

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

  const carregarCaixa = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('controle_caixa')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) setLancamentos(data);
    setLoading(false);
  };

  useEffect(() => { carregarCaixa(); }, []);

  // FUNÇÃO PARA TRATAR O NÚMERO (Aceita 1.900,98 ou 1900.98)
  const formatarParaNumero = (valorString: string): number => {
    // Remove pontos de milhar e substitui a vírgula decimal por ponto
    let limpo = valorString.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const valorNum = formatarParaNumero(formData.valor);

    if (isNaN(valorNum)) {
      alert("Por favor, insira um valor numérico válido.");
      setLoading(false);
      return;
    }

    const payload = { 
      data: formData.data, 
      descricao: formData.descricao, 
      tipo: formData.tipo as 'entrada' | 'saida', 
      valor: valorNum 
    };

    if (isEditing !== null) {
      const { error } = await supabase.from('controle_caixa').update(payload).eq('id', isEditing);
      if (!error) setIsEditing(null);
    } else {
      await supabase.from('controle_caixa').insert([payload]);
    }

    setFormData({ ...formData, descricao: '', valor: '' });
    await carregarCaixa();
  };

  const excluir = async (id: number) => {
    if (confirm("Excluir este lançamento?")) {
      const { error } = await supabase.from('controle_caixa').delete().eq('id', id);
      if (!error) carregarCaixa();
    }
  };

  const totalEntradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
  const totalSaidas = lancamentos.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
  const saldoGeral = totalEntradas - totalSaidas;

  const lancamentosFiltrados = lancamentos.filter(l => l.data?.split('T')[0] === filtroData);

  const gerarPDF = () => {
    const doc = new jsPDF();
    doc.text('Arte Mãos e Flores - Caixa', 14, 20);
    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Descrição', 'Tipo', 'Valor']],
      body: lancamentosFiltrados.map(l => [
        new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
        l.descricao,
        l.tipo.toUpperCase(),
        l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]),
    });
    doc.save(`caixa-${filtroData}.pdf`);
  };

  return (
    <div className="container py-4">
      <header className="text-center mb-5 gap-3">
        <h1 className="text-success fw-bold">Arte Mãos e Flores</h1>
        <h4 className="text-secondary small">CONTROLE FINANCEIRO</h4>
      </header>

      <div className="card border-0 shadow-sm bg-success text-white p-3 mb-4 text-center">
        <small className="fw-bold opacity-75">SALDO TOTAL ACUMULADO</small>
        <h2 className="fw-bold mb-0">R$ {saldoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow border-0">
            <div className={`card-header ${isEditing ? 'bg-primary' : 'bg-dark'} text-white py-3`}>
              <h5 className="mb-0 text-center fw-bold">{isEditing ? '📝 Editar' : '💰 Novo Lançamento'}</h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Descrição</label>
                  <input type="text" className="form-control" required value={formData.descricao}
                    onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
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
                  {/* Trocado para type="text" para permitir digitar vírgula e ponto livremente */}
                  <input 
                    type="text" 
                    className="form-control form-control-lg fw-bold text-success" 
                    placeholder="0,00"
                    required
                    value={formData.valor} 
                    onChange={e => setFormData({ ...formData, valor: e.target.value })} 
                  />
                  <small className="text-muted">Use vírgula para centavos (ex: 1900,98)</small>
                </div>
                <button type="submit" disabled={loading} className={`btn ${isEditing ? 'btn-primary' : 'btn-success'} w-100 py-2 fw-bold`}>
                  {loading ? 'Processando...' : 'LANÇAR NO CAIXA'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h6 className="mb-0 fw-bold">LANÇAMENTOS DO DIA</h6>
              <input type="date" className="form-control form-control-sm w-auto" 
                     value={filtroData} onChange={e => setFiltroData(e.target.value)} />
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-center">
                <thead className="table-light">
                  <tr>
                    <th className="text-start ps-4">Descrição</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosFiltrados.length === 0 ? (
                    <tr><td colSpan={3} className="py-5 text-muted">Vazio.</td></tr>
                  ) : (
                    lancamentosFiltrados.map(l => (
                      <tr key={l.id}>
                        <td className="text-start ps-4 text-dark">{l.descricao}</td>
                        <td className={`fw-bold ${l.tipo === 'entrada' ? 'text-success' : 'text-danger'}`}>
                          {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <div className="btn-group">
                            <button onClick={() => {
                              setFormData({data: l.data.split('T')[0], descricao: l.descricao, tipo: l.tipo, valor: l.valor.toString().replace('.', ',')});
                              setIsEditing(l.id);
                            }} className="btn btn-sm btn-outline-primary px-2">Editar</button>
                            <button onClick={() => excluir(l.id)} className="btn btn-sm btn-outline-danger px-2">X</button>
                          </div>
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
    </div>
  );
}