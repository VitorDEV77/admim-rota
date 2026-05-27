// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://zfmhhomlsfqbiswepjrv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmbWhob21sc2ZxYmlzd2VwanJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTgyMTIsImV4cCI6MjA5NTM5NDIxMn0.am8M22lQ0d7ZQ8NmzG6lEdGk9_4cwaAfywG1h0HLbBc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// VARIÁVEIS
var membros = [];
var logs = [];
var reciclagens = [];
var policiaisSelecionados = [];
var qraSelecionadoReciclagem = '';

// CONEXÃO
document.getElementById('connectionStatus').innerHTML = '<i class="fas fa-circle" style="color:#0f0;"></i> Online';

// CARREGAR DADOS
carregarTudo();

async function carregarTudo() {
    await carregarMembros();
    await carregarLogs();
    await carregarReciclagens();
}

async function carregarMembros() {
    var resultado = await supabaseClient.from('membros').select('*').order('qra');
    if (resultado.data) {
        membros = resultado.data;
        // CORRIGIR dados antigos
        for (var i = 0; i < membros.length; i++) {
            if (typeof membros[i].cursos === 'string') {
                try { membros[i].cursos = JSON.parse(membros[i].cursos); } catch(e) { membros[i].cursos = []; }
            }
            if (typeof membros[i].advertencias === 'string') {
                try { membros[i].advertencias = JSON.parse(membros[i].advertencias); } catch(e) { membros[i].advertencias = []; }
            }
            if (typeof membros[i].especializacoes === 'string') {
                try { membros[i].especializacoes = JSON.parse(membros[i].especializacoes); } catch(e) { membros[i].especializacoes = []; }
            }
            if (!membros[i].cursos) membros[i].cursos = [];
            if (!membros[i].advertencias) membros[i].advertencias = [];
        }
        mostrarEquipe();
        mostrarDashboard();
        mostrarAdvertencias();
        mostrarCursos();
    }
}

async function carregarLogs() {
    var resultado = await supabaseClient.from('logs').select('*').order('id', { ascending: false }).limit(100);
    if (resultado.data) logs = resultado.data;
}

async function carregarReciclagens() {
    var resultado = await supabaseClient.from('reciclagens').select('*');
    if (resultado.data) {
        reciclagens = resultado.data;
        mostrarReciclagens();
    }
}

// NAVEGAÇÃO
document.addEventListener('DOMContentLoaded', function() {
    var botoes = document.querySelectorAll('.nav-link');
    for (var i = 0; i < botoes.length; i++) {
        botoes[i].addEventListener('click', function(e) {
            e.preventDefault();
            var pagina = this.getAttribute('data-page');
            for (var j = 0; j < botoes.length; j++) botoes[j].classList.remove('active');
            this.classList.add('active');
            var paginas = document.querySelectorAll('.page');
            for (var k = 0; k < paginas.length; k++) paginas[k].classList.remove('active');
            var el = document.getElementById('page-' + pagina);
            if (el) el.classList.add('active');
            if (pagina === 'logs') mostrarLogs();
        });
    }
    document.getElementById('searchEquipe').addEventListener('input', mostrarEquipe);
    document.getElementById('modal').addEventListener('click', function(e) { if (e.target === this) fecharModal(); });
});

// DASHBOARD
function mostrarDashboard() {
    document.getElementById('statTotal').textContent = membros.length;
    var ativos = 0, adv = 0, cur = 0;
    for (var i = 0; i < membros.length; i++) {
        if (membros[i].status === 'Ativo') ativos++;
        var a = membros[i].advertencias;
        if (Array.isArray(a)) adv += a.length;
        var c = membros[i].cursos;
        if (Array.isArray(c)) cur += c.length;
    }
    document.getElementById('statAtivos').textContent = ativos;
    document.getElementById('statAdvertencias').textContent = adv;
    document.getElementById('statCursos').textContent = cur;
}

