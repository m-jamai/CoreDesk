import type {
  Board, BoardCard, BoardLink, Course, FileEntry, Learner, MapEdge, MapNode,
  Note, Project, Section, Share, Task, TeachingSession, Workspace,
} from '../types';
import { WORKSPACE_VERSION } from '../config/app';
import { daysFromNow as d } from '../lib/format';

/* =====================================================================
 * Mock workspace. Realistic, small and internally consistent:
 * shares, map nodes and learners reference real ids below.
 * ===================================================================== */

const projects: Project[] = [
  {
    id: 'p_atelier', name: 'Atelier Noma — Rebrand', status: 'active', tone: 'amber',
    description: 'Identity refresh for a ceramics studio in Nantes: wordmark, packaging system, and a small e-shop.',
    tags: ['branding', 'client'], createdAt: d(-48), updatedAt: d(-0.1),
  },
  {
    id: 'p_firmware', name: 'Field Recorder Firmware 3.2', status: 'active', tone: 'teal',
    description: 'Low-latency monitoring, new file naming scheme and battery telemetry for the FR-2 handheld recorder.',
    tags: ['engineering', 'embedded'], createdAt: d(-90), updatedAt: d(-0.6),
  },
  {
    id: 'p_thesis', name: 'Thesis — Urban Heat Islands', status: 'planning', tone: 'violet',
    description: 'Master thesis on surface temperature and tree canopy in mid-sized French cities, 2015–2025.',
    tags: ['research', 'writing'], createdAt: d(-120), updatedAt: d(-2),
  },
  {
    id: 'p_studio', name: 'Studio Move — Rue Kervégan', status: 'paused', tone: 'blue',
    description: 'Moving the studio to a shared workshop: lease, equipment inventory and network setup.',
    tags: ['operations'], createdAt: d(-30), updatedAt: d(-9),
  },
];

const sections: Section[] = [
  // Atelier
  { id: 's_brief', projectId: 'p_atelier', title: 'Client brief', favorite: true, tags: ['brief'], updatedAt: d(-3),
    content: 'Noma sells hand-thrown stoneware to restaurants and individuals. The current logo reads as a craft-fair stall. Goal: a calm, confident identity that works on kiln stamps, tissue paper and a 32px favicon.\n\nDecision makers: Inès (founder), Tomás (operations).' },
  { id: 's_principles', projectId: 'p_atelier', title: 'Design principles', favorite: false, tags: ['direction'], updatedAt: d(-2),
    content: '1. Made by hand, not handmade-looking.\n2. One mark, many surfaces — must survive being stamped into clay.\n3. Warm neutral palette; glaze colours do the talking.' },
  { id: 's_deliverables', projectId: 'p_atelier', title: 'Deliverables & schedule', favorite: true, tags: ['planning'], updatedAt: d(-1),
    content: 'Wordmark + monogram — week 3\nPackaging system (box, sleeve, tissue, sticker) — week 5\nE-shop templates — week 7\nBrand guidelines PDF — week 8' },
  { id: 's_budget', projectId: 'p_atelier', title: 'Budget notes', favorite: false, tags: ['finance'], updatedAt: d(-6),
    content: 'Fixed fee for identity. Packaging printing quoted separately by Imprimerie Lemoine (2 quotes pending).' },
  // Firmware
  { id: 's_scope', projectId: 'p_firmware', title: 'Release scope', favorite: true, tags: ['release'], updatedAt: d(-1),
    content: 'In: direct monitoring path < 2 ms, ISO-8601 file names, battery telemetry over USB.\nOut: Bluetooth remote (moved to 3.3).' },
  { id: 's_arch', projectId: 'p_firmware', title: 'Audio path architecture', favorite: false, tags: ['architecture', 'dsp'], updatedAt: d(-4),
    content: 'ADC → DMA ring buffer (64 samples) → limiter → headphone DAC. Recording tap after the limiter, pre-gain metering. Monitoring bypasses the file encoder entirely.' },
  { id: 's_testing', projectId: 'p_firmware', title: 'Test plan', favorite: false, tags: ['qa'], updatedAt: d(-2),
    content: 'Loopback latency with scope at 44.1/48/96 kHz.\nFile name collisions across midnight.\n8h battery soak with telemetry logging.' },
  // Thesis
  { id: 's_question', projectId: 'p_thesis', title: 'Research question', favorite: true, tags: ['framing'], updatedAt: d(-5),
    content: 'To what extent did canopy cover changes between 2015 and 2025 explain variation in summer land surface temperature across six mid-sized French cities?' },
  { id: 's_method', projectId: 'p_thesis', title: 'Methodology', favorite: false, tags: ['methods'], updatedAt: d(-8),
    content: 'Landsat 8/9 LST, July–August composites. Canopy from municipal open data where available, otherwise NDVI threshold. Mixed-effects model with city as random effect.' },
  { id: 's_outline', projectId: 'p_thesis', title: 'Chapter outline', favorite: false, tags: ['writing'], updatedAt: d(-3),
    content: '1. Introduction\n2. Literature review\n3. Data & study area\n4. Methods\n5. Results\n6. Discussion & limits\n7. Conclusion' },
  // Studio
  { id: 's_lease', projectId: 'p_studio', title: 'Lease checklist', favorite: false, tags: ['admin'], updatedAt: d(-10),
    content: 'Insurance certificate, inventory of fixtures, deposit transfer, keys for 3 people.' },
];

