'use strict';

/* =========================================================================
   Treino Força — PWA offline-first para registro de treinos de força
   Dados 100% locais em localStorage (chave "treinoForcaApp").
   Sem backend, sem login, sem CDN.
   ========================================================================= */

const STORAGE_KEY = 'treinoForcaApp';
const APP_VERSION = '1.0.0';
const KG_PER_LB = 0.45359237;
const REST_BASICO = 150;   // 2:30 — básicos (2–3 min)
const REST_ACESSORIO = 75; // 1:15 — acessórios (60–90 s)

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DAY_ORDER = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0 };

/* -------------------------------------------------------------------------
   Guia de execução — dicas padrão e ilustração local de cada movimento.
   Tudo offline: os SVGs ficam em assets/exercicios/.
   ------------------------------------------------------------------------- */
function defaultTipsFor(name, type) {
  const n = String(name || '').toLowerCase();

  if (n.indexOf('supino reto') !== -1) return [
    'Aperte as escápulas (pontas das costas) contra o banco e mantenha-as lá o tempo todo.',
    'Desça a barra controlando até a linha do mamilo.',
    'Não abra os cotovelos 90º; mantenha-os mais fechados (aprox. 45º do tronco).',
    'Empurre o chão com os pés para gerar estabilidade.'
  ];
  if (n.indexOf('agachamento leve') !== -1) return [
    'Use ~80% da carga do agachamento de quinta; hoje é técnica, não recorde.',
    'Inspire, trave o core e desça controlado até quebrar a paralela.',
    'Empurre o chão afastando os pés e mantenha os joelhos alinhados.',
    'Pare com 1–2 repetições de folga; não falhe.'
  ];
  if (n.indexOf('agachamento') !== -1) return [
    'Inspire fundo, encha a barriga de ar (bracing) e segure.',
    'Quebre o quadril para trás e o joelho para frente ao mesmo tempo.',
    'Desça até quebrar a paralela (se a mobilidade permitir) mantendo o peito aberto.',
    'Empurre o chão afastando os pés, mantendo os joelhos alinhados com os pés.'
  ];
  if (n.indexOf('levantamento terra') !== -1) return [
    'Barra alinhada no meio do pé. Canelas quase encostando na barra.',
    'Costas retas e peito estufado antes de puxar. Não arredonde a lombar.',
    'O movimento começa empurrando o chão com os pés, não puxando com as costas.',
    'Mantenha a barra raspando na canela e na coxa durante toda a subida.'
  ];
  if (n.indexOf('romanian') !== -1 || n.indexOf('rdl') !== -1) return [
    'Empurre o quadril para trás com os joelhos levemente flexionados.',
    'Mantenha a barra rente às pernas e as costas retas.',
    'Sinta o alongamento nos posteriores; desça até onde a técnica permitir.',
    'Suba empurrando o quadril para frente, sem hiperextender a lombar.'
  ];
  if (n.indexOf('desenvolvimento militar') !== -1 || n.indexOf('ohp') !== -1) return [
    'Contraia o abdômen e os glúteos para não arquear a lombar.',
    'A barra deve subir em linha reta, raspando no queixo.',
    'Quando a barra passar pela testa, enfie a cabeça para frente ("passar pela janela").',
    'Desça controlado até a altura do queixo.'
  ];
  if (n.indexOf('remada') !== -1 && n.indexOf('unilateral') !== -1) return [
    'Apoie bem o corpo e mantenha a lombar neutra durante todo o movimento.',
    'Puxe o peso em direção ao quadril/abdômen, não ao peito.',
    'Aperte as escápulas no topo e evite girar o tronco.',
    'Desça controlado até estender o braço, sem soltar o peso.'
  ];
  if (n.indexOf('remada curvada') !== -1) return [
    'Incline o tronco (aprox. 45º), mantenha a lombar reta e o core firme.',
    'Puxe a barra em direção ao umbigo/abdômen inferior.',
    'Aperte as escápulas no topo do movimento.',
    'Desça a barra de forma controlada, sem deixar o corpo despencar.'
  ];
  if (n.indexOf('barra fixa') !== -1 || n.indexOf('puxada') !== -1) return [
    'Inicie o movimento puxando os cotovelos para baixo, não as mãos.',
    'Estufe o peito em direção à barra.',
    'Não balance o corpo (se precisar, use elástico).',
    'Desça até estender quase que totalmente os braços.'
  ];
  return [
    'Controle a descida por 2–3 segundos; não deixe o peso despencar.',
    'Mantenha o core firme e respire: solte o ar na parte difícil.',
    'Use amplitude completa sem dor; pare se perder a técnica.',
    'Deixe 1–2 repetições na reserva (RIR 1–2).'
  ];
}

/** Chave do SVG local em assets/exercicios/ para o movimento. */
function guideVisualFor(name) {
  const n = String(name || '').toLowerCase();
  if (n.indexOf('supino') !== -1) return 'supino';
  if (n.indexOf('agachamento') !== -1) return 'agachamento';
  if (n.indexOf('terra') !== -1 || n.indexOf('romanian') !== -1 || n.indexOf('rdl') !== -1) return 'terra';
  if (n.indexOf('desenvolvimento') !== -1 || n.indexOf('ohp') !== -1) return 'ohp';
  if (n.indexOf('remada') !== -1) return 'remada';
  if (n.indexOf('barra fixa') !== -1 || n.indexOf('puxada') !== -1) return 'barra-fixa';
  return 'generic';
}

/* -------------------------------------------------------------------------
   Treinos padrão (pré-carregados e editáveis)
   type: 'basico' | 'acessorio'
   loadGroup: 'upper' (superior) | 'lower' (inferior) — define o incremento
   ------------------------------------------------------------------------- */
function makeExercise(id, name, type, sets, repMin, repMax, loadGroup, note, progress, tips) {
  return {
    id: id,
    name: name,
    type: type,
    sets: sets,
    repMin: repMin,
    repMax: repMax,
    restSec: type === 'basico' ? REST_BASICO : REST_ACESSORIO,
    loadGroup: loadGroup,
    note: note || '',
    tips: (tips && tips.length) ? tips.slice() : defaultTipsFor(name, type),
    // progress: false mantém a carga fixa (ex.: agachamento leve a 80% na sexta).
    progress: progress !== false
  };
}

function defaultTemplates() {
  return [
    {
      id: 'tpl-push',
      day: 'seg',
      title: 'Push',
      focus: 'Peito, ombro e tríceps',
      optional: false,
      cardio: '10–15 min de bike ou caminhada inclinada (LISS)',
      exercises: [
        makeExercise('ex-supino', 'Supino reto', 'basico', 2, 3, 5, 'upper'),
        makeExercise('ex-militar', 'Desenvolvimento militar com barra', 'basico', 2, 5, 6, 'upper'),
        makeExercise('ex-supino-inc', 'Supino inclinado com halteres', 'acessorio', 2, 8, 10, 'upper'),
        makeExercise('ex-elev-lateral', 'Elevação lateral', 'acessorio', 2, 10, 12, 'upper'),
        makeExercise('ex-triceps', 'Tríceps testa ou corda', 'acessorio', 2, 8, 12, 'upper')
      ]
    },
    {
      id: 'tpl-pull',
      day: 'ter',
      title: 'Pull',
      focus: 'Costas e bíceps',
      optional: false,
      cardio: '10–15 min de LISS',
      exercises: [
        makeExercise('ex-terra', 'Levantamento terra', 'basico', 2, 3, 5, 'lower'),
        makeExercise('ex-barra-fixa', 'Barra fixa ou puxada', 'basico', 2, 5, 8, 'upper'),
        makeExercise('ex-remada-curvada', 'Remada curvada', 'basico', 2, 6, 8, 'upper'),
        makeExercise('ex-remada-unilateral', 'Remada unilateral', 'acessorio', 2, 8, 10, 'upper'),
        makeExercise('ex-rosca', 'Rosca direta', 'acessorio', 2, 8, 12, 'upper'),
        makeExercise('ex-panturrilha-pe-pull', 'Panturrilha em pé', 'acessorio', 2, 12, 20, 'lower', '', true, ['Desça o calcanhar o máximo possível e faça uma pausa de 2 segundos alongando. Suba explosivo e segure 1 segundo no topo. Não dobre os joelhos e use carga pesada.'])
      ]
    },
    {
      id: 'tpl-legs',
      day: 'qui',
      title: 'Legs',
      focus: 'Perna completo',
      optional: false,
      cardio: '5–10 min de bike leve (opcional)',
      exercises: [
        makeExercise('ex-agachamento', 'Agachamento', 'basico', 2, 3, 5, 'lower'),
        makeExercise('ex-rdl', 'Romanian deadlift', 'basico', 2, 6, 8, 'lower'),
        makeExercise('ex-leg-press', 'Leg press ou afundo', 'acessorio', 2, 8, 10, 'lower'),
        makeExercise('ex-flexora', 'Mesa ou cadeira flexora', 'acessorio', 2, 8, 12, 'lower'),
        makeExercise('ex-panturrilha', 'Panturrilha em pé', 'acessorio', 3, 12, 20, 'lower', '', true, ['Desça o calcanhar o máximo possível e faça uma pausa de 2 segundos alongando. Suba explosivo e segure 1 segundo no topo. Não dobre os joelhos e use carga pesada.'])
      ]
    },
    {
      id: 'tpl-reforco',
      day: 'sex',
      title: 'Reforço + Hipertrofia',
      focus: 'Opcional — só se recuperado. Sem supino, terra ou agachamento pesado.',
      optional: true,
      cardio: '20–30 min de LISS ou HIIT curto de 6–10 min',
      exercises: [
        // Acessório técnico com carga fixa em ~80% do agachamento de quinta:
        // sem top set/back-off, as duas séries usam a mesma carga e não há incremento automático.
        makeExercise('ex-agachamento-leve', 'Agachamento leve', 'acessorio', 2, 5, 5, 'lower', '80% da carga de quinta — sem falhar', false),
        makeExercise('ex-remada-reforco', 'Remada curvada ou unilateral', 'acessorio', 2, 8, 10, 'upper'),
        makeExercise('ex-elev-lateral-reforco', 'Elevação lateral', 'acessorio', 2, 12, 15, 'upper'),
        makeExercise('ex-rosca-reforco', 'Rosca direta ou martelo', 'acessorio', 2, 10, 12, 'upper'),
        makeExercise('ex-triceps-reforco', 'Tríceps corda ou testa', 'acessorio', 2, 10, 12, 'upper'),
        makeExercise('ex-flexora-reforco', 'Mesa ou cadeira flexora', 'acessorio', 2, 10, 12, 'lower'),
        makeExercise('ex-core', 'Core (prancha/abdominal)', 'acessorio', 2, 10, 15, 'upper', 'Peso 0 = peso corporal'),
        makeExercise('ex-panturrilha-sentado', 'Panturrilha Sentado (Máquina)', 'acessorio', 3, 15, 20, 'lower', '', true, ['Desça o calcanhar o máximo possível e faça uma pausa de 2 segundos alongando. Suba explosivo e segure 1 segundo no topo. Não dobre os joelhos e use carga pesada.'])
      ]
    }
  ];
}

/* -------------------------------------------------------------------------
   Glossário — usado na tela Ajuda, nos tooltips "?" e no onboarding.
   ------------------------------------------------------------------------- */
const GLOSSARY = [
  {
    id: 'rir',
    term: 'RIR (Reps In Reserve)',
    short: 'Quantas repetições você ainda faria antes da falha.',
    body: '<p><strong>RIR</strong> é quantas repetições sobrariam antes da falha. RIR 2 = você parou quando ainda conseguiria fazer 2 repetições. RIR 0 = falha, não saía mais nenhuma.</p><p>Para ganho de força: básicos em <strong>RIR 1–2 e nunca falhar</strong>. Acessórios em RIR 1–2; falha ocasional é aceitável.</p>',
    example: '<strong>Exemplo:</strong> supino com 80 kg. Você faz 5 reps e sente que ainda faria mais 2 com boa técnica. Registre <strong>5 reps · RIR 2</strong>.'
  },
  {
    id: 'deload',
    term: 'Deload',
    short: 'Semana com ~10% menos carga para dissipar fadiga.',
    body: '<p>Deload é uma <strong>redução planejada de cerca de 10% da carga por 1 semana</strong>. A fadiga acumulada esconde a força; reduzir a carga por uma semana permite recuperar e voltar a progredir.</p><p>Faça deload quando <strong>não bater o topo da faixa no mesmo exercício por 2 treinos consecutivos</strong>, com técnica e alimentação em dia. O app detecta isso e mostra um alerta.</p>',
    example: '<strong>Exemplo:</strong> supino travado em 4 reps (faixa 3–5) em dois treinos seguidos → uma semana com 90% da carga (80 kg → 72,5 kg), mantendo séries e técnica.'
  },
  {
    id: 'basico-acessorio',
    term: 'Básico vs. Acessório',
    short: 'Multiarticular pesado x isolado com mais reps.',
    body: '<p><strong>Básico:</strong> multiarticular, permite mais carga, descanso de 2–3 min e progressão de +2,5 kg (superior) ou +5 kg (inferior).</p><p><strong>Acessório:</strong> isolado ou de menor carga, descanso de 60–90 s. Suba o peso quando bater o topo da faixa nas 2 séries.</p>',
    example: '<strong>Exemplo:</strong> supino reto é básico (2 séries de 3–5, +2,5 kg). Elevação lateral é acessório (2 séries de 10–12, descanso 1:15).'
  },
  {
    id: 'top-set',
    term: 'Top set e Back-off',
    short: 'Série principal pesada + série de recuo a ~90%.',
    body: '<p><strong>Top set:</strong> a série principal e mais pesada, 3–5 reps, RIR 1–2.</p><p><strong>Back-off:</strong> a segunda série com <strong>~90% da carga do top set</strong>, 5–6 reps, RIR 1–2. Ela soma volume sem comprometer a técnica.</p>',
    example: '<strong>Exemplo:</strong> top set 100 kg × 4 (RIR 2) → back-off 90 kg × 5–6 (RIR 1–2).'
  },
  {
    id: 'dupla-progressao',
    term: 'Dupla progressão',
    short: 'Suba reps dentro da faixa; depois suba o peso.',
    body: '<p>Aumente as repetições dentro da faixa antes de aumentar a carga. Ao <strong>bater o topo da faixa com RIR 2 e boa técnica</strong>, suba o peso: +2,5 kg para superior e +5 kg para inferior.</p><p>Depois de subir, as reps caem para o início da faixa e o ciclo recomeça.</p>',
    example: '<strong>Exemplo:</strong> supino 80 kg: 3 → 4 → 5 reps com RIR 2. Bateu 5? Próximo treino 82,5 kg, voltando para 3–4 reps.'
  },
  {
    id: 'descanso',
    term: 'Descanso entre séries',
    short: 'Básicos 2:30; acessórios 1:15.',
    body: '<p>Básicos: <strong>2:30</strong> (2–3 min) para recuperar o sistema nervoso e manter a carga.</p><p>Acessórios: <strong>1:15</strong> (60–90 s) para manter o estímulo e economizar tempo.</p><p>O timer começa sozinho ao registrar uma série.</p>',
    example: '<strong>Exemplo:</strong> terminou o supino? Timer de 2:30. Terminou a rosca direta? 1:15.'
  },
  {
    id: 'liss',
    term: 'LISS e cardio final',
    short: 'Cardio leve e contínuo no fim do treino.',
    body: '<p><strong>LISS</strong> (Low Intensity Steady State) é cardio leve e contínuo: bike, caminhada inclinada, elíptico. Você consegue conversar durante o esforço.</p><p>No fim do treino: 10–15 min na maioria dos dias. Sexta: 20–30 min de LISS ou HIIT curto de 6–10 min.</p>',
    example: '<strong>Exemplo:</strong> 12 min de bike em ritmo constante, sem perder o fôlego, ao final do Push.'
  },
  {
    id: 'pr',
    term: 'PR e 1RM estimado',
    short: 'Melhor carga registrada e força estimada.',
    body: '<p><strong>PR</strong> (personal record) é a sua melhor marca: maior carga para uma quantidade de reps.</p><p>O <strong>1RM estimado</strong> usa a fórmula de Epley: carga × (1 + reps ÷ 30). Serve para comparar séries com reps diferentes, não é um teste real de 1RM.</p>',
    example: '<strong>Exemplo:</strong> 100 kg × 5 → 1RM estimado de 116,7 kg.'
  }
];