// EQUIPE
function mostrarEquipe() {
    var tbody = document.getElementById('tabelaEquipe');
    if (!tbody) return;
    var busca = document.getElementById('searchEquipe').value.toLowerCase();
    var lista = membros;
    if (busca) {
        lista = [];
        for (var i = 0; i < membros.length; i++) {
            if (membros[i].qra.toLowerCase().indexOf(busca) !== -1 || membros[i].nome.toLowerCase().indexOf(busca) !== -1) {
                lista.push(membros[i]);
            }
        }
    }
    tbody.innerHTML = '';
    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Nenhum membro</td></tr>';
        return;
    }
    for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        var adv = Array.isArray(m.advertencias) ? m.advertencias.length : 0;
        var cur = Array.isArray(m.cursos) ? m.cursos.length : 0;
        var esp = '-';
        if (Array.isArray(m.especializacoes)) esp = m.especializacoes.join(', ');
        var statusCor = m.status === 'Ativo' ? 'badge-success' : 'badge-warning';
        var row = document.createElement('tr');
        row.innerHTML = 
            '<td><strong style="color:#d4af37;">' + m.qra + '</strong></td>' +
            '<td>' + m.nome + '</td>' +
            '<td><span class="badge badge-info">' + m.patente + '</span></td>' +
            '<td><span class="badge ' + statusCor + '">' + m.status + '</span></td>' +
            '<td style="font-size:12px;">' + esp + '</td>' +
            '<td><span class="badge badge-danger" style="cursor:pointer" onclick="verAdvertenciasMembro(\'' + m.qra + '\')">' + adv + '</span></td>' +
            '<td><span class="badge badge-info" style="cursor:pointer" onclick="verCursosMembro(\'' + m.qra + '\')">' + cur + '</span></td>' +
            '<td>' +
                '<button class="btn btn-sm" onclick="verDetalhes(\'' + m.qra + '\')"><i class="fas fa-eye"></i></button> ' +
                '<button class="btn btn-sm" onclick="editarMembro(\'' + m.qra + '\')"><i class="fas fa-edit"></i></button> ' +
                '<button class="btn btn-sm btn-danger" onclick="deletarMembro(\'' + m.qra + '\')"><i class="fas fa-trash"></i></button>' +
            '</td>';
        tbody.appendChild(row);
    }
}

// CADASTRO
document.getElementById('formCadastro').addEventListener('submit', async function(e) {
    e.preventDefault();
    var qra = document.getElementById('cadQRA').value.trim();
    var nome = document.getElementById('cadNome').value.trim();
    var patente = document.getElementById('cadPatente').value;
    var data = document.getElementById('cadData').value;
    if (!qra || !nome || !patente || !data) { alert('Preencha todos os campos!'); return; }
    
    var especializacoes = [];
    document.querySelectorAll('#checkEspecializacoes input:checked').forEach(function(cb) { especializacoes.push(cb.value); });
    
    var novo = {
        id: Date.now(),
        qra: qra,
        nome: nome,
        patente: patente,
        data_admissao: data,
        status: 'Ativo',
        especializacoes: JSON.stringify(especializacoes),
        cursos: JSON.stringify([]),
        advertencias: JSON.stringify([]),
        observacoes: ''
    };
    
    var resultado = await supabaseClient.from('membros').insert([novo]);
    if (resultado.error) { alert('Erro: ' + resultado.error.message); return; }
    
    await supabaseClient.from('logs').insert([{ data: new Date().toISOString(), acao: 'CADASTRO', detalhes: 'Cadastrou ' + patente + ' ' + nome + ' (QRA: ' + qra + ')' }]);
    alert('✅ Cadastrado!');
    this.reset();
    carregarTudo();
});