const files: FileEntry[] = [
  // Atelier
  { id: 'f_a_brand', projectId: 'p_atelier', parentId: null, kind: 'folder', name: 'Brand', updatedAt: d(-2) },
  { id: 'f_a_pack', projectId: 'p_atelier', parentId: null, kind: 'folder', name: 'Packaging', updatedAt: d(-1) },
  { id: 'f_a_client', projectId: 'p_atelier', parentId: null, kind: 'folder', name: 'Client', updatedAt: d(-12) },
  { id: 'f_a_mark', projectId: 'p_atelier', parentId: 'f_a_brand', kind: 'document', name: 'wordmark-explorations-v4.fig', size: 18_400_000, updatedAt: d(-2) },
  { id: 'f_a_mono', projectId: 'p_atelier', parentId: 'f_a_brand', kind: 'document', name: 'monogram-stamp-test.pdf', size: 2_300_000, updatedAt: d(-3) },
  { id: 'f_a_palette', projectId: 'p_atelier', parentId: 'f_a_brand', kind: 'document', name: 'palette-glazes.ase', size: 14_000, updatedAt: d(-5) },
  { id: 'f_a_dieline', projectId: 'p_atelier', parentId: 'f_a_pack', kind: 'document', name: 'mug-box-dieline.ai', size: 5_600_000, updatedAt: d(-1) },
  { id: 'f_a_quote', projectId: 'p_atelier', parentId: 'f_a_client', kind: 'document', name: 'quote-imprimerie-lemoine.pdf', size: 210_000, updatedAt: d(-12) },
  { id: 'f_a_moodboard', projectId: 'p_atelier', parentId: null, kind: 'document', name: 'moodboard-kiln-visit.jpg', size: 4_100_000, updatedAt: d(-20) },
  // Firmware
  { id: 'f_f_specs', projectId: 'p_firmware', parentId: null, kind: 'folder', name: 'Specs', updatedAt: d(-4) },
  { id: 'f_f_logs', projectId: 'p_firmware', parentId: null, kind: 'folder', name: 'Test logs', updatedAt: d(-1) },
  { id: 'f_f_path', projectId: 'p_firmware', parentId: 'f_f_specs', kind: 'document', name: 'audio-path-3.2.md', size: 9_800, updatedAt: d(-4) },
  { id: 'f_f_naming', projectId: 'p_firmware', parentId: 'f_f_specs', kind: 'document', name: 'file-naming-rfc.md', size: 5_200, updatedAt: d(-6) },
  { id: 'f_f_latency', projectId: 'p_firmware', parentId: 'f_f_logs', kind: 'document', name: 'latency-48k-2026-10-14.csv', size: 380_000, updatedAt: d(-1) },
  { id: 'f_f_changelog', projectId: 'p_firmware', parentId: null, kind: 'document', name: 'CHANGELOG.md', size: 3_100, updatedAt: d(-0.6) },
  // Thesis
  { id: 'f_t_data', projectId: 'p_thesis', parentId: null, kind: 'folder', name: 'Data', updatedAt: d(-8) },
  { id: 'f_t_drafts', projectId: 'p_thesis', parentId: null, kind: 'folder', name: 'Drafts', updatedAt: d(-3) },
  { id: 'f_t_lst', projectId: 'p_thesis', parentId: 'f_t_data', kind: 'document', name: 'lst-composites-2015-2025.tif', size: 96_000_000, updatedAt: d(-8) },
  { id: 'f_t_ch2', projectId: 'p_thesis', parentId: 'f_t_drafts', kind: 'document', name: 'ch2-literature-review.docx', size: 410_000, updatedAt: d(-3) },
  { id: 'f_t_refs', projectId: 'p_thesis', parentId: null, kind: 'document', name: 'references.bib', size: 64_000, updatedAt: d(-4) },
  // Studio
  { id: 'f_s_inv', projectId: 'p_studio', parentId: null, kind: 'document', name: 'equipment-inventory.xlsx', size: 48_000, updatedAt: d(-9) },
];