const ONBOARDING = [
  {
    kicker: '1 de 4',
    title: 'Básico vs. Acessório',
    text: 'Básicos são multiarticulares e pesados: descanso de 2–3 min e incremento de 2,5 kg (superior) ou 5 kg (inferior). Acessórios são isolados: descanso de 60–90 s e sobem quando você bate o topo da faixa nas 2 séries.',
    example: '<strong>Supino reto</strong> = básico, 2 séries de 3–5. <strong>Elevação lateral</strong> = acessório, 2 séries de 10–12.',
    gloss: 'basico-acessorio'
  },
  {
    kicker: '2 de 4',
    title: 'RIR: pare antes da falha',
    text: 'RIR é quantas repetições ainda sobrariam. RIR 2 = parou quando ainda faria 2. RIR 0 = falha. Nos básicos, fique em RIR 1–2 e nunca falhe.',
    example: 'Fez 5 reps e ainda faria 2 com técnica? Registre <strong>5 reps · RIR 2</strong>.',
    gloss: 'rir'
  },
  {
    kicker: '3 de 4',
    title: 'Top set e back-off',
    text: 'Nos básicos, a série 1 é o top set (3–5 reps, RIR 1–2). A série 2 é o back-off: ~90% da carga, 5–6 reps, RIR 1–2. O app já preenche o back-off com 90% do top set.',
    example: 'Top set <strong>100 kg × 4</strong> → back-off <strong>90 kg × 5–6</strong>.',
    gloss: 'top-set'
  },
  {
    kicker: '4 de 4',
    title: 'Deload quando travar',
    text: 'Falhou em bater o topo da faixa no mesmo exercício por 2 treinos consecutivos? O app avisa: faça uma semana com ~10% menos carga para dissipar a fadiga e voltar a progredir.',
    example: 'Supino preso em 4 reps por 2 treinos → <strong>80 kg → 72,5 kg</strong> por uma semana.',
    gloss: 'deload'
  }
];

/* -------------------------------------------------------------------------
   Estado
   ------------------------------------------------------------------------- */
let state = null;
let deferredPrompt = null;
let persistTimer = null;
let modalOpen = false;
let toastTimer = null;
let lastFocus = null;

const ui = {
  view: 'dashboard',
  histFilter: 'todos',
  loadExercise: '',
  helpQuery: '',
  editor: null,
  obIndex: 0
};

/* -------------------------------------------------------------------------
   Persistência local
   ------------------------------------------------------------------------- */
function initialState() {
  return {
    version: 1,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    settings: {
      bodyweightKg: 60,
      heightCm: 171,
      proteinGoal: 120,
      surplusKcal: 250,
      activityLevel: 'light',
      unit: 'kg'
    },
    templates: defaultTemplates(),
    sessions: [],
    active: null,
    onboardingDone: false
  };
}

const PANTURRILHA_TIP = 'Desça o calcanhar o máximo possível e faça uma pausa de 2 segundos alongando. Suba explosivo e segure 1 segundo no topo. Não dobre os joelhos e use carga pesada.';

function upgradePanturrilhaWorkouts(st) {
  if (!st || !Array.isArray(st.templates)) return;
  const tip = [PANTURRILHA_TIP];

  st.templates.forEach(function (tpl) {
    if (!tpl || !Array.isArray(tpl.exercises)) return;
    const id = String(tpl.id || '');

    if (id === 'tpl-pull') {
      const hasPant = tpl.exercises.some(function (e) {
        const n = String(e && e.name || '').toLowerCase();
        return n.indexOf('panturrilha') !== -1;
      });
      if (!hasPant) {
        tpl.exercises.push(makeExercise('ex-panturrilha-pe-pull', 'Panturrilha em pé', 'acessorio', 2, 12, 20, 'lower', '', true, tip));
      }
    }

    if (id === 'tpl-legs') {
      let ex = tpl.exercises.find(function (e) { return e && e.id === 'ex-panturrilha'; }) ||
               tpl.exercises.find(function (e) { return String(e && e.name || '').toLowerCase().indexOf('panturrilha') !== -1 && String(e.name || '').toLowerCase().indexOf('sentado') === -1; });
      if (ex) {
        ex.name = 'Panturrilha em pé';
        ex.sets = 3;
        ex.repMin = 12;
        ex.repMax = 20;
        ex.type = 'acessorio';
        ex.loadGroup = 'lower';
        ex.tips = tip.slice();
        if (ex.progress === undefined) ex.progress = true;
      }
    }

    if (id === 'tpl-reforco') {
      const hasSentado = tpl.exercises.some(function (e) {
        const n = String(e && e.name || '').toLowerCase();
        return n.indexOf('panturrilha') !== -1 && n.indexOf('sentado') !== -1;
      });
      if (!hasSentado) {
        tpl.exercises.push(makeExercise('ex-panturrilha-sentado', 'Panturrilha Sentado (Máquina)', 'acessorio', 3, 15, 20, 'lower', '', true, tip));
      }
    }
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return initialState();
    const base = initialState();
    const merged = Object.assign({}, base, data);
    merged.settings = Object.assign({}, base.settings, data.settings || {});
    // Um array vazio é intencional (o usuário pode apagar todos os templates);
    // só usa os padrões quando o campo não existe em dados antigos.
    merged.templates = (Array.isArray(data.templates) ? data.templates : base.templates).map(normalizeTemplate);
    merged.sessions = sortSessionsByRecency((Array.isArray(data.sessions) ? data.sessions : []).map(normalizeSession).filter(Boolean));
    upgradePanturrilhaWorkouts(merged);
    merged.active = data.active ? normalizeActive(data.active) : null;
    merged.onboardingDone = !!data.onboardingDone;
    return merged;
  } catch (err) {
    console.error('Falha ao ler os dados salvos:', err);
    return initialState();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Falha ao salvar:', err);
    toast('Não foi possível salvar. Verifique o espaço do dispositivo.');
    return false;
  }
}

function persistSoon() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 250);
}

function normalizeTemplate(t) {
  t = t && typeof t === 'object' ? t : {};
  const exercises = (Array.isArray(t.exercises) ? t.exercises : []).filter(function (e) {
    return e && typeof e === 'object';
  }).map(function (e) {
    const type = e.type === 'basico' ? 'basico' : 'acessorio';
    const name = String(e.name || 'Exercício');
    const tips = (Array.isArray(e.tips) ? e.tips : []).map(function (x) { return String(x).trim(); }).filter(Boolean);
    return {
      id: e.id || uid(),
      name: name,
      type: type,
      sets: clampInt(e.sets, 1, 6, 2),
      repMin: clampInt(e.repMin, 1, 50, 8),
      repMax: clampInt(e.repMax, 1, 50, 12),
      restSec: e.restSec || (type === 'basico' ? REST_BASICO : REST_ACESSORIO),
      loadGroup: e.loadGroup === 'lower' ? 'lower' : 'upper',
      note: String(e.note || ''),
      tips: tips.length ? tips : defaultTipsFor(name, type),
      progress: e.progress !== false
    };
  });
  return {
    id: t.id || uid(),
    day: t.day || 'extra',
    title: String(t.title || 'Treino'),
    focus: String(t.focus || ''),
    optional: !!t.optional,
    cardio: String(t.cardio || ''),
    exercises: exercises
  };
}

function normalizeSession(s) {
  if (!s || !Array.isArray(s.exercises)) return null;
  return {
    id: s.id || uid(),
    templateId: s.templateId || '',
    templateTitle: s.templateTitle || 'Treino',
    date: s.date || dateKey(new Date(s.startedAt || Date.now())),
    startedAt: s.startedAt || new Date().toISOString(),
    finishedAt: s.finishedAt || s.startedAt || new Date().toISOString(),
    notes: String(s.notes || ''),
    cardio: {
      done: !!(s.cardio && s.cardio.done),
      minutes: clampInt(s.cardio && s.cardio.minutes, 0, 180, 0)
    },
    exercises: s.exercises.filter(function (ex) {
      return ex && typeof ex === 'object';
    }).map(function (ex) {
      const type = ex.type === 'basico' ? 'basico' : 'acessorio';
      const name = String(ex.name || 'Exercício');
      const tips = (Array.isArray(ex.tips) ? ex.tips : []).map(function (x) { return String(x).trim(); }).filter(Boolean);
      return {
        id: ex.id || uid(),
        name: name,
        type: type,
        loadGroup: ex.loadGroup === 'lower' ? 'lower' : 'upper',
        repMin: clampInt(ex.repMin, 1, 50, 8),
        repMax: clampInt(ex.repMax, 1, 50, 12),
        restSec: ex.restSec || REST_ACESSORIO,
        note: String(ex.note || ''),
        tips: tips.length ? tips : defaultTipsFor(name, type),
        progress: ex.progress !== false,
        sets: (Array.isArray(ex.sets) ? ex.sets : []).map(normalizeSet)
      };
    })
  };
}

function normalizeActive(a) {
  const s = normalizeSession(a);
  if (!s) return null;
  // Preserva o início real para a duração de um treino retroativo.
  if (a.realStartedAt) s.realStartedAt = a.realStartedAt;
  s.exercises = s.exercises.map(function (ex, i) {
    const src = a.exercises[i] || {};
    ex.done = !!src.done;
    return ex;
  });
  return s;
}

function normalizeSet(st) {
  return {
    weight: Number(st && st.weight) || 0,
    reps: st && st.reps != null ? clampInt(st.reps, 0, 200, 0) : null,
    rir: st && st.rir != null ? clampInt(st.rir, 0, 4, 0) : null,
    note: String((st && st.note) || ''),
    savedAt: st && st.savedAt ? st.savedAt : null
  };
}

/* -------------------------------------------------------------------------
   Utilitários
   ------------------------------------------------------------------------- */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function uid() { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function pad(n) { return String(n).padStart(2, '0'); }
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function roundHalf(n) { return Math.round(n * 2) / 2; }
function parseNum(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function unit() { return state.settings.unit === 'lb' ? 'lb' : 'kg'; }
function toDisplayWeight(kg) {
  const v = unit() === 'lb' ? kg / KG_PER_LB : kg;
  return Math.round(v * 10) / 10;
}
function fromDisplayWeight(v) {
  return unit() === 'lb' ? v * KG_PER_LB : v;
}
function weightToInput(kg) {
  if (!Number.isFinite(kg) || kg === 0) return kg === 0 ? '0' : '';
  return String(toDisplayWeight(kg)).replace('.', ',');
}
function fmtNum(v, digits) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: digits == null ? 1 : digits });
}
function fmtWeight(kg) { return fmtNum(toDisplayWeight(kg), 1); }
function fmtWeightUnit(kg) { return fmtWeight(kg) + ' ' + unit(); }
function fmtVolume(kg) {
  const v = unit() === 'lb' ? kg / KG_PER_LB : kg;
  return Math.round(v).toLocaleString('pt-BR') + ' ' + unit();
}
function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
}
function rirTxt(r) { return r == null ? '—' : (r >= 4 ? '4+' : String(r)); }
function incrementFor(loadGroup) { return loadGroup === 'lower' ? 5 : 2.5; }

function dateKey(d) {
  const x = d instanceof Date ? d : new Date(d);
  return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
}
function parseDateKey(key) {
  const parts = String(key).split('-').map(Number);
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}
function fmtDayMonth(d) { return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); }
function fmtDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return fmtDayMonth(d) + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtDateLabel(key) {
  const d = parseDateKey(key);
  const today = dateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === today) return 'Hoje';
  if (key === dateKey(yesterday)) return 'Ontem';
  const year = d.getFullYear() !== new Date().getFullYear() ? ' de ' + d.getFullYear() : '';
  return cap(WEEKDAYS[d.getDay()]) + ', ' + fmtDayMonth(d) + year;
}
function fmtDateTimeFromISO(iso) {
  const d = new Date(iso);
  return fmtDateLabel(dateKey(d)) + ' às ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function startOfWeek(d) {
  const x = new Date((d || new Date()).getFullYear(), (d || new Date()).getMonth(), (d || new Date()).getDate());
  const shift = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - shift);
  return x;
}
function isNative() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2600);
}

function closeModal() {
  const root = $('#modal-root');
  if (!root) return;
  root.innerHTML = '';
  if (lastFocus && typeof lastFocus.focus === 'function') { try { lastFocus.focus(); } catch (e) {} }
  lastFocus = null;
  modalOpen = false;
  document.body.style.overflow = '';
}

function openModal(opts) {
  const root = $('#modal-root');
  if (!root) return;
  lastFocus = document.activeElement;
  const actions = opts.actions || [];
  root.innerHTML =
    '<div class="modal-backdrop" data-backdrop="1">' +
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-handle"></div>' +
        '<div class="modal-head">' +
          '<div class="modal-title">' + esc(opts.title || '') + '</div>' +
          '<button type="button" class="icon-btn" data-close="1" aria-label="Fechar">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' + (opts.body || '') + '</div>' +
        '<div class="modal-actions"></div>' +
      '</div>' +
    '</div>';

  const actionsEl = $('.modal-actions', root);
  actions.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (a.kind || 'btn-secondary');
    b.textContent = a.label;
    b.addEventListener('click', a.onClick);
    actionsEl.appendChild(b);
  });

  root.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', closeModal);
  });
  const backdrop = $('.modal-backdrop', root);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeModal();
  });

  modalOpen = true;
  document.body.style.overflow = 'hidden';
  if (typeof opts.onMount === 'function') opts.onMount(root);
}

function confirmModal(opts) {
  openModal({
    title: opts.title || 'Confirmar',
    body: '<p>' + esc(opts.text || '') + '</p>',
    actions: [
      {
        label: opts.confirmLabel || 'Confirmar',
        kind: opts.danger ? 'btn-danger' : 'btn-primary',
        onClick: function () { closeModal(); if (opts.onConfirm) opts.onConfirm(); }
      },
      { label: 'Cancelar', kind: 'btn-ghost', onClick: closeModal }
    ]
  });
}

function helpDot(termId, label) {
  return '<button type="button" class="help-dot" data-term="' + esc(termId) + '" aria-label="Ajuda: ' + esc(label || termId) + '">?</button>';
}

/* =========================================================================
   CÁLCULOS DE TREINO
   ========================================================================= */

/** Histórico de um exercício (mais recente primeiro), somente séries salvas. */
function historyFor(name) {
  const out = [];
  for (let i = 0; i < state.sessions.length; i++) {
    const s = state.sessions[i];
    const ex = s.exercises.find(function (e) { return e.name === name; });
    if (!ex) continue;
    const sets = ex.sets.filter(function (st) { return st.savedAt && st.reps > 0; });
    if (sets.length) out.push({ session: s, ex: ex, sets: sets });
  }
  return out;
}

function lastTopSet(name) {
  const hist = historyFor(name);
  if (!hist.length) return null;
  const top = hist[0].sets[0];
  if (!top || !(top.reps > 0)) return null;
  return top;
}

function sessionVolume(s) {
  let vol = 0;
  (s.exercises || []).forEach(function (ex) {
    ex.sets.forEach(function (st) {
      if (st.savedAt && st.reps > 0) vol += (Number(st.weight) || 0) * st.reps;
    });
  });
  return vol;
}

function sessionStats(s) {
  let sets = 0;
  let reps = 0;
  (s.exercises || []).forEach(function (ex) {
    ex.sets.forEach(function (st) {
      if (st.savedAt && st.reps > 0) { sets++; reps += st.reps; }
    });
  });
  const minutes = s.startedAt && s.finishedAt
    ? Math.max(0, Math.round((new Date(s.finishedAt) - new Date(s.startedAt)) / 60000))
    : 0;
  return { sets: sets, reps: reps, volume: sessionVolume(s), minutes: minutes, exercises: (s.exercises || []).length };
}

/**
 * REGRA DE PROGRESSÃO (dupla progressão)
 * Básicos: se o top set bateu o topo da faixa (repMax) com RIR >= 2, sugere
 *   +2,5 kg (superior) ou +5 kg (inferior). Caso contrário, mantém a carga.
 * Acessórios: se as 2 primeiras séries bateram o topo da faixa, sugere subir
 *   o peso pelo mesmo incremento.
 */