// ADVERTÊNCIAS
document.getElementById('formAdvertencia').addEventListener('submit', async function(e) {
    e.preventDefault();
    var qra = document.getElementById('advQRA').value.trim();
    var tipo = document.getElementById('advTipo').value;
    var motivo = document.getElementById('advMotivo').value.trim();
    if (!qra || !tipo || !motivo) { alert('Preencha todos os campos!'); return; }
    
    var idx = -1;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { idx = i; break; } }
    if (idx === -1) { alert('Membro não encontrado!'); return; }
    
    var advertencias = Array.isArray(membros[idx].advertencias) ? [...membros[idx].advertencias] : [];
    advertencias.push({ tipo: tipo, data: new Date().toISOString().split('T')[0], motivo: motivo });
    
    var novoStatus = membros[idx].status;
    if (tipo.indexOf('Suspensão') >= 0) novoStatus = 'Suspenso';
    
    var resultado = await supabaseClient.from('membros').update({ advertencias: advertencias, status: novoStatus }).eq('qra', qra);
    if (resultado.error) { alert('Erro: ' + resultado.error.message); return; }
    
    await supabaseClient.from('logs').insert([{ data: new Date().toISOString(), acao: 'ADVERTÊNCIA', detalhes: 'Advertência QRA ' + qra + ': ' + tipo }]);
    alert('✅ Advertência registrada!');
    this.reset();
    carregarTudo();
});

function mostrarAdvertencias() {
    var container = document.getElementById('listaAdvertencias');
    if (!container) return;
    var todas = [];
    for (var i = 0; i < membros.length; i++) {
        var advs = Array.isArray(membros[i].advertencias) ? membros[i].advertencias : [];
        for (var j = 0; j < advs.length; j++) {
            todas.push({ qra: membros[i].qra, nome: membros[i].nome, tipo: advs[j].tipo, data: advs[j].data, motivo: advs[j].motivo, index: j });
        }
    }
    if (todas.length === 0) { container.innerHTML = '<p style="text-align:center;color:#888;padding:30px;">Nenhuma advertência</p>'; return; }
    container.innerHTML = '';
    for (var i = 0; i < todas.length; i++) {
        var a = todas[i];
        var div = document.createElement('div');
        div.style.cssText = 'background:#111;padding:15px;border-radius:8px;margin-bottom:10px;';
        div.innerHTML = '<div><strong style="color:#d4af37;">' + a.nome + '</strong> <span style="color:#888;">QRA: ' + a.qra + ' | ' + a.data + '</span></div><span class="badge ' + (a.tipo.indexOf('Suspensão')>=0?'badge-danger':'badge-warning') + '">' + a.tipo + '</span><p style="color:#ccc;margin-top:8px;">📝 ' + a.motivo + '</p>';
        container.appendChild(div);
    }
}

function verAdvertenciasMembro(qra) {
    var m = null;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { m = membros[i]; break; } }
    if (!m) return;
    var advs = Array.isArray(m.advertencias) ? m.advertencias : [];
    var html = '<h4 style="color:#d4af37;margin-bottom:15px;">⚠️ Advertências de ' + m.nome + '</h4>';
    if (advs.length === 0) {
        html += '<p style="color:#888;text-align:center;">Nenhuma advertência</p>';
    } else {
        for (var i = 0; i < advs.length; i++) {
            var a = advs[i];
            html += '<div style="background:#111;padding:15px;border-radius:8px;margin-bottom:10px;border-left:3px solid ' + (a.tipo.indexOf('Suspensão')>=0?'#f44':'#f80') + ';">';
            html += '<div style="display:flex;justify-content:space-between;">';
            html += '<div><span class="badge ' + (a.tipo.indexOf('Suspensão')>=0?'badge-danger':'badge-warning') + '">' + a.tipo + '</span> <span style="color:#888;font-size:12px;">📅 ' + a.data + '</span><p style="color:#ccc;margin-top:8px;">📝 ' + a.motivo + '</p></div>';
            html += '<button class="btn btn-sm btn-danger" onclick="removerAdvertenciaMembro(\'' + qra + '\', ' + i + ')" style="height:35px;"><i class="fas fa-trash"></i></button>';
            html += '</div></div>';
        }
    }
    document.getElementById('modalTitle').textContent = '⚠️ Advertências - ' + m.nome;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('show');
}