const tasks: Task[] = [
  // Atelier
  { id: 't_a1', projectId: 'p_atelier', title: 'Refine monogram for kiln stamp', description: 'Stroke must hold at 12 mm in clay. Test two weights.', status: 'doing', priority: 'high', due: d(2), order: 0, updatedAt: d(-0.2) },
  { id: 't_a2', projectId: 'p_atelier', title: 'Collect packaging quotes', description: 'Second quote from Cartonnage Ouest.', status: 'todo', priority: 'medium', due: d(5), order: 0, updatedAt: d(-1) },
  { id: 't_a3', projectId: 'p_atelier', title: 'Typeface licence check', description: 'Desktop + web licence for the e-shop.', status: 'todo', priority: 'low', order: 1, updatedAt: d(-2) },
  { id: 't_a4', projectId: 'p_atelier', title: 'Present wordmark round 2', description: '', status: 'done', priority: 'high', order: 0, updatedAt: d(-4) },
  { id: 't_a5', projectId: 'p_atelier', title: 'Photograph glaze swatches', description: 'Daylight, grey card, 3 angles.', status: 'doing', priority: 'medium', due: d(1), order: 1, updatedAt: d(-0.5) },
  { id: 't_a6', projectId: 'p_atelier', title: 'Draft tissue paper pattern', description: '', status: 'todo', priority: 'medium', order: 2, updatedAt: d(-1) },
  // Firmware
  { id: 't_f1', projectId: 'p_firmware', title: 'Shrink DMA buffer to 64 samples', description: 'Verify no underruns at 96 kHz.', status: 'done', priority: 'high', order: 0, updatedAt: d(-3) },
  { id: 't_f2', projectId: 'p_firmware', title: 'Fix midnight filename collision', description: 'Files recorded across 00:00 get the previous date.', status: 'doing', priority: 'high', due: d(1), order: 0, updatedAt: d(-0.6) },
  { id: 't_f3', projectId: 'p_firmware', title: 'Battery telemetry USB descriptor', description: '', status: 'todo', priority: 'medium', due: d(6), order: 0, updatedAt: d(-2) },
  { id: 't_f4', projectId: 'p_firmware', title: '8h soak test', description: 'Log voltage every 30 s.', status: 'todo', priority: 'medium', order: 1, updatedAt: d(-2) },
  { id: 't_f5', projectId: 'p_firmware', title: 'Update CHANGELOG for 3.2-rc1', description: '', status: 'done', priority: 'low', order: 1, updatedAt: d(-0.6) },
  // Thesis
  { id: 't_t1', projectId: 'p_thesis', title: 'Finish literature review draft', description: 'Target 6,000 words.', status: 'doing', priority: 'high', due: d(9), order: 0, updatedAt: d(-3) },
  { id: 't_t2', projectId: 'p_thesis', title: 'Request canopy data from Angers', description: '', status: 'todo', priority: 'medium', order: 0, updatedAt: d(-5) },
  { id: 't_t3', projectId: 'p_thesis', title: 'Supervisor meeting notes', description: '', status: 'done', priority: 'low', order: 0, updatedAt: d(-7) },
  // Studio
  { id: 't_s1', projectId: 'p_studio', title: 'Sign insurance certificate', description: '', status: 'todo', priority: 'high', order: 0, updatedAt: d(-9) },
];