function nextLoadAdvice(ex) {
  const hist = historyFor(ex.name);
  const inc = incrementFor(ex.loadGroup);

  // Exercício técnico com carga fixa (ex.: agachamento leve a 80% na sexta):
  // não sugere incremento, apenas repete a carga e reforça a execução.
  if (ex.progress === false) {
    const fixed = hist[0];
    const n = String(ex.name || '').toLowerCase();
    if (n.indexOf('cadeira extensora') !== -1 || n.indexOf('extensora') !== -1) {
      return {
        hasData: !!fixed,
        weight: fixed ? fixed.sets[0].weight : null,
        backoff: null,
        hit: false,
        text: 'Ajuste o encosto na altura do joelho. Escolha uma carga para 12–15 repetições, podendo chegar perto da falha.'
      };
    }
    return {
      hasData: !!fixed,
      weight: fixed ? fixed.sets[0].weight : null,
      backoff: null,
      hit: false,
      text: fixed
        ? 'Carga de técnica (~80% do agachamento de quinta). Repita ' + fmtWeightUnit(fixed.sets[0].weight) + ' e foque na execução.'
        : 'Carga de técnica: use ~80% da carga do agachamento de quinta e foque na execução.'
    };
  }

  if (!hist.length) {
    return {
      hasData: false,
      weight: null,
      backoff: null,
      hit: false,
      text: 'Primeira vez: escolha uma carga que permita ' + ex.repMin + '–' + ex.repMax + ' reps com RIR 1–2.'
    };
  }
  const last = hist[0];
  const top = last.sets[0];

  if (ex.type === 'basico') {
    const hit = top.reps >= ex.repMax && (top.rir == null ? 0 : top.rir) >= 2;
    const target = hit ? roundHalf(top.weight + inc) : top.weight;
    return {
      hasData: true,
      weight: target,
      backoff: roundHalf(target * 0.9),
      hit: hit,
      last: top,
      text: hit
        ? 'Última: ' + fmtWeightUnit(top.weight) + ' × ' + top.reps + ' @RIR ' + rirTxt(top.rir) +
          '. Bateu o topo: suba para <strong>' + fmtWeightUnit(target) + '</strong> (+' + fmtWeightUnit(inc) + '). Back-off ~' + fmtWeightUnit(roundHalf(target * 0.9)) + '.'
        : 'Última: <strong>' + fmtWeightUnit(top.weight) + ' × ' + top.reps + '</strong> @RIR ' + rirTxt(top.rir) +
          '. Mantenha a carga e busque ' + ex.repMax + ' reps com RIR 2. Back-off ~' + fmtWeightUnit(roundHalf(top.weight * 0.9)) + '.'
    };
  }

  const firstTwo = last.sets.slice(0, 2);
  const hit = firstTwo.length >= 2 && firstTwo.every(function (st) { return st.reps >= ex.repMax; });
  const target = hit ? roundHalf(top.weight + inc) : top.weight;
  return {
    hasData: true,
    weight: target,
    backoff: null,
    hit: hit,
    last: top,
    text: hit
      ? 'Topo da faixa nas 2 séries. Suba para <strong>' + fmtWeightUnit(target) + '</strong> (+' + fmtWeightUnit(inc) + ').'
      : 'Última: <strong>' + fmtWeightUnit(top.weight) + ' × ' + top.reps + '</strong>. Suba o peso ao bater ' + ex.repMax + ' reps nas 2 séries.'
  };
}

/** Sugestão em tempo real durante a sessão (usa as séries já salvas hoje). */
function liveAdvice(ex) {
  if (ex.progress === false) return null;
  const saved = ex.sets.filter(function (st) { return st.savedAt && st.reps > 0; });
  if (!saved.length) return null;
  const inc = incrementFor(ex.loadGroup);
  if (ex.type === 'basico') {
    const top = saved[0];
    if (top.reps >= ex.repMax && (top.rir == null ? 0 : top.rir) >= 2) {
      return {
        tone: 'up',
        text: 'Top set no alvo hoje. Próximo treino: <strong>' + fmtWeightUnit(roundHalf(top.weight + inc)) + '</strong> (+' + fmtWeightUnit(inc) + ').'
      };
    }
    return null;
  }
  if (saved.length >= 2 && saved.slice(0, 2).every(function (st) { return st.reps >= ex.repMax; })) {
    return {
      tone: 'up',
      text: 'Topo da faixa nas 2 séries. Próximo treino: <strong>' + fmtWeightUnit(roundHalf(saved[0].weight + inc)) + '</strong> (+' + fmtWeightUnit(inc) + ').'
    };
  }
  return null;
}

/**
 * ALERTA DE DELOAD
 * Critério: no mesmo exercício, os 2 últimos treinos em que ele foi
 * registrado não atingiram o topo da faixa de repetições (com carga > 0).
 * Sugestão: reduzir ~10% da carga por 1 semana.
 */
function deloadAlerts() {
  const alerts = [];
  const seen = {};
  state.templates.forEach(function (tpl) {
    tpl.exercises.forEach(function (ex) {
      if (seen[ex.name]) return;
      seen[ex.name] = true;
      // Exercícios técnicos com carga fixa (ex.: agachamento leve) não entram no alerta de deload.
      if (ex.progress === false) return;
      const entries = [];
      for (let i = 0; i < state.sessions.length && entries.length < 2; i++) {
        const s = state.sessions[i];
        const found = s.exercises.find(function (e) { return e.name === ex.name; });
        if (!found) continue;
        const sets = found.sets.filter(function (st) { return st.savedAt && st.reps > 0; });
        if (sets.length) entries.push({ date: s.date, sets: sets, repMax: found.repMax || ex.repMax });
      }
      if (entries.length < 2) return;
      // Cada treino é comparado com a faixa usada naquele dia (a sexta usa 12–15,
      // o Push usa 10–12 para o mesmo exercício).
      const failed = entries.every(function (entry) {
        const top = entry.sets[0];
        return top.weight > 0 && top.reps < entry.repMax;
      });
      if (!failed) return;
      const w = entries[0].sets[0].weight;
      alerts.push({
        name: ex.name,
        repMax: entries[0].repMax,
        weight: w,
        suggested: roundHalf(w * 0.9),
        templateTitle: tpl.title,
        lastDate: entries[0].date
      });
    });
  });
  return alerts;
}

/** PRs: maior carga e melhor 1RM estimado (Epley) por exercício. */
function prMap() {
  const map = {};
  const ordered = state.sessions.slice().reverse();
  ordered.forEach(function (s) {
    s.exercises.forEach(function (ex) {
      ex.sets.forEach(function (st) {
        if (!st.savedAt || !st.reps || !(st.weight > 0)) return;
        const cur = map[ex.name] || { name: ex.name, weight: 0, reps: 0, e1rm: 0, date: s.date, type: ex.type };
        if (st.weight > cur.weight || (st.weight === cur.weight && st.reps > cur.reps)) {
          cur.weight = st.weight;
          cur.reps = st.reps;
          cur.date = s.date;
          cur.type = ex.type;
        }
        const est = st.weight * (1 + st.reps / 30);
        if (est > cur.e1rm) cur.e1rm = est;
        map[ex.name] = cur;
      });
    });
  });
  return map;
}

/** Nomes dos exercícios básicos (para os gráficos de carga). */
function basicExerciseNames() {
  const names = [];
  state.templates.forEach(function (tpl) {
    tpl.exercises.forEach(function (ex) {
      if (ex.type === 'basico' && names.indexOf(ex.name) === -1) names.push(ex.name);
    });
  });
  const prs = prMap();
  Object.keys(prs).forEach(function (name) {
    // Só básicos entram no gráfico de "top set"; acessórios não têm top set.
    if (prs[name].type === 'basico' && names.indexOf(name) === -1 && historyFor(name).length) names.push(name);
  });
  return names;
}

function loadSeries(name) {
  const hist = historyFor(name);
  return hist.slice(0, 12).reverse().map(function (h) {
    return { label: fmtDayMonth(parseDateKey(h.session.date)), value: h.sets[0].weight };
  }).filter(function (p) { return p.value > 0; });
}

/** Séries semanais de volume e frequência (últimas N semanas, cronológico). */
function weeklySeries(weeks) {
  const n = weeks || 8;
  const out = [];
  const base = startOfWeek(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const ws = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i * 7);
    const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7);
    let volume = 0;
    let count = 0;
    state.sessions.forEach(function (s) {
      const d = parseDateKey(s.date);
      if (d >= ws && d < we) { count++; volume += sessionVolume(s); }
    });
    out.push({ label: fmtDayMonth(ws), volume: volume, count: count, start: ws });
  }
  return out;
}

function weekSessionCount() {
  return weeklySeries(1)[0].count;
}

/* =========================================================================
   GRÁFICOS (canvas puro, sem bibliotecas)
   ========================================================================= */
function prepCanvas(canvas, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max((canvas.parentElement && canvas.parentElement.clientWidth) || 280, 240);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx: ctx, width: width, height: height };
}