async function removerAdvertenciaMembro(qra, index) {
    var idx = -1;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { idx = i; break; } }
    if (idx === -1) return;
    var m = membros[idx];
    var advertencias = Array.isArray(m.advertencias) ? [...m.advertencias] : [];
    if (index < 0 || index >= advertencias.length) return;
    var removida = advertencias[index];
    if (!confirm('Remover advertência?\n\n' + removida.tipo + '\n' + removida.motivo)) return;
    advertencias.splice(index, 1);
    var novoStatus = m.status;
    var temSuspensao = false;
    for (var i = 0; i < advertencias.length; i++) { if (advertencias[i].tipo.indexOf('Suspensão') >= 0) { temSuspensao = true; break; } }
    if (!temSuspensao && m.status === 'Suspenso') novoStatus = 'Ativo';
    await supabaseClient.from('membros').update({ advertencias: advertencias, status: novoStatus }).eq('qra', qra);
    alert('✅ Removida!');
    fecharModal();
    carregarTudo();
}

// CURSOS
function buscarPoliciaisCurso() {
    var busca = document.getElementById('searchPolicialCurso').value.toLowerCase();
    if (!busca) { alert('Digite algo!'); return; }
    var resultados = [];
    for (var i = 0; i < membros.length; i++) {
        if (membros[i].qra.toLowerCase().indexOf(busca) !== -1 || membros[i].nome.toLowerCase().indexOf(busca) !== -1) {
            resultados.push(membros[i]);
        }
    }
    var container = document.getElementById('listaPoliciaisBusca');
    container.style.display = 'block';
    container.innerHTML = '';
    if (resultados.length === 0) { container.innerHTML = '<p style="color:#888;text-align:center;padding:15px;">Nenhum</p>'; return; }
    for (var i = 0; i < resultados.length; i++) {
        var m = resultados[i];
        var jaSel = false;
        for (var j = 0; j < policiaisSelecionados.length; j++) { if (policiaisSelecionados[j].qra === m.qra) { jaSel = true; break; } }
        var div = document.createElement('div');
        div.style.cssText = 'padding:12px;cursor:pointer;border-bottom:1px solid #222;display:flex;justify-content:space-between;';
        div.innerHTML = '<span><strong style="color:#d4af37;">' + m.qra + '</strong> ' + m.nome + '</span>' + (jaSel ? '<span style="color:#0f0;">✓</span>' : '<button class="btn btn-sm btn-success">Selecionar</button>');
        if (!jaSel) {
            (function(membro) {
                div.addEventListener('click', function() {
                    policiaisSelecionados.push(membro);
                    mostrarPoliciaisSelecionados();
                    container.style.display = 'none';
                    document.getElementById('searchPolicialCurso').value = '';
                });
            })(m);
        }
        container.appendChild(div);
    }
}

function mostrarPoliciaisSelecionados() {
    var container = document.getElementById('policiaisSelecionados');
    if (policiaisSelecionados.length === 0) { container.innerHTML = '<p style="color:#888;">Nenhum</p>'; return; }
    container.innerHTML = '<p style="color:#d4af37;">📋 ' + policiaisSelecionados.length + ' policial(is):</p>';
    for (var i = 0; i < policiaisSelecionados.length; i++) {
        var m = policiaisSelecionados[i];
        var span = document.createElement('span');
        span.style.cssText = 'display:inline-block;background:#111;padding:8px 12px;border-radius:20px;margin:3px;';
        span.innerHTML = '<strong style="color:#d4af37;">' + m.qra + '</strong> ' + m.nome + ' <button onclick="removerPolicialCurso(\'' + m.qra + '\')" style="background:none;border:none;color:#f44;cursor:pointer;">×</button>';
        container.appendChild(span);
    }
}