const notes: Note[] = [
  { id: 'n_a1', projectId: 'p_atelier', title: 'Kiln visit — observations', tags: ['research'], createdAt: d(-21), updatedAt: d(-20),
    body: 'Stamps are pressed by hand at leather-hard stage. Fine serifs fill with slip. Inès stamps ~200 pieces a week — mark must be fast to align.' },
  { id: 'n_a2', projectId: 'p_atelier', title: 'Feedback on round 2', tags: ['client', 'feedback'], createdAt: d(-4), updatedAt: d(-4),
    body: 'Prefers option B (open counter "o"). Wants to see it on the tote bag. Tomás asked about cost of a second stamp size.' },
  { id: 'n_a3', projectId: 'p_atelier', title: 'Naming for collections', tags: ['ideas'], createdAt: d(-2), updatedAt: d(-1),
    body: 'Use Breton coastal places? Erquy, Piriac, Quiberon. Check trademark conflicts before proposing.' },
  { id: 'n_f1', projectId: 'p_firmware', title: 'Latency measurements', tags: ['qa', 'data'], createdAt: d(-1), updatedAt: d(-1),
    body: '48 kHz: 1.6 ms analogue-to-analogue. 96 kHz: 1.1 ms. 44.1 kHz: 1.8 ms. All under target.' },
  { id: 'n_f2', projectId: 'p_firmware', title: 'Open questions for hardware team', tags: ['questions'], createdAt: d(-5), updatedAt: d(-3),
    body: 'Does the fuel gauge IC expose cycle count? Can we read it without waking the codec?' },
  { id: 'n_t1', projectId: 'p_thesis', title: 'Reading — Oke 1982', tags: ['literature'], createdAt: d(-15), updatedAt: d(-15),
    body: 'Energetic basis of the UHI. Useful framing for chapter 2; dated on remote sensing.' },
  { id: 'n_t2', projectId: 'p_thesis', title: 'Supervisor meeting 3', tags: ['meeting'], createdAt: d(-7), updatedAt: d(-7),
    body: 'Narrow to six cities. Drop Brest (cloud cover). Consider sensitivity analysis on NDVI threshold.' },
];

const mapNodes: MapNode[] = [
  { id: 'm_a1', projectId: 'p_atelier', refType: 'section', refId: 's_brief', x: 60, y: 80 },
  { id: 'm_a2', projectId: 'p_atelier', refType: 'section', refId: 's_principles', x: 60, y: 240 },
  { id: 'm_a3', projectId: 'p_atelier', refType: 'note', refId: 'n_a1', x: 360, y: 40 },
  { id: 'm_a4', projectId: 'p_atelier', refType: 'task', refId: 't_a1', x: 380, y: 200 },
  { id: 'm_a5', projectId: 'p_atelier', refType: 'file', refId: 'f_a_mono', x: 680, y: 200 },
  { id: 'm_a6', projectId: 'p_atelier', refType: 'file', refId: 'f_a_pack', x: 380, y: 360 },
  { id: 'm_a7', projectId: 'p_atelier', refType: 'task', refId: 't_a2', x: 680, y: 360 },
  { id: 'm_a8', projectId: 'p_atelier', refType: 'note', refId: 'n_a2', x: 680, y: 40 },
  { id: 'm_f1', projectId: 'p_firmware', refType: 'section', refId: 's_scope', x: 60, y: 120 },
  { id: 'm_f2', projectId: 'p_firmware', refType: 'section', refId: 's_arch', x: 360, y: 60 },
  { id: 'm_f3', projectId: 'p_firmware', refType: 'task', refId: 't_f2', x: 360, y: 220 },
  { id: 'm_f4', projectId: 'p_firmware', refType: 'note', refId: 'n_f1', x: 660, y: 60 },
  { id: 'm_f5', projectId: 'p_firmware', refType: 'file', refId: 'f_f_naming', x: 660, y: 220 },
];