function chartText(ctx, text, x, y, align, color) {
  ctx.fillStyle = color || '#7c8794';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawEmptyChart(ctx, width, height) {
  chartText(ctx, 'Sem dados ainda — registre um treino.', width / 2, height / 2, 'center', '#98a3af');
}

function drawLineChart(canvas, series) {
  if (!canvas) return;
  const size = prepCanvas(canvas, 172);
  const ctx = size.ctx;
  const width = size.width;
  const height = size.height;
  if (!series.length) { drawEmptyChart(ctx, width, height); return; }

  const pad = { l: 40, r: 14, t: 14, b: 26 };
  const values = series.map(function (p) { return p.value; });
  let min = Math.min.apply(null, values);
  let max = Math.max.apply(null, values);
  if (min === max) {
    max = max + (max * 0.12 || 5);
    min = Math.max(0, min - (min * 0.12 || 5));
  } else {
    const range = max - min;
    min = Math.max(0, min - range * 0.2);
    max = max + range * 0.2;
  }
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const xAt = function (i) { return series.length === 1 ? pad.l + plotW / 2 : pad.l + (i * plotW) / (series.length - 1); };
  const yAt = function (v) { return pad.t + (1 - (v - min) / (max - min)) * plotH; };

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  [min, (min + max) / 2, max].forEach(function (v) {
    ctx.beginPath();
    ctx.moveTo(pad.l, yAt(v));
    ctx.lineTo(width - pad.r, yAt(v));
    ctx.stroke();
    chartText(ctx, fmtNum(toDisplayWeight(v), 0), pad.l - 7, yAt(v), 'right');
  });

  const gradient = ctx.createLinearGradient(0, pad.t, 0, height - pad.b);
  gradient.addColorStop(0, 'rgba(94,224,181,0.28)');
  gradient.addColorStop(1, 'rgba(94,224,181,0)');
  ctx.beginPath();
  ctx.moveTo(xAt(0), height - pad.b);
  series.forEach(function (p, i) { ctx.lineTo(xAt(i), yAt(p.value)); });
  ctx.lineTo(xAt(series.length - 1), height - pad.b);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  series.forEach(function (p, i) {
    if (i === 0) ctx.moveTo(xAt(i), yAt(p.value));
    else ctx.lineTo(xAt(i), yAt(p.value));
  });
  ctx.strokeStyle = '#5ee0b5';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  series.forEach(function (p, i) {
    ctx.beginPath();
    ctx.arc(xAt(i), yAt(p.value), series.length > 10 ? 2.4 : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0d10';
    ctx.fill();
    ctx.strokeStyle = '#5ee0b5';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const idxs = series.length === 1 ? [0] : [0, Math.floor((series.length - 1) / 2), series.length - 1];
  idxs.forEach(function (i, k) {
    if (k > 0 && idxs[k - 1] === i) return;
    chartText(ctx, series[i].label, xAt(i), height - 9, i === 0 ? 'left' : (i === series.length - 1 ? 'right' : 'center'));
  });
}

function drawBarChart(canvas, series) {
  if (!canvas) return;
  const size = prepCanvas(canvas, 160);
  const ctx = size.ctx;
  const width = size.width;
  const height = size.height;
  if (!series.length || !series.some(function (p) { return p.value > 0; })) {
    drawEmptyChart(ctx, width, height);
    return;
  }
  const pad = { l: 38, r: 10, t: 12, b: 24 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const max = Math.max.apply(null, series.map(function (p) { return p.value; })) || 1;
  const slot = plotW / series.length;
  const barW = Math.min(30, slot * 0.58);

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, height - pad.b);
  ctx.lineTo(width - pad.r, height - pad.b);
  ctx.stroke();
  chartText(ctx, fmtNum(max, 0), pad.l - 7, pad.t + 5, 'right');
  chartText(ctx, '0', pad.l - 7, height - pad.b - 4, 'right');

  series.forEach(function (p, i) {
    const h = (p.value / max) * plotH;
    const x = pad.l + slot * i + (slot - barW) / 2;
    const y = height - pad.b - h;
    ctx.fillStyle = p.value > 0 ? 'rgba(94,224,181,0.85)' : 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, barW, Math.max(h, 2), 4);
    else ctx.rect(x, y, barW, Math.max(h, 2));
    ctx.fill();
    chartText(ctx, p.label, x + barW / 2, height - 9, 'center');
  });
}

/* Redesenha apenas os gráficos após rotação/resize, sem reconstruir a tela
   (reconstruir fecharia o teclado e tiraria o foco dos campos). */
function redrawCharts() {
  if (!state) return;
  if (ui.view === 'dashboard') {
    const c = $('#dash-chart');
    if (c) drawLineChart(c, loadSeries(ui.loadExercise));
  } else if (ui.view === 'progresso') {
    const load = $('#prog-load-chart');
    if (load) drawLineChart(load, loadSeries(ui.loadExercise));
    const volume = $('#prog-volume-chart');
    if (volume) drawBarChart(volume, weeklySeries(8).map(function (w) {
      return { label: w.label, value: toDisplayWeight(w.volume) };
    }));
    const freq = $('#prog-freq-chart');
    if (freq) drawBarChart(freq, weeklySeries(6).map(function (w) {
      return { label: w.label, value: w.count };
    }));
  }
}

/* =========================================================================
   NAVEGAÇÃO E DASHBOARD
   ========================================================================= */
function diaLabel(day) {
  const map = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo', extra: 'Extra' };
  return map[day] || 'Extra';
}

function setView(name, opts) {
  if (!state) return;
  ui.view = name;
  $$('.view').forEach(function (v) { v.hidden = v.dataset.view !== name; });
  $$('.tab').forEach(function (t) {
    const on = t.dataset.nav === name;
    t.classList.toggle('is-active', on);
    if (on) t.setAttribute('aria-current', 'page');
    else t.removeAttribute('aria-current');
  });
  renderCurrent();
  if (!opts || !opts.noScroll) window.scrollTo(0, 0);
}

function renderCurrent() {
  if (!state) return;
  if (ui.view === 'dashboard') renderDashboard();
  else if (ui.view === 'treino') renderTreino();
  else if (ui.view === 'historico') renderHistorico();
  else if (ui.view === 'progresso') renderProgresso();
  else if (ui.view === 'ajuda') renderAjuda();
  else if (ui.view === 'config') renderConfig();
  updateTopbar();
}

function renderAll() {
  renderCurrent();
  updateInstallUI();
}

function updateTopbar() {
  if (!state) return;
  const now = new Date();
  const count = weekSessionCount();
  const sub = $('#topbar-sub');
  if (sub) {
    sub.textContent = cap(WEEKDAYS[now.getDay()]) + ', ' + now.getDate() + ' ' + MONTHS[now.getMonth()] +
      ' · ' + count + (count === 1 ? ' treino' : ' treinos') + ' na semana';
  }
  const pill = $('#net-pill');
  if (pill) {
    pill.textContent = navigator.onLine ? 'offline ok' : 'sem internet';
    pill.classList.toggle('is-offline', !navigator.onLine);
  }
}

/** Templates do ciclo fixo (Push → Pull → Legs), na ordem do dia configurado. */
function cycleTemplates() {
  return state.templates.filter(function (t) {
    return !t.optional && (t.day in DAY_ORDER);
  }).sort(function (a, b) { return DAY_ORDER[a.day] - DAY_ORDER[b.day]; });
}

function sortSessionsByRecency(list) {
  const arr = list || (state ? state.sessions : []);
  arr.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return String(b.startedAt || '').localeCompare(String(a.startedAt || ''));
  });
  return arr;
}

/** Índice do template de um treino salvo dentro do ciclo (-1 se não faz parte). */
function cycleIndexForSession(s, cycle) {
  if (!s) return -1;
  for (let i = 0; i < cycle.length; i++) {
    if (s.templateId && cycle[i].id === s.templateId) return i;
    if (cycle[i].title === s.templateTitle) return i;
  }
  return -1;
}

/**
 * Descobre o próximo treino pela SEQUÊNCIA do ciclo, não pelo dia da semana.
 * O último treino do ciclo indica o próximo da ordem Push → Pull → Legs;
 * o Reforço (opcional) e treinos extras não avançam o ciclo.
 * Exemplo: pulou quinta e fez Legs na segunda → na terça o app sugere Push.
 */
function nextTemplate() {
  if (!state.templates.length) return null;
  const cycle = cycleTemplates();
  if (!cycle.length) {
    return { tpl: state.templates[0], when: 'hoje', date: new Date() };
  }
  const doneToday = state.sessions.some(function (s) { return s.date === dateKey(new Date()); });
  const ordered = sortSessionsByRecency(state.sessions.slice());
  let lastIdx = -1;
  for (let i = 0; i < ordered.length; i++) {
    const idx = cycleIndexForSession(ordered[i], cycle);
    if (idx !== -1) { lastIdx = idx; break; }
  }
  const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % cycle.length;
  return {
    tpl: cycle[nextIdx],
    when: doneToday ? 'amanhã' : 'hoje',
    date: new Date()
  };
}

function nextWorkoutCardHTML(next) {
  if (!next) {
    return '<div class="card"><div class="empty">Nenhum treino cadastrado.<br><br>' +
      '<button class="btn btn-primary btn-sm" data-act="edit-templates">Criar treino</button></div></div>';
  }
  const tpl = next.tpl;
  const totalSets = tpl.exercises.reduce(function (a, e) { return a + e.sets; }, 0);
  return '<div class="card card-accent">' +
    '<div class="eyebrow">Próximo treino · ' + esc(next.when) + '</div>' +
    '<div class="card-head" style="margin-bottom:6px">' +
      '<div><h3 style="font-size:23px;letter-spacing:-0.02em">' + esc(tpl.title) + '</h3>' +
      '<p class="small muted">' + esc(tpl.focus || '') + '</p></div>' +
      '<span class="badge ' + (tpl.optional ? 'badge-opt' : '') + '">' + (tpl.optional ? 'Opcional' : 'Ciclo') + '</span>' +
    '</div>' +
    '<div class="tiny muted">' + tpl.exercises.length + ' exercícios · ' + totalSets + ' séries</div>' +
    (tpl.cardio ? '<div class="tiny muted" style="margin-top:4px">Cardio: ' + esc(tpl.cardio) + '</div>' : '') +
    '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn btn-primary" data-act="start" data-id="' + esc(tpl.id) + '">Iniciar treino</button>' +
      '<button class="btn btn-ghost" data-act="edit-templates">Editar</button>' +
    '</div>' +
  '</div>';
}

function renderDashboard() {
  const box = $('#dash-content');
  if (!box) return;
  const next = nextTemplate();
  const alerts = deloadAlerts();
  const week = weeklySeries(1)[0];
  const recent = state.sessions.slice(0, 3);
  const names = basicExerciseNames();
  if (!ui.loadExercise || names.indexOf(ui.loadExercise) === -1) ui.loadExercise = names[0] || '';

  let html = '<div class="view-head"><div><h2>Dashboard</h2><p>Seu ciclo Push / Pull / Legs</p></div></div>';

  if (state.active) {
    const total = state.active.exercises.reduce(function (a, e) { return a + e.sets.length; }, 0);
    const saved = state.active.exercises.reduce(function (a, e) {
      return a + e.sets.filter(function (s) { return s.savedAt; }).length;
    }, 0);
    const pct = total ? Math.round((saved / total) * 100) : 0;
    html += '<div class="card card-accent">' +
      '<div class="eyebrow accent">Treino em andamento</div>' +
      '<h3>' + esc(state.active.templateTitle) + '</h3>' +
      '<p class="small muted" style="margin-top:2px">' + fmtDateTimeFromISO(state.active.startedAt) + ' · ' + saved + ' de ' + total + ' séries</p>' +
      '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:12px" data-act="continue">Continuar treino</button>' +
    '</div>';
  } else {
    html += nextWorkoutCardHTML(next);
  }

  // Sem sessão ativa: oferece iniciar qualquer template fora da ordem sugerida.
  // Com treino em andamento o card some, pois a sessão precisa ser concluída ou descartada.
  if (!state.active) {
    html += '<div class="card">' +
      '<div class="eyebrow">Escolha livre</div>' +
      '<h3 style="font-size:16px;margin:6px 0 4px">Iniciar outro treino</h3>' +
      '<p class="tiny muted" style="margin-bottom:10px">Treine qualquer template agora, independente do dia da semana.</p>';
    if (state.templates.length) {
      html += '<label class="field" style="margin-bottom:10px"><span class="label">Template</span>' +
        '<select id="dash-other-template" aria-label="Escolher template para iniciar">' +
        state.templates.map(function (t) {
          return '<option value="' + esc(t.id) + '">' + esc(t.title) + (t.optional ? ' (opcional)' : '') + '</option>';
        }).join('') +
        '</select></label>' +
        '<button type="button" class="btn btn-secondary btn-block" data-act="start-other">Iniciar este treino</button>';
    } else {
      html += '<div class="empty">Nenhum treino cadastrado. <button type="button" class="link-btn" data-act="edit-templates">Criar treino</button></div>';
    }
    html += '</div>';
  }

  html += '<div class="stat-grid" style="margin-bottom:12px">' +
    '<div class="stat"><div class="stat-value">' + week.count + '</div><div class="stat-label">treinos na semana</div></div>' +
    '<div class="stat"><div class="stat-value">' + fmtNum(toDisplayWeight(week.volume), 0) + '</div><div class="stat-label">volume (' + unit() + ')</div></div>' +
    '<div class="stat"><div class="stat-value">' + state.sessions.length + '</div><div class="stat-label">sessões salvas</div></div>' +
  '</div>';

  if (alerts.length) {
    html += '<div class="card card-warn">' +
      '<div class="card-head"><div><div class="eyebrow warn">Atenção</div><h3>Alerta de deload</h3></div>' + helpDot('deload', 'deload') + '</div>' +
      alerts.map(function (a) {
        return '<p class="small" style="margin-bottom:8px"><strong>' + esc(a.name) + '</strong> não bateu ' + a.repMax +
          ' reps nos 2 últimos treinos. Considere ~10% menos carga: <strong>' + fmtWeightUnit(a.suggested) + '</strong> (de ' + fmtWeightUnit(a.weight) + ').</p>';
      }).join('') +
      '<button class="link-btn" data-term="deload">Entender o deload</button>' +
    '</div>';
  }

  html += '<div class="card">' +
    '<div class="card-head"><div><div class="eyebrow">Carga nos básicos</div><h3>' + esc(ui.loadExercise || 'Sem dados') + '</h3></div>' + helpDot('dupla-progressao', 'dupla progressão') + '</div>';
  if (names.length) {
    html += '<select id="dash-exercise" aria-label="Escolher exercício básico">' +
      names.map(function (n) { return '<option value="' + esc(n) + '"' + (n === ui.loadExercise ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') +
      '</select>';
    html += '<div class="chart-wrap" style="margin-top:10px"><canvas id="dash-chart"></canvas></div>' +
      '<p class="tiny muted" style="margin-top:6px">Top set por treino · ' + unit() + '</p>';
  } else {
    html += '<div class="empty">Cadastre exercícios básicos para ver o gráfico.</div>';
  }
  html += '</div>';

  html += '<div class="card"><div class="card-head"><div><div class="eyebrow">Histórico resumido</div><h3>Últimos treinos</h3></div>' +
    (state.sessions.length ? '<button class="link-btn" data-act="history">Ver tudo</button>' : '') + '</div>';
  if (!recent.length) {
    html += '<div class="empty">Nenhum treino salvo ainda. Toque em “Iniciar treino” para começar.</div>';
  } else {
    html += '<div class="list">' + recent.map(sessionRowHTML).join('') + '</div>';
  }
  html += '</div>';

  box.innerHTML = html;
  bindDashboard();
}

function sessionRowHTML(s) {
  const st = sessionStats(s);
  return '<button type="button" class="list-row" data-session="' + esc(s.id) + '">' +
    '<div class="list-row-main"><div class="list-row-title">' + esc(s.templateTitle) + '</div>' +
    '<div class="list-row-sub">' + fmtDateLabel(s.date) + ' · ' + st.sets + ' séries · ' + st.minutes + ' min</div></div>' +
    '<div class="list-row-end"><div class="small strong">' + fmtVolume(st.volume) + '</div>' +
    '<div class="tiny muted">ver detalhes</div></div>' +
  '</button>';
}

function bindDashboard() {
  const box = $('#dash-content');
  if (!box) return;
  box.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const act = btn.dataset.act;
      if (act === 'start') startSession(btn.dataset.id);
      else if (act === 'start-other') {
        const sel = $('#dash-other-template');
        if (sel) startSession(sel.value);
      }
      else if (act === 'continue') setView('treino');
      else if (act === 'edit-templates') openEditor();
      else if (act === 'history') setView('historico');
    });
  });
  box.querySelectorAll('[data-session]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const s = state.sessions.find(function (x) { return x.id === btn.dataset.session; });
      if (s) openSessionDetail(s, { deletable: true });
    });
  });
  const sel = $('#dash-exercise');
  if (sel) {
    sel.addEventListener('change', function () {
      ui.loadExercise = sel.value;
      renderDashboard();
    });
  }
  requestAnimationFrame(function () {
    const c = $('#dash-chart');
    if (c) drawLineChart(c, loadSeries(ui.loadExercise));
  });
}

function openSessionDetail(s, opts) {
  const st = sessionStats(s);
  const body = '<div class="stat-grid" style="margin-bottom:12px">' +
      '<div class="stat"><div class="stat-value">' + st.sets + '</div><div class="stat-label">séries</div></div>' +
      '<div class="stat"><div class="stat-value">' + fmtNum(toDisplayWeight(st.volume), 0) + '</div><div class="stat-label">volume (' + unit() + ')</div></div>' +
      '<div class="stat"><div class="stat-value">' + st.minutes + '</div><div class="stat-label">minutos</div></div>' +
    '</div>' +
    '<p class="small muted" style="margin-bottom:10px">' + fmtDateTimeFromISO(s.startedAt) + ' · ' + esc(s.templateTitle) + '</p>' +
    '<div class="list">' + s.exercises.map(function (ex) {
      const sets = ex.sets.filter(function (x) { return x.savedAt && x.reps > 0; });
      const txt = sets.length
        ? sets.map(function (x, i) {
            return 'S' + (i + 1) + ' ' + fmtWeightUnit(x.weight) + ' × ' + x.reps + ' @RIR ' + rirTxt(x.rir) +
              (x.note ? ' · ' + x.note : '');
          }).join(' · ')
        : 'sem séries registradas';
      return '<div class="list-row static"><div class="list-row-main">' +
        '<div class="list-row-title">' + esc(ex.name) + '</div>' +
        '<div class="list-row-sub" style="white-space:normal">' + esc(txt) + '</div></div></div>';
    }).join('') + '</div>' +
    (s.cardio.done ? '<p class="small muted" style="margin-top:10px">Cardio: ' + s.cardio.minutes + ' min</p>' : '') +
    (s.notes ? '<div class="example" style="margin-top:10px">' + esc(s.notes) + '</div>' : '');

  const actions = [{ label: 'Fechar', kind: 'btn-ghost', onClick: closeModal }];
  if (opts && opts.deletable) {
    actions.unshift({
      label: 'Excluir treino',
      kind: 'btn-danger',
      onClick: function () {
        closeModal();
        confirmModal({
          title: 'Excluir este treino?',
          text: 'O registro de ' + fmtDateLabel(s.date) + ' será removido definitivamente.',
          confirmLabel: 'Excluir',
          danger: true,
          onConfirm: function () {
            state.sessions = state.sessions.filter(function (x) { return x.id !== s.id; });
            persist();
            renderAll();
            toast('Treino excluído.');
          }
        });
      }
    });
  }
  openModal({ title: s.templateTitle + ' · ' + fmtDateLabel(s.date), body: body, actions: actions });
}

/* =========================================================================
   SESSÃO DE TREINO
   ========================================================================= */
function startSession(templateId, opts) {
  let tpl = state.templates.find(function (t) { return t.id === templateId; });
  if (!tpl) {
    const nx = nextTemplate();
    if (nx) tpl = nx.tpl;
  }
  if (!tpl) { toast('Nenhum treino disponível para iniciar.'); return; }
  if (state.active) { setView('treino'); toast('Você já tem um treino em andamento.'); return; }
  if (!tpl.exercises.length) { toast('Este treino não tem exercícios. Edite antes de iniciar.'); return; }

  ui.editor = null;
  const now = new Date();
  const todayKey = dateKey(now);
  // Data retroativa (histórico): registra o treino no dia escolhido, nunca no futuro.
  const wanted = opts && opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : null;
  const backdated = wanted && wanted < todayKey ? parseDateKey(wanted) : null;
  const startedAt = backdated
    ? new Date(backdated.getFullYear(), backdated.getMonth(), backdated.getDate(), now.getHours(), now.getMinutes())
    : now;
  const exercises = tpl.exercises.map(function (ex) {
    const adv = nextLoadAdvice(ex);
    const base = adv.weight != null ? adv.weight : 0;
    const sets = [];
    for (let i = 0; i < ex.sets; i++) {
      let w = base;
      if (ex.type === 'basico' && i > 0) w = roundHalf(base * 0.9);
      sets.push({ weight: roundHalf(w), reps: null, rir: null, savedAt: null });
    }
    return {
      id: ex.id,
      name: ex.name,
      type: ex.type,
      loadGroup: ex.loadGroup,
      repMin: ex.repMin,
      repMax: ex.repMax,
      restSec: ex.restSec,
      note: ex.note,
      tips: (Array.isArray(ex.tips) && ex.tips.length ? ex.tips : defaultTipsFor(ex.name, ex.type)),
      progress: ex.progress !== false,
      done: false,
      sets: sets
    };
  });

  state.active = {
    id: uid(),
    templateId: tpl.id,
    templateTitle: tpl.title,
    date: dateKey(startedAt),
    startedAt: startedAt.toISOString(),
    // Relógio real: usado para calcular a duração mesmo em treino retroativo.
    realStartedAt: now.toISOString(),
    finishedAt: null,
    notes: '',
    cardio: { done: false, minutes: 0 },
    exercises: exercises
  };
  persist();
  setView('treino');
  toast(backdated
    ? 'Registrando treino de ' + fmtDateLabel(dateKey(startedAt)) + '.'
    : 'Treino iniciado. Bons levantamentos.');
}

function renderTreino() {
  const box = $('#treino-content');
  if (!box) return;
  if (ui.editor) { renderEditor(box); return; }
  if (state.active) { renderActiveSession(box); return; }

  const next = nextTemplate();
  let html = '<div class="view-head"><div><h2>Treino</h2><p>Escolha qualquer treino do ciclo</p></div>' +
    '<button class="link-btn" data-act="edit-templates">Editar treinos</button></div>';
  html += nextWorkoutCardHTML(next);
  html += '<div class="eyebrow" style="margin:14px 0 8px">Todos os treinos</div>';
  if (!state.templates.length) {
    html += '<div class="empty">Nenhum treino cadastrado.</div>';
  } else {
    html += '<div class="list">' + state.templates.map(function (t) {
      return '<div class="list-row static">' +
        '<div class="list-row-main"><div class="list-row-title">' + esc(t.title) +
          (t.optional ? ' <span class="badge badge-opt">opcional</span>' : '') + '</div>' +
          '<div class="list-row-sub">' + diaLabel(t.day) + ' · ' + t.exercises.length + ' exercícios · ' +
          t.exercises.reduce(function (a, e) { return a + e.sets; }, 0) + ' séries</div></div>' +
        '<button type="button" class="btn btn-sm btn-secondary" data-act="start" data-id="' + esc(t.id) + '">Iniciar</button>' +
      '</div>';
    }).join('') + '</div>';
  }
  html += '<div class="tip" style="margin-top:14px"><span class="tip-icon">i</span><span>Progrida em <strong>dupla progressão</strong>: suba reps dentro da faixa e, ao bater o topo com RIR 2, suba o peso. ' + helpDot('dupla-progressao', 'dupla progressão') + '</span></div>';
  box.innerHTML = html;

  box.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.dataset.act === 'start') startSession(btn.dataset.id);
      if (btn.dataset.act === 'edit-templates') openEditor();
    });
  });
}