function removerPolicialCurso(qra) {
    var nova = [];
    for (var i = 0; i < policiaisSelecionados.length; i++) { if (policiaisSelecionados[i].qra !== qra) nova.push(policiaisSelecionados[i]); }
    policiaisSelecionados = nova;
    mostrarPoliciaisSelecionados();
}

function adicionarMaisCurso() {
    var container = document.getElementById('listaCursosAdicionar');
    var num = container.querySelectorAll('.curso-item-adicionar').length + 1;
    var div = document.createElement('div');
    div.className = 'curso-item-adicionar';
    div.style.cssText = 'background:#111;padding:15px;border-radius:8px;margin-bottom:15px;';
    div.innerHTML = '<h4 style="color:#d4af37;">📚 Curso #' + num + ' (opcional)</h4><div class="form-grid"><div class="form-group"><input type="text" class="cursoNome" placeholder="Nome"></div><div class="form-group"><input type="text" class="cursoInstituicao" placeholder="Instituição"></div><div class="form-group"><input type="date" class="cursoData"></div><div class="form-group"><input type="number" class="cursoCarga" placeholder="Horas" value="0"></div></div>';
    container.appendChild(div);
}

document.getElementById('formCurso').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (policiaisSelecionados.length === 0) { alert('Selecione policiais!'); return; }
    var cursosAdd = [];
    document.querySelectorAll('#listaCursosAdicionar .curso-item-adicionar').forEach(function(item) {
        var nome = item.querySelector('.cursoNome').value.trim();
        if (nome) cursosAdd.push({ nome: nome, instituicao: item.querySelector('.cursoInstituicao').value.trim() || 'N/A', data: item.querySelector('.cursoData').value || new Date().toISOString().split('T')[0], cargaHoraria: parseInt(item.querySelector('.cursoCarga').value) || 0 });
    });
    if (cursosAdd.length === 0) { alert('Preencha um curso!'); return; }
    for (var i = 0; i < policiaisSelecionados.length; i++) {
        var p = policiaisSelecionados[i];
        var idx = -1;
        for (var j = 0; j < membros.length; j++) { if (membros[j].qra === p.qra) { idx = j; break; } }
        if (idx !== -1) {
            var cursos = Array.isArray(membros[idx].cursos) ? [...membros[idx].cursos] : [];
            for (var k = 0; k < cursosAdd.length; k++) cursos.push(cursosAdd[k]);
            await supabaseClient.from('membros').update({ cursos: cursos }).eq('qra', p.qra);
        }
    }
    alert('✅ Cursos adicionados!');
    this.reset();
    policiaisSelecionados = [];
    mostrarPoliciaisSelecionados();
    carregarTudo();
});

function mostrarCursos() {
    var container = document.getElementById('listaCursos');
    if (!container) return;
    var todos = [];
    for (var i = 0; i < membros.length; i++) {
        var cursos = Array.isArray(membros[i].cursos) ? membros[i].cursos : [];
        for (var j = 0; j < cursos.length; j++) {
            todos.push({ qra: membros[i].qra, nome: membros[i].nome, curso: cursos[j].nome || '-', inst: cursos[j].instituicao || 'N/A', data: cursos[j].data || '-' });
        }
    }
    if (todos.length === 0) { container.innerHTML = '<p style="text-align:center;color:#888;padding:30px;">Nenhum curso</p>'; return; }
    container.innerHTML = '';
    for (var i = 0; i < todos.length; i++) {
        var c = todos[i];
        var div = document.createElement('div');
        div.style.cssText = 'background:#111;padding:15px;border-radius:8px;margin-bottom:10px;';
        div.innerHTML = '<div><strong style="color:#d4af37;">' + c.nome + '</strong> <span style="color:#888;">QRA: ' + c.qra + ' | ' + c.data + '</span></div><strong style="color:#09f;">📚 ' + c.curso + '</strong><p style="color:#ccc;">🏫 ' + c.inst + '</p>';
        container.appendChild(div);
    }
}