const mapEdges: MapEdge[] = [
  { id: 'e_a1', projectId: 'p_atelier', from: 'm_a1', to: 'm_a2' },
  { id: 'e_a2', projectId: 'p_atelier', from: 'm_a3', to: 'm_a4' },
  { id: 'e_a3', projectId: 'p_atelier', from: 'm_a2', to: 'm_a4' },
  { id: 'e_a4', projectId: 'p_atelier', from: 'm_a4', to: 'm_a5' },
  { id: 'e_a5', projectId: 'p_atelier', from: 'm_a6', to: 'm_a7' },
  { id: 'e_a6', projectId: 'p_atelier', from: 'm_a8', to: 'm_a5' },
  { id: 'e_f1', projectId: 'p_firmware', from: 'm_f1', to: 'm_f2' },
  { id: 'e_f2', projectId: 'p_firmware', from: 'm_f1', to: 'm_f3' },
  { id: 'e_f3', projectId: 'p_firmware', from: 'm_f2', to: 'm_f4' },
  { id: 'e_f4', projectId: 'p_firmware', from: 'm_f3', to: 'm_f5' },
];

/* ---------- Boards ---------- */

const boards: Board[] = [
  { id: 'b_themes', name: '2027 Product Themes', description: 'What CoreDesk-style tools should feel like next year.', updatedAt: d(-0.3) },
  { id: 'b_workshop', name: 'Workshop — Onboarding Friction', description: 'Sticky-note dump from the Tuesday workshop.', updatedAt: d(-3) },
  { id: 'b_podcast', name: 'Podcast S2 — Episode Ideas', description: 'Guests, formats and recurring segments.', updatedAt: d(-11) },
];

const cards: BoardCard[] = [
  { id: 'c_1', boardId: 'b_themes', title: 'Calm by default', body: 'Fewer notifications, more intentional review moments.', tone: 'amber', x: 80, y: 80 },
  { id: 'c_2', boardId: 'b_themes', title: 'Spatial thinking', body: 'Canvases as a first-class view of structured data, not a separate toy.', tone: 'teal', x: 400, y: 60 },
  { id: 'c_3', boardId: 'b_themes', title: 'Local-first', body: 'Work offline; sync is an implementation detail.', tone: 'blue', x: 400, y: 260 },
  { id: 'c_4', boardId: 'b_themes', title: 'Teaching as sharing', body: 'Turn a finished project into a course outline in one step?', tone: 'violet', x: 720, y: 160 },
  { id: 'c_5', boardId: 'b_themes', title: 'Keyboard everything', body: 'Every action reachable without the mouse.', tone: 'neutral', x: 80, y: 300 },
  { id: 'c_6', boardId: 'b_themes', title: 'Private by design', body: 'Vault never leaks into shared surfaces or search results.', tone: 'rose', x: 720, y: 380 },
  { id: 'c_w1', boardId: 'b_workshop', title: 'Too many choices on day one', body: 'Users saw 9 templates before writing anything.', tone: 'rose', x: 80, y: 100 },
  { id: 'c_w2', boardId: 'b_workshop', title: 'Start from an example', body: 'Prefill one realistic project instead of empty states.', tone: 'teal', x: 400, y: 80 },
  { id: 'c_w3', boardId: 'b_workshop', title: 'Import is hidden', body: 'Nobody found import from folders.', tone: 'amber', x: 80, y: 300 },
  { id: 'c_w4', boardId: 'b_workshop', title: 'Inline hints, not tours', body: 'Contextual one-liners near the empty area.', tone: 'teal', x: 400, y: 280 },
  { id: 'c_p1', boardId: 'b_podcast', title: 'Tools of the trade', body: 'Recurring 5-min segment: guest shows their desk.', tone: 'amber', x: 100, y: 120 },
  { id: 'c_p2', boardId: 'b_podcast', title: 'Guest: luthier', body: 'Ask about jigs and templates as "software".', tone: 'violet', x: 420, y: 120 },
];

const links: BoardLink[] = [
  { id: 'l_1', boardId: 'b_themes', from: 'c_1', to: 'c_5' },
  { id: 'l_2', boardId: 'b_themes', from: 'c_2', to: 'c_4' },
  { id: 'l_3', boardId: 'b_themes', from: 'c_3', to: 'c_6' },
  { id: 'l_4', boardId: 'b_themes', from: 'c_2', to: 'c_3' },
  { id: 'l_w1', boardId: 'b_workshop', from: 'c_w1', to: 'c_w2' },
  { id: 'l_w2', boardId: 'b_workshop', from: 'c_w3', to: 'c_w4' },
  { id: 'l_p1', boardId: 'b_podcast', from: 'c_p1', to: 'c_p2' },
];

/* ---------- Sharing ---------- */