function setHTML(ex, ei, st, si) {
  const isBasic = ex.type === 'basico';
  let title = 'Série ' + (si + 1);
  if (isBasic && si === 0) title = 'Série 1 · top set';
  if (isBasic && si === 1) title = 'Série 2 · back-off (~90%)';
  const savedTime = st.savedAt ? new Date(st.savedAt) : null;
  const titleHelp = isBasic && si === 0 ? ' ' + helpDot('top-set', 'top set') : (isBasic && si === 1 ? ' ' + helpDot('top-set', 'back-off') : '');
  let target = '';
  if (si === 1) {
    if (isBasic) {
      const span = ex.repMax - ex.repMin;
      const targetMin = ex.repMax;
      const targetMax = ex.repMax + (span > 0 ? span - 1 : 1);
      target = 'Alvo: ' + (targetMin === targetMax ? targetMax : targetMin + '–' + targetMax) + ' reps';
    } else {
      target = 'Alvo: ' + (ex.repMin === ex.repMax ? ex.repMax : ex.repMin + '–' + ex.repMax) + ' reps';
    }
  }
  return '<div class="set ' + (st.savedAt ? 'is-saved' : '') + '">' +
    '<div class="set-head">' +
      '<span class="set-title">' + title + titleHelp + '</span>' +
      (st.savedAt
        ? '<span class="set-saved-at">✓ ' + pad(savedTime.getHours()) + ':' + pad(savedTime.getMinutes()) +
          ' <button type="button" class="link-btn danger" data-act="undo-set" data-ex="' + ei + '" data-set="' + si + '">desfazer</button></span>'
        : '') +
    '</div>' +
    (target ? '<div class="set-target">' + target + '</div>' : '') +
    '<div class="set-inputs">' +
      '<label class="set-field"><span>Peso (' + unit() + ')</span>' +
        '<input type="text" inputmode="decimal" autocomplete="off" data-field="weight" data-ex="' + ei + '" data-set="' + si + '" value="' + esc(weightToInput(st.weight)) + '" aria-label="Peso da série ' + (si + 1) + '"></label>' +
      '<label class="set-field"><span>Reps</span>' +
        '<input type="text" inputmode="numeric" autocomplete="off" data-field="reps" data-ex="' + ei + '" data-set="' + si + '" value="' + esc(st.reps == null ? '' : st.reps) + '" aria-label="Repetições da série ' + (si + 1) + '"></label>' +
      '<label class="set-field"><span>RIR ' + helpDot('rir', 'RIR') + '</span>' +
        '<select data-field="rir" data-ex="' + ei + '" data-set="' + si + '" aria-label="RIR da série ' + (si + 1) + '">' +
          '<option value=""' + (st.rir == null ? ' selected' : '') + '>—</option>' +
          [0, 1, 2, 3, 4].map(function (n) {
            return '<option value="' + n + '"' + (st.rir === n ? ' selected' : '') + '>' + (n === 4 ? '4+' : n) + '</option>';
          }).join('') +
        '</select></label>' +
    '</div>' +
    '<input type="text" class="set-note" data-field="note" data-ex="' + ei + '" data-set="' + si + '" value="' + esc(st.note || '') + '" placeholder="Nota da série (opcional)" aria-label="Nota da série ' + (si + 1) + '">' +
    '<button type="button" class="btn ' + (st.savedAt ? 'is-saved' : 'btn-secondary') + '" data-act="save-set" data-ex="' + ei + '" data-set="' + si + '">' +
      (st.savedAt ? 'Atualizar série' : 'Registrar série') + '</button>' +
  '</div>';
}

function exerciseCardHTML(ex, index) {
  const isBasic = ex.type === 'basico';
  const adv = nextLoadAdvice(ex);
  const live = liveAdvice(ex);
  const last = lastTopSet(ex.name);
  return '<article class="card exercise ' + (ex.done ? 'is-done' : '') + '">' +
    '<div class="ex-head">' +
      '<div style="min-width:0">' +
        '<div class="ex-name"><span class="ex-name-text">' + (index + 1) + '. ' + esc(ex.name) + '</span>' +
          '<button type="button" class="guide-btn" data-act="guide" data-ex="' + index + '" aria-label="Guia de execução de ' + esc(ex.name) + '" title="Guia de execução">' +
            '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10.5v6"/><circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>' +
          '</button></div>' +
        '<div class="ex-meta">' +
          '<span class="badge ' + (isBasic ? 'badge-basic' : 'badge-acc') + '">' + (isBasic ? 'Básico' : 'Acessório') + ' ' + helpDot('basico-acessorio', 'básico e acessório') + '</span>' +
          '<span>' + ex.sets.length + ' séries · ' + (ex.repMin === ex.repMax ? ex.repMax + ' reps' : ex.repMin + '–' + ex.repMax + ' reps') + '</span>' +
          '<span>descanso ' + fmtClock(ex.restSec * 1000) + ' ' + helpDot('descanso', 'descanso') + '</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="mini-btn" data-act="toggle-done" data-ex="' + index + '" aria-label="Concluir exercício">' + (ex.done ? '✓' : '○') + '</button>' +
    '</div>' +
    (function () {
      var note = ex.note || '';
      var n = String(ex.name || '').toLowerCase();
      if ((n.indexOf('cadeira extensora') !== -1 || n.indexOf('extensora') !== -1) && note.indexOf('80% da carga do agachamento') !== -1) note = '';
      return note ? '<div class="tiny muted" style="margin-top:6px">' + esc(note) + '</div>' : '';
    })() +
    '<div class="ex-sugg ' + (live && live.tone === 'up' ? 'is-up' : '') + '">' + (live ? live.text : adv.text) + '</div>' +
    (last ? '<div class="ex-last"><span>Último treino: <strong>' + fmtWeightUnit(last.weight) + ' × ' + last.reps + ' reps</strong> (RIR ' + rirTxt(last.rir) + ')</span></div>' : '') +
    '<div class="sets">' + ex.sets.map(function (st, si) { return setHTML(ex, index, st, si); }).join('') + '</div>' +
  '</article>';
}

function renderActiveSession(box) {
  const active = state.active;
  const total = active.exercises.reduce(function (a, e) { return a + e.sets.length; }, 0);
  const saved = active.exercises.reduce(function (a, e) {
    return a + e.sets.filter(function (s) { return s.savedAt; }).length;
  }, 0);
  const pct = total ? Math.round((saved / total) * 100) : 0;
  const tpl = state.templates.find(function (t) { return t.id === active.templateId; });

  let html = '<div class="view-head"><div><h2>' + esc(active.templateTitle) + '</h2>' +
    '<p>' + fmtDateTimeFromISO(active.startedAt) + '</p></div>' +
    '<button class="link-btn danger" data-act="discard">Descartar</button></div>';

  html += '<div class="session-bar"><div style="flex:1">' +
    '<div class="small strong">' + saved + ' de ' + total + ' séries registradas</div>' +
    '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
    '</div><div class="small muted">' + pct + '%</div></div>';

  html += active.exercises.map(exerciseCardHTML).join('');

  html += '<div class="card"><div class="eyebrow">Cardio no final</div>' +
    '<label class="check-line"><input type="checkbox" id="ses-cardio"' + (active.cardio.done ? ' checked' : '') + '> Fiz cardio</label>' +
    (tpl && tpl.cardio ? '<p class="tiny muted" style="margin-top:6px">' + esc(tpl.cardio) + '</p>' : '') +
    '<div class="form-row" style="margin-top:10px"><label class="field" style="margin:0"><span class="label">Minutos</span>' +
      '<input type="text" inputmode="numeric" id="ses-cardio-min" value="' + esc(active.cardio.minutes || '') + '" placeholder="10"></label>' +
    '</div></div>';

  html += '<div class="card"><label class="field" style="margin:0"><span class="label">Observações do treino</span>' +
    '<textarea id="ses-notes" placeholder="Sono, dor, técnica, alimentação...">' + esc(active.notes) + '</textarea></label></div>';

  html += '<button type="button" class="btn btn-primary btn-lg btn-block" data-act="finish">Concluir treino</button>';
  html += '<div class="tip" style="margin-top:12px"><span class="tip-icon">?</span><span>Registre a série logo após executá-la. O timer de descanso começa automaticamente (' +
    fmtClock(REST_BASICO * 1000) + ' básicos · ' + fmtClock(REST_ACESSORIO * 1000) + ' acessórios). ' + helpDot('rir', 'RIR') + '</span></div>';

  box.innerHTML = html;
  bindActiveSession(box);
}

function bindActiveSession(box) {
  box.querySelectorAll('[data-field]').forEach(function (inp) {
    const ei = parseInt(inp.dataset.ex, 10);
    const si = parseInt(inp.dataset.set, 10);
    const field = inp.dataset.field;
    const handler = function () {
      const ex = state.active && state.active.exercises[ei];
      if (!ex) return;
      const st = ex.sets[si];
      if (field === 'weight') {
        const v = parseNum(inp.value);
        st.weight = v == null ? 0 : Math.max(0, fromDisplayWeight(v));
      } else if (field === 'reps') {
        const v = parseNum(inp.value);
        st.reps = v == null ? null : Math.min(200, Math.max(0, Math.round(v)));
      } else if (field === 'rir') {
        st.rir = inp.value === '' ? null : parseInt(inp.value, 10);
      } else if (field === 'note') {
        st.note = inp.value;
      }
      persistSoon();
    };
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
  });

  box.querySelectorAll('[data-act]').forEach(function (btn) {
    const act = btn.dataset.act;
    const ei = parseInt(btn.dataset.ex, 10);
    const si = parseInt(btn.dataset.set, 10);
    if (act === 'save-set') btn.addEventListener('click', function () { saveSet(ei, si); });
    else if (act === 'guide') btn.addEventListener('click', function () {
      const ex = state.active && state.active.exercises[ei];
      if (ex) openExerciseGuide(ex);
    });
    else if (act === 'undo-set') btn.addEventListener('click', function () { undoSet(ei, si); });
    else if (act === 'toggle-done') btn.addEventListener('click', function () { toggleExerciseDone(ei); });
    else if (act === 'discard') btn.addEventListener('click', discardActive);
    else if (act === 'finish') btn.addEventListener('click', finishSession);
  });

  const cardio = $('#ses-cardio');
  if (cardio) cardio.addEventListener('change', function () {
    state.active.cardio.done = cardio.checked;
    persist();
  });
  const cardioMin = $('#ses-cardio-min');
  if (cardioMin) cardioMin.addEventListener('input', function () {
    const v = parseNum(cardioMin.value);
    state.active.cardio.minutes = v == null ? 0 : Math.min(180, Math.max(0, Math.round(v)));
    persistSoon();
  });
  const notes = $('#ses-notes');
  if (notes) notes.addEventListener('input', function () {
    state.active.notes = notes.value;
    persistSoon();
  });
}

function saveSet(ei, si) {
  if (!state.active) return;
  const ex = state.active.exercises[ei];
  if (!ex) return;
  const st = ex.sets[si];
  if (!st) return;
  if (!(st.reps > 0)) { toast('Informe as repetições.'); return; }
  if (st.rir == null) { toast('Selecione o RIR (0–4+).'); return; }
  const scrollY = window.scrollY;
  st.savedAt = new Date().toISOString();
  // Back-off automático: ~90% do top set, somente se a série 2 ainda não foi salva.
  if (ex.type === 'basico' && si === 0 && ex.sets[1] && !ex.sets[1].savedAt) {
    ex.sets[1].weight = roundHalf(st.weight * 0.9);
  }
  // Séries técnicas de carga fixa (ex.: agachamento leve a 80%): replica a carga
  // nas séries seguintes ainda não salvas, mantendo as duas séries iguais.
  if (ex.progress === false) {
    ex.sets.forEach(function (s, i) {
      if (i > si && !s.savedAt) s.weight = st.weight;
    });
  }
  persist();
  renderTreino();
  window.scrollTo(0, scrollY);
  startRest(ex.restSec, ex.name);
  toast('Série ' + (si + 1) + ' registrada · descanso ' + fmtClock(ex.restSec * 1000));
}

function undoSet(ei, si) {
  if (!state.active) return;
  const st = state.active.exercises[ei].sets[si];
  st.savedAt = null;
  persist();
  const scrollY = window.scrollY;
  renderTreino();
  window.scrollTo(0, scrollY);
  toast('Série desfeita.');
}

function toggleExerciseDone(ei) {
  if (!state.active) return;
  const ex = state.active.exercises[ei];
  ex.done = !ex.done;
  persist();
  const scrollY = window.scrollY;
  renderTreino();
  window.scrollTo(0, scrollY);
}

function discardActive() {
  if (!state.active) return;
  confirmModal({
    title: 'Descartar treino?',
    text: 'As séries registradas neste treino serão perdidas.',
    confirmLabel: 'Descartar',
    danger: true,
    onConfirm: function () {
      state.active = null;
      clearRest();
      persist();
      renderAll();
      toast('Treino descartado.');
    }
  });
}

function finishSession() {
  if (!state.active) return;
  const now = new Date();
  const parsedStart = new Date(state.active.startedAt).getTime();
  const startedMs = Number.isFinite(parsedStart) ? parsedStart : now.getTime();
  const parsedReal = state.active.realStartedAt ? new Date(state.active.realStartedAt).getTime() : startedMs;
  const realStartMs = Number.isFinite(parsedReal) ? parsedReal : startedMs;
  // Limite de 6 h evita durações absurdas ao retomar um treino esquecido aberto.
  const elapsed = Math.max(0, Math.min(now.getTime() - realStartMs, 6 * 60 * 60 * 1000));
  const finishedAt = new Date(startedMs + elapsed).toISOString();
  const draft = Object.assign({}, state.active, { finishedAt: finishedAt });
  const st = sessionStats(draft);
  if (!st.sets) {
    confirmModal({
      title: 'Nenhuma série registrada',
      text: 'Concluir sem séries não salva um treino. Deseja descartar esta sessão?',
      confirmLabel: 'Descartar',
      danger: true,
      onConfirm: function () {
        state.active = null;
        clearRest();
        persist();
        renderAll();
      }
    });
    return;
  }
  confirmModal({
    title: 'Concluir treino?',
    text: st.sets + ' séries · ' + fmtVolume(st.volume) + ' de volume · ' + st.minutes + ' min. Os dados serão salvos no histórico.',
    confirmLabel: 'Concluir e salvar',
    onConfirm: function () {
      const finished = normalizeSession(draft);
      state.sessions.push(finished);
      // Ordena por data para que treinos retroativos também entrem na posição certa.
      sortSessionsByRecency(state.sessions);
      state.active = null;
      clearRest();
      persist();
      toast('Treino salvo no histórico.');
      setView('historico');
    }
  });
}

/* =========================================================================
   TIMER DE DESCANSO
   ========================================================================= */
const restTimer = {
  remaining: 0,
  total: 0,
  endAt: 0,
  running: false,
  finished: false,
  visible: false,
  label: '',
  interval: null
};

function startRest(seconds, label) {
  restTimer.total = seconds;
  restTimer.remaining = seconds * 1000;
  restTimer.endAt = Date.now() + restTimer.remaining;
  restTimer.running = true;
  restTimer.finished = false;
  restTimer.visible = true;
  restTimer.label = label || '';
  updateTimerUI();
  if (!restTimer.interval) restTimer.interval = setInterval(tickRest, 300);
}

function clearRest() {
  restTimer.visible = false;
  restTimer.running = false;
  restTimer.finished = false;
  restTimer.remaining = 0;
  restTimer.label = '';
  if (restTimer.interval) { clearInterval(restTimer.interval); restTimer.interval = null; }
  updateTimerUI();
}

function tickRest() {
  if (!restTimer.visible) return;
  if (restTimer.running) {
    restTimer.remaining = Math.max(0, restTimer.endAt - Date.now());
    if (restTimer.remaining <= 0) {
      restTimer.running = false;
      restTimer.finished = true;
      if (navigator.vibrate) { try { navigator.vibrate([120, 80, 120]); } catch (e) {} }
      toast('Descanso concluído.');
    }
  }
  updateTimerUI();
}

function updateTimerUI() {
  const box = $('#rest-timer');
  if (!box) return;
  box.hidden = !restTimer.visible;
  if (!restTimer.visible) return;
  const timeEl = $('#rest-time');
  const labelEl = $('#rest-label');
  if (timeEl) timeEl.textContent = fmtClock(restTimer.remaining);
  if (labelEl) {
    const base = restTimer.finished ? 'Descanso concluído' : (restTimer.running ? 'Descanso' : 'Pausado');
    labelEl.textContent = restTimer.label ? base + ' · ' + restTimer.label : base;
    labelEl.title = labelEl.textContent;
  }
  box.classList.toggle('is-finished', restTimer.finished);
  const toggle = box.querySelector('[data-timer="toggle"]');
  if (toggle) toggle.textContent = restTimer.running ? 'Pausar' : (restTimer.finished ? 'Reiniciar' : 'Continuar');
}

function bindTimer() {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-timer]');
    if (!btn) return;
    const action = btn.dataset.timer;
    if (action === 'plus') {
      restTimer.remaining += 15000;
      if (restTimer.finished) { restTimer.finished = false; restTimer.running = true; }
      if (restTimer.running) restTimer.endAt = Date.now() + restTimer.remaining;
      restTimer.visible = true;
      updateTimerUI();
    } else if (action === 'toggle') {
      if (restTimer.finished) {
        restTimer.remaining = restTimer.total * 1000;
        restTimer.endAt = Date.now() + restTimer.remaining;
        restTimer.running = true;
        restTimer.finished = false;
      } else if (restTimer.running) {
        restTimer.remaining = Math.max(0, restTimer.endAt - Date.now());
        restTimer.running = false;
      } else {
        if (restTimer.remaining <= 0) restTimer.remaining = restTimer.total * 1000;
        restTimer.endAt = Date.now() + restTimer.remaining;
        restTimer.running = true;
      }
      updateTimerUI();
    } else if (action === 'reset' || action === 'close') {
      clearRest();
    }
  });
}