function verCursosMembro(qra) {
    var m = null;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { m = membros[i]; break; } }
    if (!m) return;
    var cursos = Array.isArray(m.cursos) ? m.cursos : [];
    var html = '<h4 style="color:#d4af37;margin-bottom:15px;">📚 Cursos de ' + m.nome + '</h4>';
    if (cursos.length === 0) {
        html += '<p style="color:#888;text-align:center;">Nenhum curso</p>';
    } else {
        for (var i = 0; i < cursos.length; i++) {
            var c = cursos[i];
            html += '<div style="background:#111;padding:15px;border-radius:8px;margin-bottom:10px;border-left:3px solid #09f;">';
            html += '<div style="display:flex;justify-content:space-between;">';
            html += '<div><strong style="color:#09f;">📚 ' + (c.nome || c.cursoNome || '-') + '</strong> <span style="color:#888;font-size:12px;">📅 ' + (c.data || '-') + '</span><p style="color:#ccc;">🏫 ' + (c.instituicao || 'N/A') + '</p></div>';
            html += '<button class="btn btn-sm btn-danger" onclick="removerCursoMembro(\'' + qra + '\', ' + i + ')" style="height:35px;"><i class="fas fa-trash"></i></button>';
            html += '</div></div>';
        }
    }
    document.getElementById('modalTitle').textContent = '📚 Cursos - ' + m.nome;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('show');
}

async function removerCursoMembro(qra, index) {
    var idx = -1;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { idx = i; break; } }
    if (idx === -1) return;
    var m = membros[idx];
    var cursos = Array.isArray(m.cursos) ? [...m.cursos] : [];
    if (index < 0 || index >= cursos.length) return;
    if (!confirm('Remover este curso?')) return;
    cursos.splice(index, 1);
    await supabaseClient.from('membros').update({ cursos: cursos }).eq('qra', qra);
    alert('✅ Removido!');
    fecharModal();
    carregarTudo();
}

// RECICLAGEM
function buscarPolicialReciclagem() {
    var qra = document.getElementById('reciclagemQRA').value.trim();
    if (!qra) { alert('Digite o QRA!'); return; }
    var m = null;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { m = membros[i]; break; } }
    if (!m) { alert('Não encontrado!'); return; }
    qraSelecionadoReciclagem = qra;
    document.getElementById('nomePolicialReciclagem').textContent = '👤 ' + m.nome;
    document.getElementById('patentePolicialReciclagem').textContent = '🎖️ ' + m.patente;
    document.getElementById('infoPolicialReciclagem').style.display = 'block';
    var select = document.getElementById('cursoReciclagem');
    select.innerHTML = '<option value="">Selecione...</option>';
    var cursos = Array.isArray(m.cursos) ? m.cursos : [];
    for (var i = 0; i < cursos.length; i++) {
        select.innerHTML += '<option value="' + (cursos[i].nome || cursos[i].cursoNome || '') + '">' + (cursos[i].nome || cursos[i].cursoNome || '') + '</option>';
    }
}

async function enviarParaReciclagem() {
    if (!qraSelecionadoReciclagem) { alert('Busque um policial!'); return; }
    var curso = document.getElementById('cursoReciclagem').value;
    var motivo = document.getElementById('motivoReciclagem').value;
    if (!curso || !motivo) { alert('Preencha todos os campos!'); return; }
    await supabaseClient.from('reciclagens').insert([{ id: Date.now(), qra: qraSelecionadoReciclagem, nome: '', curso: curso, motivo: motivo, dataEnvio: new Date().toISOString().split('T')[0], status: 'Pendente' }]);
    alert('✅ Enviado!');
    document.getElementById('reciclagemQRA').value = '';
    document.getElementById('infoPolicialReciclagem').style.display = 'none';
    qraSelecionadoReciclagem = '';
    carregarReciclagens();
}