const shares: Share[] = [
  {
    id: 'sh_1', itemType: 'project', itemId: 'p_atelier', status: 'active', linkAccess: 'restricted', linkRole: 'viewer',
    collaborators: [
      { id: 'u_ines', name: 'Inès Moreau', email: 'ines@atelier-noma.example', role: 'viewer' },
      { id: 'u_tomas', name: 'Tomás Ribeiro', email: 'tomas@atelier-noma.example', role: 'viewer' },
    ],
    createdAt: d(-14), updatedAt: d(-2),
  },
  {
    id: 'sh_2', itemType: 'board', itemId: 'b_workshop', status: 'active', linkAccess: 'link', linkRole: 'viewer',
    collaborators: [{ id: 'u_hana', name: 'Hana Sato', email: 'hana.sato@example.com', role: 'viewer' }],
    createdAt: d(-3), updatedAt: d(-3),
  },
  {
    id: 'sh_3', itemType: 'project', itemId: 'p_thesis', status: 'revoked', linkAccess: 'restricted', linkRole: 'viewer',
    collaborators: [{ id: 'u_daniel', name: 'Dr. Daniel Okafor', email: 'd.okafor@univ.example', role: 'viewer' }],
    createdAt: d(-40), updatedAt: d(-12),
  },
];

/* ---------- Teacher ---------- */

const courses: Course[] = [
  {
    id: 'co_embedded', title: 'Embedded C for Audio Devices', level: 'intermediate', visibility: 'published', enrollment: 'invite',
    audience: 'Firmware engineers moving into real-time audio',
    summary: 'Build a low-latency audio path on a microcontroller: buffers, DMA, interrupts and measuring what you built.',
    createdAt: d(-60), updatedAt: d(-2),
    modules: [
      { id: 'mo_e1', title: 'Foundations', lessons: [
        { id: 'le_e1', title: 'Sample rates, bit depth and latency budgets', kind: 'reading', minutes: 15, summary: 'Where latency comes from and how to budget it per stage.' },
        { id: 'le_e2', title: 'Ring buffers without locks', kind: 'video', minutes: 22, summary: 'Single-producer single-consumer buffers on Cortex-M.' },
      ]},
      { id: 'mo_e2', title: 'The audio path', lessons: [
        { id: 'le_e3', title: 'DMA double-buffering', kind: 'video', minutes: 28, summary: 'Half-transfer and transfer-complete interrupts.' },
        { id: 'le_e4', title: 'Exercise: build a pass-through', kind: 'exercise', minutes: 45, summary: 'ADC → DAC with a 64-sample buffer. Measure it.' },
        { id: 'le_e5', title: 'Live Q&A — debugging underruns', kind: 'live', minutes: 60, summary: 'Bring your scope captures.' },
      ]},
      { id: 'mo_e3', title: 'Measuring', lessons: [
        { id: 'le_e6', title: 'Loopback latency with a scope', kind: 'reading', minutes: 12, summary: 'A repeatable bench method.' },
      ]},
    ],
    resources: [
      { id: 'r_e1', name: 'Starter project (STM32)', kind: 'code', detail: 'Git repository, MIT licence' },
      { id: 'r_e2', name: 'Latency budget worksheet', kind: 'pdf', detail: '2 pages' },
      { id: 'r_e3', name: 'Lecture slides — module 2', kind: 'slides', detail: '38 slides' },
    ],
  },
  {
    id: 'co_brand', title: 'Brand Systems for Small Studios', level: 'beginner', visibility: 'unlisted', enrollment: 'link',
    audience: 'Freelance designers and studio owners',
    summary: 'Design an identity that survives real production: stamps, print, packaging and the web — on a small budget.',
    createdAt: d(-25), updatedAt: d(-1),
    modules: [
      { id: 'mo_b1', title: 'Before the logo', lessons: [
        { id: 'le_b1', title: 'Writing a useful brief', kind: 'reading', minutes: 10, summary: 'Questions that prevent three rounds of revisions.' },
        { id: 'le_b2', title: 'Surfaces audit', kind: 'exercise', minutes: 30, summary: 'List every place the mark will appear.' },
      ]},
      { id: 'mo_b2', title: 'The system', lessons: [
        { id: 'le_b3', title: 'Marks that scale down', kind: 'video', minutes: 18, summary: 'From 12 mm stamps to 16 px favicons.' },
        { id: 'le_b4', title: 'Packaging on a budget', kind: 'video', minutes: 20, summary: 'Stock boxes, custom sleeves, one-colour print.' },
      ]},
    ],
    resources: [
      { id: 'r_b1', name: 'Brief template', kind: 'pdf', detail: '4 pages' },
      { id: 'r_b2', name: 'Case study — Atelier Noma', kind: 'link', detail: 'Read-only project preview' },
    ],
  },
  {
    id: 'co_data', title: 'Data Literacy for Year 11', level: 'beginner', visibility: 'draft', enrollment: 'invite',
    audience: 'Secondary school students (15–16)',
    summary: 'Read charts critically, collect a small dataset and present one honest finding.',
    createdAt: d(-6), updatedAt: d(-0.8),
    modules: [
      { id: 'mo_d1', title: 'Reading charts', lessons: [
        { id: 'le_d1', title: 'Axes that lie', kind: 'reading', minutes: 15, summary: 'Truncated axes and dual scales.' },
      ]},
    ],
    resources: [{ id: 'r_d1', name: 'Class dataset — commute times', kind: 'dataset', detail: 'CSV, 120 rows' }],
  },
];

