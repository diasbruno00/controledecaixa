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
  
  // FILTROS AVANÇADOS
  const [tipoFiltro, setTipoFiltro] = useState<'dia' | 'mes' | 'ano'>('dia');
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());

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
      .order('data', { ascending: true });

    if (!error && data) setLancamentos(data);
    setLoading(false);
  };

  useEffect(() => { carregarCaixa(); }, []);

  const formatarParaNumero = (valorString: string): number => {
    let limpo = valorString.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const valorNum = formatarParaNumero(formData.valor);
    if (isNaN(valorNum)) { alert("Valor inválido"); setLoading(false); return; }

    const payload = { ...formData, valor: valorNum };

    if (isEditing !== null) {
      await supabase.from('controle_caixa').update(payload).eq('id', isEditing);
      setIsEditing(null);
    } else {
      await supabase.from('controle_caixa').insert([payload]);
    }

    setFormData({ ...formData, descricao: '', valor: '' });
    await carregarCaixa();
  };

  const excluir = async (id: number) => {
    if (confirm("Excluir registro?")) {
      await supabase.from('controle_caixa').delete().eq('id', id);
      carregarCaixa();
    }
  };

  // LÓGICA DE FILTRAGEM MULTI-NÍVEL
  const lancamentosFiltrados = lancamentos.filter(l => {
    if (!l.data) return false;
    const dataLimpa = l.data.split('T')[0];
    if (tipoFiltro === 'dia') return dataLimpa === filtroData;
    if (tipoFiltro === 'mes') return dataLimpa.startsWith(filtroMes);
    if (tipoFiltro === 'ano') return dataLimpa.startsWith(filtroAno);
    return false;
  });

  const totalPeriodoEntradas = lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((acc, l) => acc + l.valor, 0);
  const totalPeriodoSaidas = lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + l.valor, 0);
  const saldoPeriodo = totalPeriodoEntradas - totalPeriodoSaidas;

  const gerarPDF = () => {
    const doc = new jsPDF();
    const periodos = { dia: filtroData, mes: filtroMes, ano: filtroAno };
    const titulo = `Relatório ${tipoFiltro.toUpperCase()} - ${periodos[tipoFiltro]}`;
    
    doc.setFontSize(18);
    doc.setTextColor(40, 167, 69);
    doc.text('Arte Mãos e Flores', 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(titulo, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [['Data', 'Descrição', 'Tipo', 'Valor']],
      body: lancamentosFiltrados.map(l => [
        new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR'),
        l.descricao,
        l.tipo.toUpperCase(),
        l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      ]),
      foot: [['', 'TOTAL DO PERÍODO', '', saldoPeriodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })]],
      headStyles: { fillColor: [40, 167, 69] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    doc.save(`${titulo}.pdf`);
  };

  return (
    <div className="container py-4">
      <header className="text-center mb-4">
        <h1 className="text-success fw-bold">Arte Mãos e Flores</h1>
        <div className="badge bg-light text-dark border shadow-sm">Gestão Financeira Profissional</div>
      </header>

      <div className="row g-4">
        {/* LADO ESQUERDO: LANÇAMENTO */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 sticky-top" style={{ top: '20px' }}>
            <div className={`card-header ${isEditing ? 'bg-primary' : 'bg-dark'} text-white text-center fw-bold py-3`}>
              {isEditing ? 'EDITAR DADO' : 'NOVO LANÇAMENTO'}
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="small fw-bold text-muted">Data do Evento</label>
                  <input type="date" className="form-control" value={formData.data} onChange={e => setFormData({ ...formData, data: e.target.value })} />
                </div>
                <div className="mb-3">
                  <label className="small fw-bold text-muted">Descrição</label>
                  <input type="text" className="form-control" placeholder="Ex: Venda de Orquídea" required value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} />
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="small fw-bold text-muted">Tipo</label>
                    <select className="form-select" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}>
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="small fw-bold text-muted">Valor</label>
                    <input type="text" className="form-control fw-bold text-success" placeholder="0,00" value={formData.valor} onChange={e => setFormData({ ...formData, valor: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className={`btn ${isEditing ? 'btn-primary' : 'btn-success'} w-100 fw-bold py-2 shadow-sm`}>
                  {isEditing ? 'ATUALIZAR' : 'REGISTRAR'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: DASHBOARD E LISTA */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="btn-group shadow-sm">
                  {['dia', 'mes', 'ano'].map((t) => (
                    <button key={t} onClick={() => setTipoFiltro(t as any)} 
                      className={`btn btn-sm px-3 ${tipoFiltro === t ? 'btn-success' : 'btn-outline-success'}`}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* INPUT DINÂMICO DE FILTRO */}
                {tipoFiltro === 'dia' && <input type="date" className="form-control form-control-sm w-auto border-success" value={filtroData} onChange={e => setFiltroData(e.target.value)} />}
                {tipoFiltro === 'mes' && <input type="month" className="form-control form-control-sm w-auto border-success" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} />}
                {tipoFiltro === 'ano' && <input type="number" min="2020" max="2099" className="form-control form-control-sm w-auto border-success" value={filtroAno} onChange={e => setFiltroAno(e.target.value)} />}
              </div>
            </div>

            <div className="card-body">
              {/* RESUMO RÁPIDO DO PERÍODO */}
              <div className="row g-2 mb-4">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded border-start border-success border-4 shadow-sm text-center">
                    <small className="text-muted d-block fw-bold">ENTRADAS</small>
                    <span className="text-success h5 fw-bold">R$ {totalPeriodoEntradas.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded border-start border-danger border-4 shadow-sm text-center">
                    <small className="text-muted d-block fw-bold">SAÍDAS</small>
                    <span className="text-danger h5 fw-bold">R$ {totalPeriodoSaidas.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 bg-dark rounded shadow-sm text-center">
                    <small className="text-white-50 d-block fw-bold">SALDO LÍQUIDO</small>
                    <span className="text-white h5 fw-bold">R$ {saldoPeriodo.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: '450px' }}>
                <table className="table table-hover align-middle">
                  <thead className="table-light sticky-top">
                    <tr className="small text-muted text-uppercase">
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Valor</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFiltrados.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-5 text-muted small italic">Nenhum registro para este período.</td></tr>
                    ) : (
                      lancamentosFiltrados.map(l => (
                        <tr key={l.id}>
                          <td className="small text-muted">{new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="fw-bold text-dark">{l.descricao}</td>
                          <td className={l.tipo === 'entrada' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                            {l.tipo === 'entrada' ? '+' : '-'} {l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-end">
                            <button onClick={() => { setFormData({ ...l, valor: l.valor.toString().replace('.', ',') }); setIsEditing(l.id); window.scrollTo(0,0); }} className="btn btn-sm btn-outline-secondary me-2 py-0 px-2">Editar</button>
                            <button onClick={() => excluir(l.id)} className="btn btn-sm btn-outline-danger py-0 px-2">X</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="card-footer bg-white border-0 p-4">
              <button onClick={gerarPDF} className="btn btn-dark w-100 fw-bold py-3 shadow-sm">
                🖨️ EXPORTAR RELATÓRIO {tipoFiltro.toUpperCase()} EM PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}