function mostrarReciclagens() {
    var tbody = document.getElementById('tabelaReciclagem');
    if (!tbody) return;
    if (reciclagens.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;">Nenhuma</td></tr>'; return; }
    document.getElementById('statTotalReciclagem').textContent = reciclagens.length;
    var pendentes = 0;
    for (var i = 0; i < reciclagens.length; i++) { if (reciclagens[i].status === 'Pendente') pendentes++; }
    document.getElementById('statPendenteReciclagem').textContent = pendentes;
    document.getElementById('statConcluidoReciclagem').textContent = reciclagens.length - pendentes;
    tbody.innerHTML = '';
    for (var i = 0; i < reciclagens.length; i++) {
        var r = reciclagens[i];
        var row = document.createElement('tr');
        row.innerHTML = '<td><strong style="color:#d4af37;">' + r.qra + '</strong></td><td>' + r.curso + '</td><td><span class="badge ' + (r.status==='Pendente'?'badge-warning':'badge-success') + '">' + r.status + '</span></td><td>' + (r.status==='Pendente'?'<button class="btn btn-sm btn-success" onclick="concluirReciclagem(' + r.id + ')"><i class="fas fa-check"></i></button> ':'') + '<button class="btn btn-sm btn-danger" onclick="removerReciclagem(' + r.id + ')"><i class="fas fa-trash"></i></button></td>';
        tbody.appendChild(row);
    }
}

async function concluirReciclagem(id) {
    var instrutor = prompt('Nome do instrutor:');
    if (!instrutor) return;
    await supabaseClient.from('reciclagens').update({ status: 'Concluído', dataConclusao: new Date().toISOString().split('T')[0], instrutor: instrutor }).eq('id', id);
    carregarReciclagens();
}

async function removerReciclagem(id) {
    if (confirm('Remover?')) { await supabaseClient.from('reciclagens').delete().eq('id', id); carregarReciclagens(); }
}

// PROMOÇÕES
function buscarPromover() {
    var qra = document.getElementById('promoQRA').value.trim();
    var m = null;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { m = membros[i]; break; } }
    if (!m) { alert('Não encontrado!'); return; }
    document.getElementById('promoNome').value = m.nome;
    document.getElementById('promoPatenteAtual').value = m.patente;
    var patentes = ['Soldado','Cabo','3º Sargento','2º Sargento','1º Sargento','Subtenente','Tenente','Capitão','Major','Tenente Coronel','Coronel'];
    var idx = -1;
    for (var i = 0; i < patentes.length; i++) { if (patentes[i] === m.patente) { idx = i; break; } }
    var select = document.getElementById('promoNovaPatente');
    select.innerHTML = '<option value="">Selecione...</option>';
    if (idx >= 0 && idx < patentes.length - 1) {
        for (var i = idx + 1; i < patentes.length; i++) { select.innerHTML += '<option value="' + patentes[i] + '">' + patentes[i] + '</option>'; }
    }
}

async function executarPromocao() {
    var qra = document.getElementById('promoQRA').value.trim();
    var nova = document.getElementById('promoNovaPatente').value;
    if (!qra || !nova) { alert('Selecione a patente!'); return; }
    await supabaseClient.from('membros').update({ patente: nova }).eq('qra', qra);
    alert('✅ Promovido!');
    carregarTudo();
}

// DETALHES
function verDetalhes(qra) {
    var m = null;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { m = membros[i]; break; } }
    if (!m) return;
    var esp = Array.isArray(m.especializacoes) ? m.especializacoes.join(', ') : '-';
    document.getElementById('modalTitle').textContent = '📋 ' + m.nome;
    document.getElementById('modalBody').innerHTML = '<p><strong>QRA:</strong> ' + m.qra + '</p><p><strong>Nome:</strong> ' + m.nome + '</p><p><strong>Patente:</strong> ' + m.patente + '</p><p><strong>Status:</strong> ' + m.status + '</p><p><strong>Admissão:</strong> ' + m.data_admissao + '</p><p><strong>Especializações:</strong> ' + esp + '</p>';
    document.getElementById('modal').classList.add('show');
}