const sessions: TeachingSession[] = [
  { id: 'se_1', courseId: 'co_embedded', title: 'Live Q&A — debugging underruns', date: d(3, 18), minutes: 60, mode: 'online', location: 'Video call (link sent to learners)', agenda: 'Review submitted scope captures, common DMA mistakes.' },
  { id: 'se_2', courseId: 'co_embedded', title: 'Office hours', date: d(10, 12), minutes: 45, mode: 'online', location: 'Video call', agenda: 'Open questions on module 3.' },
  { id: 'se_3', courseId: 'co_brand', title: 'Portfolio review', date: d(6, 14), minutes: 90, mode: 'in-person', location: 'Studio, Rue Kervégan, Nantes', agenda: 'Each participant presents their surfaces audit.' },
  { id: 'se_4', courseId: 'co_data', title: 'Lesson 1 — Axes that lie', date: d(4, 9), minutes: 55, mode: 'in-person', location: 'Room B12', agenda: 'Warm-up quiz, chart critique in pairs.' },
];

const L = (id: string, courseId: string, name: string, email: string, done: string[], active: number, enrolled: number): Learner => ({
  id, courseId, name, email, completedLessonIds: done, lastActive: d(-active), enrolledAt: d(-enrolled),
});

const learners: Learner[] = [
  L('ln_1', 'co_embedded', 'Marcus Lindqvist', 'marcus.l@example.com', ['le_e1', 'le_e2', 'le_e3', 'le_e4', 'le_e5'], 0.4, 40),
  L('ln_2', 'co_embedded', 'Priya Raman', 'priya.raman@example.com', ['le_e1', 'le_e2', 'le_e3'], 1, 38),
  L('ln_3', 'co_embedded', 'Jonas Weber', 'jonas.w@example.com', ['le_e1'], 9, 35),
  L('ln_4', 'co_embedded', 'Aiko Tanaka', 'aiko.t@example.com', ['le_e1', 'le_e2', 'le_e3', 'le_e4', 'le_e5', 'le_e6'], 2, 33),
  L('ln_5', 'co_embedded', 'Samuel Adeyemi', 'samuel.a@example.com', ['le_e1', 'le_e2'], 4, 20),
  L('ln_6', 'co_brand', 'Léa Garnier', 'lea.garnier@example.com', ['le_b1', 'le_b2', 'le_b3'], 0.5, 12),
  L('ln_7', 'co_brand', 'Hugo Martin', 'hugo.m@example.com', ['le_b1'], 3, 10),
  L('ln_8', 'co_brand', 'Chloé Bernard', 'chloe.b@example.com', [], 7, 6),
];

export function createSeedWorkspace(): Workspace {
  // structuredClone keeps the module-level constants pristine for "Reset demo data".
  return structuredClone({
    version: WORKSPACE_VERSION,
    projects, sections, files, tasks, notes, mapNodes, mapEdges,
    boards, cards, links, shares, courses, sessions, learners,
    settings: { plan: 'limited', displayName: 'Camille Laurent' },
  });
}