/* =========================================================================
   EDITOR DE TREINOS (CRUD dos templates)
   ========================================================================= */
function openEditor(templateId) {
  let tpl = state.templates.find(function (t) { return t.id === templateId; }) || state.templates[0];
  ui.editor = {
    isNew: !tpl,
    draft: tpl ? clone(tpl) : {
      id: uid(),
      day: 'extra',
      title: 'Novo treino',
      focus: '',
      optional: false,
      cardio: '',
      exercises: []
    }
  };
  setView('treino');
}

function renderEditor(box) {
  const ed = ui.editor;
  if (!ed) { renderTreino(); return; }
  const d = ed.draft;
  const dayOptions = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom', 'extra'];

  let html = '<div class="view-head"><div><h2>Editar treinos</h2><p>Personalize os seus dias</p></div>' +
    '<button class="link-btn" data-act="back">Voltar</button></div>';

  html += '<div class="chips" style="margin-bottom:12px">' +
    state.templates.map(function (t) {
      return '<button type="button" class="chip ' + (t.id === d.id ? 'is-active' : '') + '" data-act="select" data-id="' + esc(t.id) + '">' + esc(t.title) + '</button>';
    }).join('') +
    '<button type="button" class="chip" data-act="new">+ Novo</button></div>';

  html += '<div class="card">' +
    '<label class="field"><span class="label">Nome do treino</span>' +
      '<input type="text" data-tpl-field="title" value="' + esc(d.title) + '" placeholder="Push, Pull, Legs..."></label>' +
    '<div class="form-row">' +
      '<label class="field"><span class="label">Dia</span><select data-tpl-field="day">' +
        dayOptions.map(function (day) {
          return '<option value="' + day + '"' + (d.day === day ? ' selected' : '') + '>' + diaLabel(day) + '</option>';
        }).join('') + '</select></label>' +
      '<label class="field"><span class="label">Tipo</span><select data-tpl-field="optional">' +
        '<option value="0"' + (!d.optional ? ' selected' : '') + '>Fixo</option>' +
        '<option value="1"' + (d.optional ? ' selected' : '') + '>Opcional</option></select></label>' +
    '</div>' +
    '<label class="field"><span class="label">Foco / grupo muscular</span>' +
      '<input type="text" data-tpl-field="focus" value="' + esc(d.focus) + '" placeholder="Peito, ombro e tríceps"></label>' +
    '<label class="field" style="margin-bottom:0"><span class="label">Cardio sugerido</span>' +
      '<input type="text" data-tpl-field="cardio" value="' + esc(d.cardio) + '" placeholder="10–15 min de LISS"></label>' +
  '</div>';

  html += '<div class="eyebrow" style="margin:14px 0 8px">Exercícios</div>';
  if (!d.exercises.length) {
    html += '<div class="empty" style="margin-bottom:10px">Nenhum exercício. Adicione o primeiro abaixo.</div>';
  }
  html += d.exercises.map(function (e, i) {
    const isBasic = e.type === 'basico';
    const exTips = (Array.isArray(e.tips) && e.tips.length ? e.tips : defaultTipsFor(e.name, e.type));
    return '<div class="edit-ex">' +
      '<div class="edit-ex-top">' +
        '<input type="text" data-ex-field="name" data-idx="' + i + '" value="' + esc(e.name) + '" placeholder="Nome do exercício" aria-label="Nome do exercício">' +
        '<button type="button" class="mini-btn" data-act="up" data-idx="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Mover para cima">↑</button>' +
        '<button type="button" class="mini-btn" data-act="down" data-idx="' + i + '"' + (i === d.exercises.length - 1 ? ' disabled' : '') + ' aria-label="Mover para baixo">↓</button>' +
        '<button type="button" class="mini-btn danger" data-act="remove" data-idx="' + i + '" aria-label="Remover exercício">×</button>' +
      '</div>' +
      '<div class="form-row">' +
        '<label class="field"><span class="label">Tipo</span><select data-ex-field="type" data-idx="' + i + '">' +
          '<option value="basico"' + (isBasic ? ' selected' : '') + '>Básico</option>' +
          '<option value="acessorio"' + (!isBasic ? ' selected' : '') + '>Acessório</option></select></label>' +
        '<label class="field"><span class="label">Grupo</span><select data-ex-field="loadGroup" data-idx="' + i + '">' +
          '<option value="upper"' + (e.loadGroup !== 'lower' ? ' selected' : '') + '>Superior (+2,5 kg)</option>' +
          '<option value="lower"' + (e.loadGroup === 'lower' ? ' selected' : '') + '>Inferior (+5 kg)</option></select></label>' +
      '</div>' +
      '<div class="form-row-3">' +
        '<label class="field"><span class="label">Séries</span><input type="text" inputmode="numeric" data-ex-field="sets" data-idx="' + i + '" value="' + esc(e.sets) + '"></label>' +
        '<label class="field"><span class="label">Reps mín.</span><input type="text" inputmode="numeric" data-ex-field="repMin" data-idx="' + i + '" value="' + esc(e.repMin) + '"></label>' +
        '<label class="field"><span class="label">Reps máx.</span><input type="text" inputmode="numeric" data-ex-field="repMax" data-idx="' + i + '" value="' + esc(e.repMax) + '"></label>' +
      '</div>' +
      '<div class="tiny muted" style="margin:-4px 0 8px">Descanso: ' + fmtClock((isBasic ? REST_BASICO : REST_ACESSORIO) * 1000) + ' (automático pelo tipo)</div>' +
      '<label class="field" style="margin-bottom:0"><span class="label">Observação (opcional)</span>' +
        '<input type="text" data-ex-field="note" data-idx="' + i + '" value="' + esc(e.note) + '" placeholder="Ex.: 80% da carga de quinta"></label>' +
      '<label class="field" style="margin:10px 0 0"><span class="label">Dicas de execução (uma por linha)</span>' +
        '<textarea data-ex-field="tips" data-idx="' + i + '" placeholder="Ex.: Escápulas apertadas, desça controlando...">' + esc(exTips.join('\n')) + '</textarea>' +
        '<span class="hint">Aparecem no guia durante o treino. Se apagar tudo, as dicas padrão voltam.</span></label>' +
      '<button type="button" class="btn btn-ghost btn-block" data-act="guide" data-idx="' + i + '" style="margin-top:8px">Ver guia de execução</button>' +
    '</div>';
  }).join('');

  html += '<button type="button" class="btn btn-secondary btn-block" data-act="add" style="margin-bottom:12px">+ Adicionar exercício</button>';
  html += '<button type="button" class="btn btn-primary btn-lg btn-block" data-act="save">Salvar treino</button>';
  html += '<div class="btn-row" style="margin-top:8px">' +
    '<button type="button" class="btn btn-ghost" data-act="restore">Restaurar padrão</button>' +
    (ed.isNew ? '' : '<button type="button" class="btn btn-danger" data-act="delete">Excluir</button>') +
  '</div>';
  html += '<p class="tiny muted" style="margin-top:10px">O editor altera os templates. Treinos já salvos no histórico não mudam.</p>';

  box.innerHTML = html;
  bindEditor(box);
}

function bindEditor(box) {
  const ed = ui.editor;
  if (!ed) return;
  const d = ed.draft;

  box.querySelectorAll('[data-tpl-field]').forEach(function (inp) {
    const field = inp.dataset.tplField;
    const handler = function () {
      if (field === 'optional') d.optional = inp.value === '1';
      else d[field] = inp.value;
    };
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
  });

  box.querySelectorAll('[data-ex-field]').forEach(function (inp) {
    const idx = parseInt(inp.dataset.idx, 10);
    const field = inp.dataset.exField;
    const handler = function () {
      const ex = d.exercises[idx];
      if (!ex) return;
      if (field === 'tips') {
        ex.tips = inp.value.split('\n');
      } else if (field === 'name') {
        // Se o usuário ainda não personalizou as dicas, acompanha o novo nome.
        const wasDefault = !Array.isArray(ex.tips) || JSON.stringify(ex.tips) === JSON.stringify(defaultTipsFor(ex.name, ex.type));
        ex.name = inp.value;
        if (wasDefault) ex.tips = defaultTipsFor(ex.name, ex.type);
      } else if (field === 'sets' || field === 'repMin' || field === 'repMax') {
        const v = parseInt(inp.value, 10);
        ex[field] = Number.isFinite(v) ? v : ex[field];
      } else {
        ex[field] = inp.value;
      }
    };
    inp.addEventListener('input', handler);
    inp.addEventListener('change', handler);
  });

  box.querySelectorAll('[data-act]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const act = btn.dataset.act;
      const idx = parseInt(btn.dataset.idx, 10);
      if (act === 'guide') {
        const ex = d.exercises[idx];
        if (ex) openExerciseGuide(ex);
        return;
      }
      if (act === 'back') { ui.editor = null; renderTreino(); return; }
      if (act === 'select') { openEditor(btn.dataset.id); return; }
      if (act === 'new') {
        ui.editor = {
          isNew: true,
          draft: { id: uid(), day: 'extra', title: 'Novo treino', focus: '', optional: false, cardio: '', exercises: [] }
        };
        renderTreino();
        return;
      }
      if (act === 'add') {
        d.exercises.push({ id: uid(), name: 'Novo exercício', type: 'acessorio', sets: 2, repMin: 8, repMax: 12, restSec: REST_ACESSORIO, loadGroup: 'upper', note: '' });
        renderTreino();
        return;
      }
      if (act === 'remove') {
        d.exercises.splice(idx, 1);
        renderTreino();
        return;
      }
      if (act === 'up' && idx > 0) {
        const tmp = d.exercises[idx - 1];
        d.exercises[idx - 1] = d.exercises[idx];
        d.exercises[idx] = tmp;
        renderTreino();
        return;
      }
      if (act === 'down' && idx < d.exercises.length - 1) {
        const tmp = d.exercises[idx + 1];
        d.exercises[idx + 1] = d.exercises[idx];
        d.exercises[idx] = tmp;
        renderTreino();
        return;
      }
      if (act === 'save') { saveEditor(); return; }
      if (act === 'restore') {
        confirmModal({
          title: 'Restaurar treinos padrão?',
          text: 'Os 4 treinos padrão (Push, Pull, Legs e Reforço) substituirão os templates atuais. O histórico é mantido.',
          confirmLabel: 'Restaurar',
          onConfirm: function () {
            state.templates = defaultTemplates();
            persist();
            ui.editor = null;
            renderTreino();
            toast('Treinos padrão restaurados.');
          }
        });
        return;
      }
      if (act === 'delete') {
        confirmModal({
          title: 'Excluir treino?',
          text: 'O template “' + d.title + '” será removido. O histórico é mantido.',
          confirmLabel: 'Excluir',
          danger: true,
          onConfirm: function () {
            state.templates = state.templates.filter(function (t) { return t.id !== d.id; });
            persist();
            ui.editor = null;
            renderTreino();
            toast('Treino excluído.');
          }
        });
      }
    });
  });
}

function saveEditor() {
  const ed = ui.editor;
  if (!ed) return;
  const d = ed.draft;
  d.title = String(d.title || '').trim() || 'Treino';
  d.focus = String(d.focus || '').trim();
  d.cardio = String(d.cardio || '').trim();
  d.day = d.day || 'extra';
  d.exercises = d.exercises.filter(function (e) { return String(e.name || '').trim(); });
  if (!d.exercises.length) { toast('Adicione ao menos um exercício.'); return; }

  d.exercises.forEach(function (e) {
    e.id = e.id || uid();
    e.name = String(e.name).trim();
    e.type = e.type === 'basico' ? 'basico' : 'acessorio';
    e.sets = clampInt(e.sets, 1, 6, 2);
    e.repMin = clampInt(e.repMin, 1, 50, 8);
    e.repMax = clampInt(e.repMax, 1, 50, 12);
    if (e.repMax < e.repMin) e.repMax = e.repMin;
    e.loadGroup = e.loadGroup === 'lower' ? 'lower' : 'upper';
    e.restSec = e.type === 'basico' ? REST_BASICO : REST_ACESSORIO;
    e.note = String(e.note || '').trim();
    e.tips = (Array.isArray(e.tips) ? e.tips : []).map(function (x) { return String(x).trim(); }).filter(Boolean);
    if (!e.tips.length) e.tips = defaultTipsFor(e.name, e.type);
  });

  const idx = state.templates.findIndex(function (t) { return t.id === d.id; });
  if (idx >= 0) state.templates[idx] = d;
  else state.templates.push(d);
  persist();
  ui.editor = null;
  renderAll();
  toast('Treino salvo.');
}

/* =========================================================================
   HISTÓRICO
   ========================================================================= */
function renderHistorico() {
  const box = $('#historico-content');
  if (!box) return;
  const titles = [];
  state.sessions.forEach(function (s) {
    if (titles.indexOf(s.templateTitle) === -1) titles.push(s.templateTitle);
  });
  if (ui.histFilter !== 'todos' && titles.indexOf(ui.histFilter) === -1) ui.histFilter = 'todos';
  const list = state.sessions.filter(function (s) {
    return ui.histFilter === 'todos' || s.templateTitle === ui.histFilter;
  });

  let html = '<div class="view-head"><div><h2>Histórico</h2><p>' + state.sessions.length +
    (state.sessions.length === 1 ? ' treino salvo' : ' treinos salvos') + '</p></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-act="add-past">+ Treino passado</button></div>';

  if (!state.sessions.length) {
    html += '<div class="empty">Nenhum treino registrado ainda.<br><br>' +
      '<button class="btn btn-primary btn-sm" data-act="go-treino">Iniciar treino</button> ' +
      '<button class="btn btn-secondary btn-sm" data-act="add-past">Adicionar treino passado</button></div>';
    box.innerHTML = html;
    bindHistorico(box);
    return;
  }

  if (titles.length > 1) {
    html += '<div class="chips" style="margin-bottom:12px">' +
      ['todos'].concat(titles).map(function (t) {
        return '<button type="button" class="chip ' + (ui.histFilter === t ? 'is-active' : '') + '" data-filter="' + esc(t) + '">' + (t === 'todos' ? 'Todos' : esc(t)) + '</button>';
      }).join('') + '</div>';
  }

  if (!list.length) html += '<div class="empty">Nenhum treino nesse filtro.</div>';
  else html += '<div class="list">' + list.map(sessionRowHTML).join('') + '</div>';

  box.innerHTML = html;
  bindHistorico(box);
}

function bindHistorico(box) {
  box.querySelectorAll('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ui.histFilter = btn.dataset.filter;
      renderHistorico();
    });
  });
  box.querySelectorAll('[data-session]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const s = state.sessions.find(function (x) { return x.id === btn.dataset.session; });
      if (s) openSessionDetail(s, { deletable: true });
    });
  });
  const go = box.querySelector('[data-act="go-treino"]');
  if (go) go.addEventListener('click', function () { setView('treino'); });
  const addPast = box.querySelector('[data-act="add-past"]');
  if (addPast) addPast.addEventListener('click', openAddPastWorkout);
}

/**
 * Adiciona um treino esquecido: escolhe o template e a data retroativa e
 * abre a sessão naquela data para registrar as séries normalmente.
 */
function openAddPastWorkout() {
  if (!state.templates.length) {
    toast('Cadastre um treino antes de registrar um passado.');
    return;
  }
  const today = dateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const defaultDate = dateKey(yesterdayDate);
  openModal({
    title: 'Adicionar treino passado',
    body: '<p class="small muted" style="margin-bottom:12px">Escolha o treino e a data em que ele aconteceu. As séries serão registradas normalmente e salvas no histórico com essa data.</p>' +
      '<label class="field"><span class="label">Treino</span><select id="past-template">' +
      state.templates.map(function (t) {
        return '<option value="' + esc(t.id) + '">' + esc(t.title) + (t.optional ? ' (opcional)' : '') + '</option>';
      }).join('') +
      '</select></label>' +
      '<label class="field" style="margin:0"><span class="label">Data</span>' +
      '<input type="date" id="past-date" value="' + defaultDate + '" max="' + today + '"></label>',
    actions: [
      {
        label: 'Começar registro',
        kind: 'btn-primary',
        onClick: function () {
          const sel = $('#past-template');
          const dt = $('#past-date');
          const id = sel ? sel.value : '';
          const date = dt && dt.value && dt.value <= today ? dt.value : today;
          closeModal();
          startSession(id, { date: date });
        }
      },
      { label: 'Cancelar', kind: 'btn-ghost', onClick: closeModal }
    ]
  });
}