function editarMembro(qra) {
    var m = null;
    for (var i = 0; i < membros.length; i++) { if (membros[i].qra === qra) { m = membros[i]; break; } }
    if (!m) return;
    document.getElementById('modalTitle').textContent = '✏️ ' + m.nome;
    document.getElementById('modalBody').innerHTML = '<div class="form-group"><label>Nome</label><input type="text" id="editNome" value="' + m.nome + '" style="width:100%;padding:10px;background:#111;border:1px solid #333;color:#fff;"></div><div class="form-group"><label>Status</label><select id="editStatus" style="width:100%;padding:10px;background:#111;border:1px solid #333;color:#fff;"><option' + (m.status==='Ativo'?' selected':'') + '>Ativo</option><option' + (m.status==='Afastado'?' selected':'') + '>Afastado</option><option' + (m.status==='Suspenso'?' selected':'') + '>Suspenso</option></select></div><button class="btn btn-success btn-block" onclick="salvarEdicao(\'' + qra + '\')">Salvar</button>';
    document.getElementById('modal').classList.add('show');
}

async function salvarEdicao(qra) {
    var nome = document.getElementById('editNome').value.trim();
    var status = document.getElementById('editStatus').value;
    if (!nome) { alert('Nome obrigatório!'); return; }
    await supabaseClient.from('membros').update({ nome: nome, status: status }).eq('qra', qra);
    document.getElementById('modal').classList.remove('show');
    carregarTudo();
}

async function deletarMembro(qra) {
    if (confirm('⚠️ Remover QRA ' + qra + '?')) { await supabaseClient.from('membros').delete().eq('qra', qra); carregarTudo(); }
}

function mostrarLogs() {
    var tbody = document.getElementById('tabelaLogs');
    if (!tbody) return;
    if (logs.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;">Nenhum log</td></tr>'; return; }
    tbody.innerHTML = '';
    for (var i = 0; i < logs.length; i++) {
        var l = logs[i];
        var row = document.createElement('tr');
        row.innerHTML = '<td>' + new Date(l.data).toLocaleString('pt-BR') + '</td><td><span class="badge badge-info">' + l.acao + '</span></td><td>' + (l.detalhes || '-') + '</td>';
        tbody.appendChild(row);
    }
}

function fecharModal() { document.getElementById('modal').classList.remove('show'); }
function carregarTodosDados() { carregarTudo(); }
// ============================================
// GRÁFICO
// ============================================
var grafico = null;

function renderGrafico() {
    var canvas = document.getElementById('chartPatentes');
    if (!canvas) return;
    
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.log('Chart.js não carregado');
        return;
    }
    
    var patentes = {};
    for (var i = 0; i < membros.length; i++) {
        var p = membros[i].patente || 'Sem patente';
        patentes[p] = (patentes[p] || 0) + 1;
    }
    
    var labels = Object.keys(patentes);
    var data = Object.values(patentes);
    
    // Destruir gráfico antigo
    if (grafico) {
        grafico.destroy();
        grafico = null;
    }
    
    var ctx = canvas.getContext('2d');
    
    grafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#d4af37', '#00ff00', '#ff4444', '#4488ff', 
                    '#ff8800', '#8800ff', '#00ffff', '#ff00ff'
                ],
                borderColor: '#0a0a0f',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ccc',
                        padding: 20,
                        font: { size: 13 }
                    }
                },
                title: {
                    display: true,
                    text: 'Distribuição por Patentes',
                    color: '#d4af37',
                    font: { size: 18 }
                }
            }
        }
    });
    
    console.log('✅ Gráfico criado! Patentes:', labels.length);
}

// Atualizar a função mostrarDashboard para incluir o gráfico
var mostrarDashboardOriginal = mostrarDashboard;
mostrarDashboard = function() {
    mostrarDashboardOriginal();
    renderGrafico();
};
console.log('✅ SISTEMA ROTA CARREGADO!');