/* =========================================================================
   PROGRESSO
   ========================================================================= */
function renderProgresso() {
  const box = $('#progresso-content');
  if (!box) return;
  const alerts = deloadAlerts();
  const names = basicExerciseNames();
  if (!ui.loadExercise || names.indexOf(ui.loadExercise) === -1) ui.loadExercise = names[0] || '';
  const weeks = weeklySeries(8);
  const prs = Object.keys(prMap()).map(function (k) { return prMap()[k]; }).sort(function (a, b) { return b.e1rm - a.e1rm; });
  const suggestions = [];
  const seen = {};
  state.templates.forEach(function (tpl) {
    tpl.exercises.forEach(function (ex) {
      if (seen[ex.name]) return;
      seen[ex.name] = true;
      suggestions.push({ ex: ex, adv: nextLoadAdvice(ex), tpl: tpl.title });
    });
  });

  let html = '<div class="view-head"><div><h2>Progresso</h2><p>Volume, frequência, PRs e sugestões</p></div>' + helpDot('dupla-progressao', 'dupla progressão') + '</div>';

  if (alerts.length) {
    html += '<div class="card card-warn"><div class="card-head"><div><div class="eyebrow warn">Deload</div><h3>Hora de aliviar</h3></div>' + helpDot('deload') + '</div>' +
      alerts.map(function (a) {
        return '<div class="list-row static" style="background:transparent;border-color:rgba(247,189,92,0.25);margin-bottom:8px">' +
          '<div class="list-row-main"><div class="list-row-title">' + esc(a.name) + '</div>' +
          '<div class="list-row-sub" style="white-space:normal">2 treinos sem bater ' + a.repMax + ' reps · sugerido ' + fmtWeightUnit(a.suggested) + ' (−10%)</div></div>' +
          '<button type="button" class="mini-btn" data-term="deload" aria-label="Ver glossário">?</button></div>';
      }).join('') +
      '<button class="link-btn" data-term="deload">Como fazer o deload</button></div>';
  }

  html += '<div class="card"><div class="card-head"><div><div class="eyebrow">Evolução de carga</div><h3>' + esc(ui.loadExercise || 'Sem dados') + '</h3></div></div>';
  if (names.length) {
    html += '<select id="prog-exercise" aria-label="Exercício básico">' +
      names.map(function (n) { return '<option value="' + esc(n) + '"' + (n === ui.loadExercise ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>' +
      '<div class="chart-wrap" style="margin-top:10px"><canvas id="prog-load-chart"></canvas></div>' +
      '<p class="tiny muted" style="margin-top:6px">Top set por treino · ' + unit() + '</p>';
  } else {
    html += '<div class="empty">Sem exercícios básicos cadastrados.</div>';
  }
  html += '</div>';

  html += '<div class="card"><div class="card-head"><div><div class="eyebrow">Volume semanal</div><h3>Últimas 8 semanas</h3></div></div>' +
    '<div class="chart-wrap"><canvas id="prog-volume-chart"></canvas></div>' +
    '<p class="tiny muted" style="margin-top:6px">Carga × reps somadas na semana · ' + unit() + '</p></div>';

  html += '<div class="card"><div class="card-head"><div><div class="eyebrow">Frequência</div><h3>Treinos por semana</h3></div></div>' +
    '<div class="chart-wrap"><canvas id="prog-freq-chart"></canvas></div>' +
    '<p class="tiny muted" style="margin-top:6px">Meta: 3 dias fixos + 1 opcional</p></div>';

  html += '<div class="card"><div class="card-head"><div><div class="eyebrow">Recordes (PRs)</div><h3>Melhores marcas</h3></div>' + helpDot('pr', 'PR e 1RM') + '</div>';
  if (!prs.length) {
    html += '<div class="empty">Registre séries para ver os PRs.</div>';
  } else {
    html += '<div class="list">' + prs.map(function (p) {
      return '<div class="list-row static"><div class="list-row-main">' +
        '<div class="list-row-title">' + esc(p.name) + '</div>' +
        '<div class="list-row-sub">' + fmtWeightUnit(p.weight) + ' × ' + p.reps + ' · 1RM est. ' + fmtWeightUnit(p.e1rm) + '</div></div>' +
        '<div class="list-row-end"><span class="badge badge-basic">PR</span></div></div>';
    }).join('') + '</div>';
  }
  html += '</div>';

  html += '<div class="card"><div class="card-head"><div><div class="eyebrow">Sugestões</div><h3>Próximas cargas</h3></div>' + helpDot('dupla-progressao') + '</div>';
  if (!suggestions.length) {
    html += '<div class="empty">Cadastre treinos para receber sugestões.</div>';
  } else {
    html += '<div class="list">' + suggestions.map(function (s) {
      return '<div class="list-row static"><div class="list-row-main">' +
        '<div class="list-row-title">' + esc(s.ex.name) + ' <span class="badge ' + (s.ex.type === 'basico' ? 'badge-basic' : 'badge-acc') + '">' + (s.ex.type === 'basico' ? 'básico' : 'acessório') + '</span></div>' +
        '<div class="list-row-sub" style="white-space:normal">' + s.adv.text + '</div></div></div>';
    }).join('') + '</div>';
  }
  html += '</div>';

  box.innerHTML = html;

  const sel = $('#prog-exercise');
  if (sel) sel.addEventListener('change', function () { ui.loadExercise = sel.value; renderProgresso(); });

  requestAnimationFrame(function () {
    if (ui.view !== 'progresso') return;
    drawLineChart($('#prog-load-chart'), loadSeries(ui.loadExercise));
    drawBarChart($('#prog-volume-chart'), weeks.map(function (w) {
      return { label: w.label, value: toDisplayWeight(w.volume) };
    }));
    drawBarChart($('#prog-freq-chart'), weeklySeries(6).map(function (w) {
      return { label: w.label, value: w.count };
    }));
  });
}

/* =========================================================================
   AJUDA / GLOSSÁRIO
   ========================================================================= */
function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function glossaryCardHTML(g, open) {
  return '<details class="card glossary-card" ' + (open ? 'open' : '') + '>' +
    '<summary><span>' + esc(g.term) + '</span></summary>' +
    '<div class="g-body">' + g.body +
      '<div class="g-ex">' + g.example + '</div>' +
    '</div>' +
  '</details>';
}

function renderAjuda() {
  const box = $('#ajuda-content');
  if (!box) return;
  let html = '<div class="view-head"><div><h2>Ajuda / Glossário</h2><p>Entenda RIR, deload e progressão</p></div></div>' +
    '<label class="field"><span class="label">Buscar no glossário</span>' +
    '<input type="search" id="glossary-search" placeholder="RIR, deload, top set..." value="' + esc(ui.helpQuery) + '"></label>' +
    '<div id="glossary-list" class="list"></div>';

  html += '<div class="card" style="margin-top:12px"><div class="eyebrow">Como registrar rápido</div>' +
    '<ol class="small muted" style="margin:8px 0 0 18px;padding:0;line-height:1.7">' +
      '<li>Abra <strong>Treino</strong> e toque em “Iniciar treino”.</li>' +
      '<li>Toque no <strong>i</strong> ao lado do exercício para ver o guia e as dicas.</li>' +
      '<li>Faça a série, informe peso, reps e RIR.</li>' +
      '<li>Toque em “Registrar série”. O timer de descanso começa sozinho.</li>' +
      '<li>Finalize com “Concluir treino”. Tudo fica salvo no histórico.</li>' +
    '</ol></div>';

  html += '<div class="card"><div class="eyebrow">Regras do seu plano</div>' +
    '<p class="small muted" style="margin-top:6px">Push / Pull / Legs em <strong>segunda, terça e quinta</strong>. Sexta é reforço <strong>opcional</strong> e não conta como dia obrigatório do PPL. Cardio LISS de 10–15 min no fim.</p>' +
    '<p class="small muted" style="margin-top:8px">Básicos: 2 séries (top set 3–5 + back-off ~90% por 5–6). Acessórios: 2 séries na faixa indicada.</p></div>';

  html += '<div class="card"><div class="eyebrow">Sexta opcional</div><h3>Reforço + Hipertrofia</h3>' +
    '<p class="small muted" style="margin-top:6px">Dia de reforço, não de força máxima. Nada de supino pesado, terra pesado ou agachamento pesado. Se não estiver recuperado, pule: o ciclo continua na segunda.</p>' +
    '<p class="small muted" style="margin-top:8px"><strong>Completa:</strong> agachamento leve 2×5 a 80% da quinta · remada 2×8–10 · elevação lateral 2×12–15 · rosca 2×10–12 · tríceps 2×10–12 · flexora 2×10–12 · core 2 séries · cardio 20–30 min LISS ou HIIT 6–10 min.</p>' +
    '<p class="small muted" style="margin-top:8px"><strong>Enxuta:</strong> agachamento leve · remada · elevação lateral · tríceps corda · core.</p>' +
    '<p class="tiny muted" style="margin-top:8px">Para a versão enxuta, edite a sexta em “Editar treinos” e remova rosca e flexora. Os extras progridem em dupla progressão; o agachamento leve é técnico e mantém ~80% da carga de quinta.</p></div>';

  html += '<div class="card"><div class="eyebrow">Sobre o app</div>' +
    '<p class="small muted" style="margin-top:6px">Versão ' + APP_VERSION + ' · PWA offline-first. Seus dados ficam apenas neste dispositivo, em <code>localStorage</code>.</p>' +
    '<button class="btn btn-secondary btn-block" style="margin-top:10px" data-act="onboarding">Rever o tutorial de boas-vindas</button></div>';

  box.innerHTML = html;
  bindAjuda(box);
}

function renderGlossaryList(query) {
  const list = $('#glossary-list');
  if (!list) return;
  const q = String(query || '').trim().toLowerCase();
  const items = GLOSSARY.filter(function (g) {
    if (!q) return true;
    return (g.term + ' ' + stripTags(g.body) + ' ' + stripTags(g.example)).toLowerCase().indexOf(q) !== -1;
  });
  if (!items.length) {
    list.innerHTML = '<div class="empty">Nada encontrado. Tente “RIR”, “deload” ou “top set”.</div>';
    return;
  }
  list.innerHTML = items.map(function (g) { return glossaryCardHTML(g, !!q); }).join('');
}

function bindAjuda(box) {
  const search = $('#glossary-search');
  if (search) {
    search.addEventListener('input', function () {
      ui.helpQuery = search.value;
      renderGlossaryList(ui.helpQuery);
    });
  }
  renderGlossaryList(ui.helpQuery);
  const ob = box.querySelector('[data-act="onboarding"]');
  if (ob) ob.addEventListener('click', showOnboarding);
}

function openExerciseGuide(ex) {
  if (!ex) return;
  const tips = (Array.isArray(ex.tips) ? ex.tips : []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  const list = tips.length ? tips : defaultTipsFor(ex.name, ex.type);
  const asset = guideVisualFor(ex.name);
  const body =
    '<div class="guide-visual">' +
      '<img src="assets/exercicios/' + asset + '.svg" alt="Ilustração animada de ' + esc(ex.name) + '" loading="eager" decoding="async">' +
    '</div>' +
    '<div class="guide-section-head"><div class="eyebrow">Dicas de execução</div><span class="tiny muted">' + list.length + ' dicas</span></div>' +
    '<ul class="guide-tips">' + list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
    '<p class="tiny muted guide-foot">Dicas editáveis em <strong>Treino → Editar treinos</strong>.</p>';
  openModal({
    title: ex.name,
    body: body,
    actions: [{ label: 'Fechar', kind: 'btn-primary', onClick: closeModal }]
  });
}

function showGlossary(termId) {
  const g = GLOSSARY.find(function (x) { return x.id === termId; });
  if (!g) return;
  openModal({
    title: g.term,
    body: '<div>' + g.body + '</div><div class="example">' + g.example + '</div>',
    actions: [
      {
        label: 'Abrir no glossário',
        kind: 'btn-primary',
        onClick: function () {
          closeModal();
          ui.helpQuery = g.term.split(' ')[0];
          setView('ajuda');
        }
      },
      { label: 'Fechar', kind: 'btn-ghost', onClick: closeModal }
    ]
  });
}

/* =========================================================================
   CONFIGURAÇÕES, BACKUP E INSTALAÇÃO
   ========================================================================= */
function renderConfig() {
  const box = $('#config-content');
  if (!box) return;
  const s = state.settings;
  let bytes = 0;
  try { bytes = new Blob([JSON.stringify(state)]).size; } catch (e) { bytes = JSON.stringify(state).length; }
  const activity = ['sedentary', 'light', 'moderate'].indexOf(s.activityLevel) !== -1 ? s.activityLevel : 'light';

  let html = '<div class="view-head"><div><h2>Configurações</h2><p>Perfil, metas e dados</p></div></div>';

  html += '<div class="card"><div class="eyebrow">Perfil e metas</div>' +
    '<div class="form-row">' +
      '<label class="field"><span class="label">Peso corporal (' + unit() + ')</span>' +
        '<input type="text" inputmode="decimal" id="cfg-bodyweight" value="' + esc(weightToInput(s.bodyweightKg)) + '"></label>' +
      '<label class="field"><span class="label">Unidade</span><select id="cfg-unit">' +
        '<option value="kg"' + (unit() === 'kg' ? ' selected' : '') + '>Quilogramas (kg)</option>' +
        '<option value="lb"' + (unit() === 'lb' ? ' selected' : '') + '>Libras (lb)</option></select></label>' +
    '</div>' +
    '<label class="field"><span class="label">Meta de proteína (g/dia)</span>' +
      '<input type="number" inputmode="numeric" id="cfg-protein" min="40" max="300" value="' + esc(s.proteinGoal) + '">' +
      '<span class="hint" id="cfg-protein-hint">' + proteinHintText() + '</span></label>' +
    '<label class="field" style="margin-bottom:0"><span class="label">Superávit calórico (kcal/dia)</span>' +
      '<input type="number" inputmode="numeric" id="cfg-surplus" min="200" max="300" value="' + esc(s.surplusKcal) + '">' +
      '<span class="hint">Somado ao gasto estimado para ganho de força com pouco ganho de gordura.</span></label>' +
  '</div>';

  html += '<div class="card"><div class="eyebrow">Calorias diárias</div>' +
    '<label class="field" style="margin-top:8px"><span class="label">Nível de atividade</span>' +
      '<select id="cfg-activity">' +
        '<option value="sedentary"' + (activity === 'sedentary' ? ' selected' : '') + '>Sedentário (pouco ou nenhum exercício)</option>' +
        '<option value="light"' + (activity === 'light' ? ' selected' : '') + '>Levemente ativo (1–3 treinos/semana)</option>' +
        '<option value="moderate"' + (activity === 'moderate' ? ' selected' : '') + '>Moderadamente ativo (3–5 treinos/semana)</option>' +
      '</select></label>' +
    '<div class="calorie-box">' +
      '<div class="calorie-total"><span id="cfg-calories">—</span><span class="calorie-unit">kcal/dia</span></div>' +
      '<div class="calorie-breakdown">' +
        '<span>Gasto basal <strong id="cfg-bmr">—</strong></span>' +
        '<span>Com atividade <strong id="cfg-tdee">—</strong></span>' +
        '<span>Superávit <strong id="cfg-surplus-kcal">—</strong></span>' +
      '</div>' +
    '</div>' +
    '<p class="tiny muted" style="margin-top:8px">Mifflin-St Jeor · 26 anos · 1,71 m · masculino. Estimativa para começar; ajuste pela balança.</p></div>';

  html += '<div class="card"><div class="eyebrow">App</div>' +
    '<div class="list-row static" style="margin-top:8px"><div class="list-row-main">' +
      '<div class="list-row-title">Instalar como app</div>' +
      '<div class="list-row-sub" style="white-space:normal">' + (isStandalone() || isNative() ? 'Você já está usando o app instalado.' : 'Adicione à tela inicial e use sem internet.') + '</div></div>' +
      '<button type="button" class="btn btn-sm btn-primary" id="cfg-install">' + (isStandalone() || isNative() ? 'Instalado' : 'Instalar') + '</button></div>' +
    '<p class="tiny muted" style="margin-top:10px">Versão ' + APP_VERSION + ' · PWA offline-first · ' + (navigator.onLine ? 'online agora' : 'sem internet agora') + '</p>' +
    '<p class="tiny muted" style="margin-top:4px">Dados salvos localmente: ' + (bytes / 1024).toFixed(1) + ' KB · ' + state.sessions.length + ' treinos · ' + state.templates.length + ' templates</p>' +
  '</div>';

  html += '<div class="card"><div class="eyebrow">Backup dos dados</div>' +
    '<p class="small muted" style="margin:6px 0 10px">Exporte um JSON para guardar ou transferir. Importar substitui todos os dados atuais.</p>' +
    '<div class="btn-row">' +
      '<button type="button" class="btn btn-secondary" id="cfg-export">Exportar JSON</button>' +
      '<button type="button" class="btn btn-secondary" id="cfg-import">Importar JSON</button>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<button type="button" class="btn btn-ghost btn-block" id="cfg-restore">Restaurar treinos padrão</button>' +
    '<button type="button" class="btn btn-danger btn-block" style="margin-top:8px" id="cfg-reset">Apagar todos os dados</button>' +
  '</div>';

  html += '<div class="card"><div class="eyebrow">Sobre</div>' +
    '<p class="small muted" style="margin-top:6px">Treino Força é um PWA offline-first sem backend, sem login e sem anúncios. Feito para registrar rápido: peso, reps e RIR.</p>' +
    '<p class="tiny muted" style="margin-top:8px">Objetivo: ganho de força · Push/Pull/Legs · 3 dias fixos + reforço opcional.</p>' +
  '</div>';

  box.innerHTML = html;
  bindConfig();
  updateInstallUI();
  updateCalorieTarget();
}

function proteinHintText() {
  const kg = Number(state.settings.bodyweightKg) || 0;
  const lower = Math.round(kg * 1.6);
  const upper = Math.round(kg * 2.2);
  return 'Faixa recomendada: ' + lower + '–' + upper + ' g/dia (≈ 2 g/kg para ' + fmtNum(kg, 1) + ' kg).';
}

function updateProteinHint() {
  const el = $('#cfg-protein-hint');
  if (el) el.textContent = proteinHintText();
}

/** Mifflin-St Jeor com dados fixos do perfil: 26 anos, 1,71 m, masculino. */
function calorieEstimate() {
  const s = state.settings;
  const weight = Number(s.bodyweightKg) || 0;
  const height = Number(s.heightCm) || 171;
  const bmr = 10 * weight + 6.25 * height - 5 * 26 + 5;
  const levels = {
    sedentary: { label: 'Sedentário', factor: 1.2 },
    light: { label: 'Levemente ativo', factor: 1.375 },
    moderate: { label: 'Moderadamente ativo', factor: 1.55 }
  };
  const key = levels[s.activityLevel] ? s.activityLevel : 'light';
  const level = levels[key];
  const surplus = clampInt(s.surplusKcal, 200, 300, 250);
  const tdee = bmr * level.factor;
  return { bmr: bmr, tdee: tdee, surplus: surplus, total: tdee + surplus, label: level.label, key: key };
}

function updateCalorieTarget() {
  const total = $('#cfg-calories');
  if (!total) return;
  const c = calorieEstimate();
  total.textContent = fmtNum(c.total, 0);
  const bmr = $('#cfg-bmr');
  if (bmr) bmr.textContent = fmtNum(c.bmr, 0) + ' kcal';
  const tdee = $('#cfg-tdee');
  if (tdee) tdee.textContent = fmtNum(c.tdee, 0) + ' kcal';
  const surplus = $('#cfg-surplus-kcal');
  if (surplus) surplus.textContent = '+' + fmtNum(c.surplus, 0) + ' kcal';
}

function bindConfig() {
  const bw = $('#cfg-bodyweight');
  if (bw) bw.addEventListener('change', function () {
    const v = parseNum(bw.value);
    if (v == null) { toast('Informe um peso válido.'); bw.value = weightToInput(state.settings.bodyweightKg); return; }
    const kg = unit() === 'lb' ? v * KG_PER_LB : v;
    if (kg < 30 || kg > 250) { toast('Peso entre 30 e 250 kg.'); bw.value = weightToInput(state.settings.bodyweightKg); return; }
    state.settings.bodyweightKg = Math.round(kg * 10) / 10;
    // Regra automática: 2 g de proteína por kg de peso corporal.
    state.settings.proteinGoal = clampInt(Math.round(state.settings.bodyweightKg * 2), 40, 300, 120);
    bw.value = weightToInput(state.settings.bodyweightKg);
    const proteinInput = $('#cfg-protein');
    if (proteinInput) proteinInput.value = state.settings.proteinGoal;
    persist();
    updateProteinHint();
    updateCalorieTarget();
    toast('Peso atualizado. Proteína: ' + state.settings.proteinGoal + ' g/dia.');
    // Sem re-render: substituir o formulário aqui tiraria o foco do próximo campo
    // e fecharia o teclado virtual no celular.
  });

  const unitSel = $('#cfg-unit');
  if (unitSel) unitSel.addEventListener('change', function () {
    state.settings.unit = unitSel.value === 'lb' ? 'lb' : 'kg';
    persist();
    renderAll();
    toast('Unidade alterada para ' + unit() + '.');
  });

  const protein = $('#cfg-protein');
  if (protein) protein.addEventListener('change', function () {
    const v = parseNum(protein.value);
    if (v == null) { protein.value = state.settings.proteinGoal; return; }
    state.settings.proteinGoal = clampInt(v, 40, 300, 120);
    protein.value = state.settings.proteinGoal;
    persist();
    updateProteinHint();
    toast('Meta de proteína: ' + state.settings.proteinGoal + ' g.');
  });

  const surplus = $('#cfg-surplus');
  if (surplus) surplus.addEventListener('change', function () {
    const v = parseNum(surplus.value);
    if (v == null) { surplus.value = state.settings.surplusKcal; return; }
    state.settings.surplusKcal = clampInt(v, 200, 300, 250);
    surplus.value = state.settings.surplusKcal;
    persist();
    updateCalorieTarget();
    toast('Superávit: +' + state.settings.surplusKcal + ' kcal.');
  });

  const activity = $('#cfg-activity');
  if (activity) activity.addEventListener('change', function () {
    state.settings.activityLevel = (activity.value === 'sedentary' || activity.value === 'moderate') ? activity.value : 'light';
    persist();
    updateCalorieTarget();
    toast('Nível de atividade atualizado.');
  });

  const exp = $('#cfg-export');
  if (exp) exp.addEventListener('click', exportData);
  const imp = $('#cfg-import');
  if (imp) imp.addEventListener('click', function () {
    const input = $('#import-file');
    if (input) { input.value = ''; input.click(); }
  });
  const restore = $('#cfg-restore');
  if (restore) restore.addEventListener('click', function () {
    confirmModal({
      title: 'Restaurar treinos padrão?',
      text: 'Os templates Push, Pull, Legs e Reforço voltam ao padrão. O histórico é mantido.',
      confirmLabel: 'Restaurar',
      onConfirm: function () {
        state.templates = defaultTemplates();
        persist();
        renderAll();
        toast('Treinos padrão restaurados.');
      }
    });
  });
  const reset = $('#cfg-reset');
  if (reset) reset.addEventListener('click', function () {
    confirmModal({
      title: 'Apagar todos os dados?',
      text: 'Todos os treinos, histórico e configurações serão apagados deste dispositivo. Não há como desfazer sem um backup.',
      confirmLabel: 'Apagar tudo',
      danger: true,
      onConfirm: function () {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        state = initialState();
        state.onboardingDone = true;
        ui.editor = null;
        clearRest();
        persist();
        setView('dashboard', { noScroll: true });
        toast('Todos os dados foram apagados.');
      }
    });
  });
  const install = $('#cfg-install');
  if (install) install.addEventListener('click', installApp);
}

function exportData() {
  const json = JSON.stringify(state, null, 2);
  const filename = 'treino-forca-backup-' + dateKey(new Date()) + '.json';

  if (isNative()) {
    const file = new File([json], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Backup Treino Força' }).then(function () {
        toast('Backup compartilhado.');
      }).catch(function (err) {
        if (!err || err.name !== 'AbortError') showExportModal(json);
      });
      return;
    }
    showExportModal(json);
    return;
  }

  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    toast('Backup exportado.');
  } catch (err) {
    showExportModal(json);
  }
}

function showExportModal(json) {
  openModal({
    title: 'Exportar dados',
    body: '<p class="small muted">Copie o JSON abaixo e guarde em um lugar seguro (e-mail, Drive, bloco de notas).</p>' +
      '<label class="field" style="margin-top:10px"><span class="label">Backup JSON</span>' +
      '<textarea id="export-json" readonly style="min-height:180px;font-size:12px">' + esc(json) + '</textarea></label>',
    actions: [
      {
        label: 'Copiar JSON',
        kind: 'btn-primary',
        onClick: function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).then(function () { toast('JSON copiado.'); }).catch(function () {
              const ta = $('#export-json');
              if (ta) { ta.focus(); ta.select(); }
              toast('Selecione e copie manualmente.');
            });
          } else {
            const ta = $('#export-json');
            if (ta) { ta.focus(); ta.select(); }
            toast('Selecione e copie manualmente.');
          }
        }
      },
      { label: 'Fechar', kind: 'btn-ghost', onClick: closeModal }
    ]
  });
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    let data = null;
    try { data = JSON.parse(String(reader.result)); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.templates) || !Array.isArray(data.sessions)) {
      openModal({
        title: 'Arquivo inválido',
        body: '<p>Este arquivo não é um backup válido do Treino Força (faltam templates ou histórico).</p>',
        actions: [{ label: 'Fechar', kind: 'btn-ghost', onClick: closeModal }]
      });
      return;
    }
    confirmModal({
      title: 'Importar backup?',
      text: data.sessions.length + ' treinos e ' + data.templates.length + ' templates serão restaurados. Os dados atuais serão substituídos.',
      confirmLabel: 'Importar',
      onConfirm: function () { applyImport(data); }
    });
  };
  reader.readAsText(file);
}

function applyImport(data) {
  const base = initialState();
  const merged = Object.assign({}, base, data);
  merged.settings = Object.assign({}, base.settings, data.settings || {});
  merged.templates = data.templates.map(normalizeTemplate);
  merged.sessions = sortSessionsByRecency((data.sessions || []).map(normalizeSession).filter(Boolean));
  merged.active = null;
  merged.onboardingDone = data.onboardingDone !== false;
  state = merged;
  ui.editor = null;
  persist();
  renderAll();
  setView('dashboard', { noScroll: true });
  toast('Backup importado com sucesso.');
}

function installApp() {
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    prompt.prompt();
    prompt.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') toast('App instalado.');
      updateInstallUI();
    }).catch(function () { updateInstallUI(); });
    return;
  }
  if (isStandalone() || isNative()) {
    toast('Você já está usando o app instalado.');
    return;
  }
  openModal({
    title: 'Instalar app',
    body: '<p><strong>Android (Chrome):</strong> menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.</p>' +
      '<p><strong>iPhone (Safari):</strong> botão Compartilhar → “Adicionar à Tela de Início”.</p>' +
      '<p>Depois do primeiro carregamento, o app abre e funciona sem internet.</p>',
    actions: [{ label: 'Entendi', kind: 'btn-primary', onClick: closeModal }]
  });
}

function updateInstallUI() {
  const top = $('#btn-install-top');
  if (top) top.hidden = !deferredPrompt;
  const cfg = $('#cfg-install');
  if (cfg) {
    const installed = isStandalone() || isNative();
    cfg.textContent = installed ? 'Instalado' : 'Instalar';
    cfg.disabled = installed;
  }
}

/* =========================================================================
   ONBOARDING (4 telas na primeira abertura)
   ========================================================================= */
function showOnboarding() {
  const el = $('#onboarding');
  if (!el) return;
  ui.obIndex = 0;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  renderOnboarding();
}

function renderOnboarding() {
  const el = $('#onboarding');
  if (!el) return;
  const slide = ONBOARDING[ui.obIndex];
  const last = ui.obIndex === ONBOARDING.length - 1;
  el.innerHTML =
    '<div class="ob-top"><button type="button" class="link-btn" id="ob-skip">Pular</button></div>' +
    '<div class="ob-body">' +
      '<div class="ob-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
          '<path d="M6.5 6.5v11M3.5 9v5M17.5 6.5v11M20.5 9v5M6.5 12h11"/></svg>' +
      '</div>' +
      '<div class="ob-kicker">' + esc(slide.kicker) + '</div>' +
      '<h2 class="ob-title">' + esc(slide.title) + '</h2>' +
      '<p class="ob-text">' + esc(slide.text) + '</p>' +
      '<div class="ob-example">' + slide.example + '</div>' +
      '<div><button type="button" class="link-btn" id="ob-gloss">Ver no glossário</button></div>' +
    '</div>' +
    '<div class="ob-foot">' +
      '<div class="ob-dots">' + ONBOARDING.map(function (_, i) {
        return '<span class="ob-dot ' + (i === ui.obIndex ? 'is-active' : '') + '"></span>';
      }).join('') + '</div>' +
      '<div class="ob-nav">' +
        '<button type="button" class="btn btn-ghost" id="ob-prev"' + (ui.obIndex === 0 ? ' disabled' : '') + '>Voltar</button>' +
        '<button type="button" class="btn btn-primary" id="ob-next">' + (last ? 'Começar' : 'Próximo') + '</button>' +
      '</div>' +
    '</div>';

  $('#ob-skip').addEventListener('click', finishOnboarding);
  $('#ob-next').addEventListener('click', function () {
    if (last) finishOnboarding();
    else { ui.obIndex++; renderOnboarding(); }
  });
  $('#ob-prev').addEventListener('click', function () {
    if (ui.obIndex > 0) { ui.obIndex--; renderOnboarding(); }
  });
  $('#ob-gloss').addEventListener('click', function () {
    const term = slide.gloss;
    finishOnboarding();
    ui.helpQuery = GLOSSARY.find(function (g) { return g.id === term; }).term.split(' ')[0];
    setView('ajuda');
  });
}

function finishOnboarding() {
  const el = $('#onboarding');
  if (el) el.hidden = true;
  document.body.style.overflow = '';
  state.onboardingDone = true;
  persist();
}

/* =========================================================================
   SERVICE WORKER E EVENTOS GLOBAIS
   ========================================================================= */
function registerServiceWorker() {
  if (isNative()) {
    // No APK os assets já são locais; evita cache antigo entre atualizações.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (r) { r.unregister().catch(function () {}); });
      }).catch(function () {});
    }
    return;
  }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('Service worker não registrado:', err);
      });
    });
  }
}

function bindGlobal() {
  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.dataset.nav === ui.view && ui.view === 'treino' && state.active) {
        renderCurrent();
      }
      setView(tab.dataset.nav);
    });
  });

  const installTop = $('#btn-install-top');
  if (installTop) installTop.addEventListener('click', installApp);

  const importInput = $('#import-file');
  if (importInput) {
    importInput.addEventListener('change', function () {
      handleImportFile(importInput.files && importInput.files[0]);
      importInput.value = '';
    });
  }

  // Toasts/tooltips de glossário em qualquer tela.
  document.addEventListener('click', function (e) {
    const term = e.target.closest('[data-term]');
    if (term) {
      e.preventDefault();
      showGlossary(term.dataset.term);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalOpen) closeModal();
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallUI();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    updateInstallUI();
    toast('App instalado. Já pode usar offline.');
  });

  window.addEventListener('online', updateTopbar);
  window.addEventListener('offline', updateTopbar);

  // O teclado virtual redimensiona a janela no Android/iOS. Re-renderizar a tela
  // aqui destrói o input em foco e fecha o teclado; só redesenhamos os gráficos.
  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (modalOpen) return;
      redrawCharts();
    }, 180);
  });
}

function init() {
  state = loadState();
  bindGlobal();
  bindTimer();
  ui.view = 'dashboard';
  try {
    const tab = new URLSearchParams(location.search).get('tab');
    if (['dashboard', 'treino', 'historico', 'progresso', 'ajuda', 'config'].indexOf(tab) !== -1) {
      ui.view = tab === 'config' ? 'config' : tab === 'ajuda' ? 'ajuda' : tab === 'progresso' ? 'progresso' : tab === 'historico' ? 'historico' : tab === 'treino' ? 'treino' : 'dashboard';
    }
  } catch (e) {}
  setView(ui.view, { noScroll: true });
  updateInstallUI();
  updateTimerUI();
  if (!state.onboardingDone) showOnboarding();
  registerServiceWorker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Exposicao para testes de unidade (so quando nao ha DOM/navegador).
// Permite injetar o estado e chamar as funcoes puras de logica de treino.
if (typeof globalThis !== 'undefined' && globalThis.__NODE_TEST__) {
  globalThis.__treinoForcaTest = {
    get state() { return state },
    set state(s) { state = s },
    initialState,
    clampInt,
    esc,
    roundHalf,
    incrementFor,
    dateKey,
    parseDateKey,
    nextLoadAdvice,
    deloadAlerts,
    prMap,
  };
}
