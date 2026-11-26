import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral CSPRNG fallback for session signing if SESSION_SECRET is not set
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'studio-store.json');

interface ServerUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface ServerProjectMeta {
  id: string;
  userId: string;
  title: string;
  style: string;
  bpm: number;
  keyName: string;
  durationSec: number;
  vocalMode: 'original' | 'enhanced';
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

interface StudioStore {
  users: ServerUser[];
  projects: ServerProjectMeta[];
}

function ensureStore(): StudioStore {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StudioStore = { users: [], projects: [] };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StudioStore>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    };
  } catch {
    return { users: [], projects: [] };
  }
}

function saveStore(store: StudioStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

function signToken(payload: { userId: string; email: string; name: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): { userId: string; email: string; name: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as {
      userId: string;
      email: string;
      name: string;
      exp: number;
    };
    if (!decoded.userId || Date.now() > decoded.exp) return null;
    return { userId: decoded.userId, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  authUser?: { userId: string; email: string; name: string };
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  const token = header.slice(7).trim();
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expirée ou invalide.' });
    return;
  }
  req.authUser = user;
  next();
}

const VALID_STYLES = [
  'Afrobeats',
  'Afro Gospel',
  'Amapiano',
  'R&B',
  'Hip-hop',
  'Rap',
  'Dancehall',
  'Coupé-décalé',
  'Zouk',
  'Reggae',
  'Pop',
  'Drill',
  'Gospel',
  'Musiques africaines traditionnelles',
] as const;

function sanitizeStyle(input: unknown, fallbackIndex = 0): string {
  if (typeof input === 'string') {
    const found = VALID_STYLES.find((s) => s.toLowerCase() === input.trim().toLowerCase());
    if (found) return found;
  }
  return VALID_STYLES[fallbackIndex % VALID_STYLES.length];
}

function normalizeStepArray(arr: unknown, length = 16): number[] {
  const out = new Array<number>(length).fill(0);
  if (Array.isArray(arr)) {
    for (let i = 0; i < length; i++) {
      const v = Number(arr[i] ?? 0);
      out[i] = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
    }
  }
  return out;
}

function normalizeNullableNotes(arr: unknown, length = 16): (number | null)[] {
  const out = new Array<number | null>(length).fill(null);
  if (Array.isArray(arr)) {
    for (let i = 0; i < length; i++) {
      const val = arr[i];
      if (val === null || val === undefined || val === -1) {
        out[i] = null;
      } else {
        const n = Math.round(Number(val));
        out[i] = Number.isFinite(n) && n >= -24 && n <= 36 ? n : null;
      }
    }
  }
  return out;
}

function normalizeChords(arr: unknown, rootMidi: number): number[][] {
  const fallback = [
    [rootMidi, rootMidi + 3, rootMidi + 7, rootMidi + 10],
    [rootMidi - 2, rootMidi + 2, rootMidi + 5, rootMidi + 9],
    [rootMidi - 4, rootMidi, rootMidi + 3, rootMidi + 7],
    [rootMidi - 5, rootMidi - 1, rootMidi + 2, rootMidi + 5],
  ];
  if (!Array.isArray(arr) || arr.length === 0) return fallback;
  const result: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const chord = arr[i % arr.length];
    if (Array.isArray(chord) && chord.length >= 2) {
      const notes = chord
        .slice(0, 5)
        .map((n) => Math.round(Number(n)))
        .filter((n) => Number.isFinite(n) && n >= 36 && n <= 84);
      result.push(notes.length >= 2 ? notes : fallback[i]);
    } else {
      result.push(fallback[i]);
    }
  }
  return result;
}

const BEAT_PROPOSAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    title: { type: Type.STRING },
    style: { type: Type.STRING },
    bpm: { type: Type.NUMBER },
    keyName: { type: Type.STRING },
    rootMidi: { type: Type.INTEGER },
    mood: { type: Type.STRING },
    arrangementSummary: { type: Type.STRING },
    instrumentsIncluded: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    transitionsDescription: { type: Type.STRING },
    patterns: {
      type: Type.OBJECT,
      properties: {
        kick: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: '16-step velocity 0..1' },
        snare: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: '16-step velocity 0..1' },
        hihat: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: '16-step velocity 0..1' },
        percussion: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: '16-step velocity 0..1' },
        percussionType: { type: Type.STRING },
        bassSteps: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: '16-step semitone offsets relative to rootMidi-12, or -1 for rest',
        },
        chordProgression: {
          type: Type.ARRAY,
          items: { type: Type.ARRAY, items: { type: Type.INTEGER } },
          description: '4 chords of MIDI notes (48..76)',
        },
        guitarPattern: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: '16-step semitone offsets relative to rootMidi, or -1 for rest',
        },
        synthPattern: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: '16-step semitone offsets relative to rootMidi+12, or -1 for rest',
        },
        swing: { type: Type.NUMBER },
        bassTone: { type: Type.STRING },
        pianoTone: { type: Type.STRING },
        guitarTone: { type: Type.STRING },
        synthTone: { type: Type.STRING },
      },
      required: [
        'kick',
        'snare',
        'hihat',
        'percussion',
        'percussionType',
        'bassSteps',
        'chordProgression',
        'guitarPattern',
        'synthPattern',
        'swing',
        'bassTone',
        'pianoTone',
        'guitarTone',
        'synthTone',
      ],
    },
  },
  required: [
    'id',
    'title',
    'style',
    'bpm',
    'keyName',
    'rootMidi',
    'mood',
    'arrangementSummary',
    'instrumentsIncluded',
    'transitionsDescription',
    'patterns',
  ],
};

function sanitizeProposal(raw: any, index: number, fallbackBpm: number, fallbackKey: string, fallbackRootMidi: number) {
  const p = raw?.patterns ?? {};
  const rootMidi = Number.isFinite(Number(raw?.rootMidi))
    ? Math.max(45, Math.min(72, Math.round(Number(raw.rootMidi))))
    : fallbackRootMidi;
  const bpm = Number.isFinite(Number(raw?.bpm))
    ? Math.max(65, Math.min(165, Math.round(Number(raw.bpm))))
    : fallbackBpm;

  const percTypes = ['logdrum', 'conga', 'shaker_clave', 'djembe', 'woodblock'] as const;
  const bassTones = ['sub808', 'logdrum', 'plucked', 'reese'] as const;
  const pianoTones = ['rhodes', 'grand', 'organ', 'warm_pad'] as const;
  const guitarTones = ['afro_mute', 'nylon', 'reggae_skank', 'clean_arp'] as const;
  const synthTones = ['lush_pad', 'pluck_lead', 'brass_stab', 'bell_arp'] as const;

  const pickEnum = <T extends readonly string[]>(val: unknown, list: T, def: T[number]): T[number] =>
    typeof val === 'string' && list.includes(val) ? val : def;

  return {
    id: typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : `beat-${Date.now()}-${index + 1}`,
    title: typeof raw?.title === 'string' && raw.title.trim() ? raw.title.trim() : `Proposition ${index + 1}`,
    style: sanitizeStyle(raw?.style, index),
    bpm,
    keyName: typeof raw?.keyName === 'string' && raw.keyName.trim() ? raw.keyName.trim() : fallbackKey,
    rootMidi,
    mood: typeof raw?.mood === 'string' && raw.mood.trim() ? raw.mood.trim() : 'Groove organique & chaleureux',
    arrangementSummary:
      typeof raw?.arrangementSummary === 'string' && raw.arrangementSummary.trim()
        ? raw.arrangementSummary.trim()
        : 'Arrangement multi-pistes construit autour du phrasé vocal original.',
    instrumentsIncluded:
      Array.isArray(raw?.instrumentsIncluded) && raw.instrumentsIncluded.length > 0
        ? raw.instrumentsIncluded.slice(0, 8).map((s: unknown) => String(s))
        : ['Batterie', 'Percussions', 'Basse', 'Piano', 'Guitares', 'Synthétiseurs'],
    transitionsDescription:
      typeof raw?.transitionsDescription === 'string' && raw.transitionsDescription.trim()
        ? raw.transitionsDescription.trim()
        : 'Breaks rythmiques et montées douces avant chaque reprise vocale.',
    patterns: {
      kick: normalizeStepArray(p.kick),
      snare: normalizeStepArray(p.snare),
      hihat: normalizeStepArray(p.hihat),
      percussion: normalizeStepArray(p.percussion),
      percussionType: pickEnum(p.percussionType, percTypes, 'conga'),
      bassSteps: normalizeNullableNotes(p.bassSteps),
      chordProgression: normalizeChords(p.chordProgression, rootMidi),
      guitarPattern: normalizeNullableNotes(p.guitarPattern),
      synthPattern: normalizeNullableNotes(p.synthPattern),
      swing: Number.isFinite(Number(p.swing)) ? Math.max(0, Math.min(0.45, Number(p.swing))) : 0.08,
      bassTone: pickEnum(p.bassTone, bassTones, 'plucked'),
      pianoTone: pickEnum(p.pianoTone, pianoTones, 'rhodes'),
      guitarTone: pickEnum(p.guitarTone, guitarTones, 'afro_mute'),
      synthTone: pickEnum(p.synthTone, synthTones, 'lush_pad'),
    },
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurée sur le serveur.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '28mb' }));

  // Auth Endpoints
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (name.length < 2 || name.length > 60) {
        res.status(400).json({ error: 'Le nom doit contenir entre 2 et 60 caractères.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
        res.status(400).json({ error: 'Adresse e-mail invalide.' });
        return;
      }
      if (password.length < 6 || password.length > 128) {
        res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        return;
      }

      const store = ensureStore();
      if (store.users.some((u) => u.email === email)) {
        res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = await hashPassword(password, salt);
      const user: ServerUser = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
      saveStore(store);

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Erreur serveur lors de la création du compte.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      const store = ensureStore();
      const user = store.users.find((u) => u.email === email);
      if (!user) {
        res.status(401).json({ error: 'Identifiants incorrects.' });
        return;
      }

      const computedHash = await hashPassword(password, user.salt);
      const a = Buffer.from(computedHash, 'hex');
      const b = Buffer.from(user.passwordHash, 'hex');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Identifiants incorrects.' });
        return;
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Erreur serveur lors de la connexion.' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
    const store = ensureStore();
    const user = store.users.find((u) => u.id === req.authUser?.userId);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
  });

  // Protected User Library Metadata Sync
  app.get('/api/projects', requireAuth, (req: AuthedRequest, res: Response) => {
    const store = ensureStore();
    const list = store.projects
      .filter((p) => p.userId === req.authUser?.userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ projects: list });
  });

  app.post('/api/projects', requireAuth, (req: AuthedRequest, res: Response) => {
    const body = req.body;
    const id = typeof body?.id === 'string' && body.id.trim() ? body.id.trim().slice(0, 80) : crypto.randomUUID();
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : 'Ma chanson';
    const style = sanitizeStyle(body?.style, 0);
    const bpm = Number.isFinite(Number(body?.bpm)) ? Math.max(50, Math.min(200, Math.round(Number(body.bpm)))) : 100;
    const keyName = typeof body?.keyName === 'string' ? body.keyName.trim().slice(0, 40) : 'La mineur';
    const durationSec = Number.isFinite(Number(body?.durationSec)) ? Math.max(1, Number(body.durationSec)) : 15;
    const vocalMode = body?.vocalMode === 'enhanced' ? 'enhanced' : 'original';
    const coverImage = typeof body?.coverImage === 'string' ? body.coverImage.slice(0, 200) : '';

    const store = ensureStore();
    const now = new Date().toISOString();
    const existingIdx = store.projects.findIndex((p) => p.id === id);

    if (existingIdx >= 0) {
      if (store.projects[existingIdx].userId !== req.authUser?.userId) {
        res.status(403).json({ error: 'Accès refusé à ce projet.' });
        return;
      }
      store.projects[existingIdx] = {
        ...store.projects[existingIdx],
        title,
        style,
        bpm,
        keyName,
        durationSec,
        vocalMode,
        coverImage,
        updatedAt: now,
      };
      saveStore(store);
      res.json({ project: store.projects[existingIdx] });
      return;
    }

    const project: ServerProjectMeta = {
      id,
      userId: req.authUser!.userId,
      title,
      style,
      bpm,
      keyName,
      durationSec,
      vocalMode,
      coverImage,
      createdAt: now,
      updatedAt: now,
    };
    store.projects.push(project);
    saveStore(store);
    res.status(201).json({ project });
  });

  app.delete('/api/projects/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const id = req.params.id;
    const store = ensureStore();
    const idx = store.projects.findIndex((p) => p.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Projet introuvable.' });
      return;
    }
    if (store.projects[idx].userId !== req.authUser?.userId) {
      res.status(403).json({ error: 'Accès refusé.' });
      return;
    }
    store.projects.splice(idx, 1);
    saveStore(store);
    res.json({ deleted: true });
  });

  // Gemini AI Vocal Analysis + 3 Tailored Beat Proposals
  app.post('/api/analyze-vocal', async (req: Request, res: Response) => {
    try {
      const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/wav';
      const durationSec = Number.isFinite(Number(req.body?.durationSec)) ? Number(req.body.durationSec) : 15;
      const acousticHints = req.body?.acousticHints ?? {};
      const preferredStyle = typeof req.body?.preferredStyle === 'string' ? req.body.preferredStyle : '';
      const emotionalTags: string[] = Array.isArray(req.body?.emotionalTags)
        ? req.body.emotionalTags.map((t: unknown) => String(t)).slice(0, 5)
        : [];

      if (!audioBase64 || audioBase64.length < 100) {
        res.status(400).json({ error: 'Audio vocal manquant ou invalide.' });
        return;
      }

      const ai = getGeminiClient();

      const systemInstruction = `Tu es un producteur musical d'élite et ingénieur du son expert en musiques africaines (Afrobeats, Afro Gospel, Amapiano, Coupé-décalé, Zouk, Musiques africaines traditionnelles) et urbaines/pop (R&B, Hip-hop, Rap, Dancehall, Reggae, Pop, Drill, Gospel).

RÈGLE ABSOLUE : La voix originale de l'utilisateur ne doit JAMAIS être modifiée ni remplacée. Tu écoutes attentivement sa performance vocale brute pour comprendre son tempo naturel, sa tonalité exacte (note fondamentale MIDI et gamme), sa mélodie chantée, ses variations mélodiques, sa structure, ses silences et ses émotions, puis tu composes 3 propositions d'accompagnements instrumentaux complets (batterie, percussions, basse, piano, guitares, synthétiseurs, harmonies, transitions) qui s'adaptent parfaitement à sa voix.

Contraintes techniques pour les motifs (patterns) sur 16 pas (1 mesure en doubles croches, 4/4) :
- kick, snare, hihat, percussion : tableaux de 16 nombres entre 0 et 1 (0 = silence, 0.3..1.0 = vélocité).
- bassSteps : 16 entiers (décalage en demi-tons par rapport à rootMidi-12, ex: 0, 3, 5, 7, 10, ou -1 pour silence).
- chordProgression : 4 accords, chacun contenant 3 ou 4 numéros de notes MIDI (entre 48 et 76) cohérents avec la tonalité détectée.
- guitarPattern : 16 entiers (décalage en demi-tons par rapport à rootMidi, ex: 0, 4, 7, 12, ou -1 pour silence).
- synthPattern : 16 entiers (décalage en demi-tons par rapport à rootMidi+12, ou -1 pour silence).
- percussionType : 'logdrum' | 'conga' | 'shaker_clave' | 'djembe' | 'woodblock'
- bassTone : 'sub808' | 'logdrum' | 'plucked' | 'reese'
- pianoTone : 'rhodes' | 'grand' | 'organ' | 'warm_pad'
- guitarTone : 'afro_mute' | 'nylon' | 'reggae_skank' | 'clean_arp'
- synthTone : 'lush_pad' | 'pluck_lead' | 'brass_stab' | 'bell_arp'
- Styles autorisés UNIQUEMENT : ${VALID_STYLES.join(', ')}.
- Réponds entièrement en français pour tous les textes descriptifs.`;

      const promptText = `Analyse cet enregistrement vocal a cappella (durée : ${durationSec.toFixed(1)} secondes).
Indices acoustiques mesurés localement : ${JSON.stringify(acousticHints)}.
${preferredStyle ? `L'artiste a exprimé une affinité pour le style : ${preferredStyle} (propose-le dans l'une des 3 propositions et varie les deux autres avec des styles complémentaires).` : 'Choisis les 3 styles les plus adaptés à son phrasé, sa mélodie et son émotion parmi la liste autorisée.'}
${emotionalTags.length > 0 ? `Contexte émotionnel souhaité par l'artiste : ${emotionalTags.join(', ')}. Adapte les harmonies, le timbre des instruments et l'énergie rythmique en conséquence.` : ''}

Extrais avec précision :
1. Le tempo naturel (BPM entre 68 et 155), la tonalité (ex: "La mineur", "Do majeur", "Ré mineur", "Fa# mineur") et la note fondamentale MIDI (rootMidi entre 48 et 71).
2. L'analyse de la mélodie chantée, du rythme, des variations mélodiques, des émotions, des silences/respirations et des segments de structure entre 0 et ${durationSec.toFixed(1)} s.
3. Trois propositions d'accompagnements instrumentaux très musicales, riches et distinctes qui subliment cette voix sans jamais la couvrir.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: {
                type: Type.OBJECT,
                properties: {
                  bpm: { type: Type.NUMBER },
                  keyName: { type: Type.STRING },
                  rootMidi: { type: Type.INTEGER },
                  scaleType: { type: Type.STRING },
                  melodySummary: { type: Type.STRING },
                  rhythmFeel: { type: Type.STRING },
                  melodicVariations: { type: Type.STRING },
                  emotion: { type: Type.STRING },
                  energyScore: { type: Type.NUMBER },
                  vocalRange: { type: Type.STRING },
                  silencesCount: { type: Type.INTEGER },
                  silences: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        startSec: { type: Type.NUMBER },
                        endSec: { type: Type.NUMBER },
                        purpose: { type: Type.STRING },
                      },
                      required: ['startSec', 'endSec', 'purpose'],
                    },
                  },
                  structure: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        startSec: { type: Type.NUMBER },
                        endSec: { type: Type.NUMBER },
                        energy: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                      },
                      required: ['label', 'startSec', 'endSec', 'energy', 'description'],
                    },
                  },
                  recommendedStyles: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  musicalNotes: { type: Type.STRING },
                },
                required: [
                  'bpm',
                  'keyName',
                  'rootMidi',
                  'scaleType',
                  'melodySummary',
                  'rhythmFeel',
                  'melodicVariations',
                  'emotion',
                  'energyScore',
                  'vocalRange',
                  'silencesCount',
                  'silences',
                  'structure',
                  'recommendedStyles',
                  'musicalNotes',
                ],
              },
              proposals: {
                type: Type.ARRAY,
                items: BEAT_PROPOSAL_SCHEMA,
              },
            },
            required: ['analysis', 'proposals'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      const rawAnalysis = parsed.analysis ?? {};
      const bpm = Number.isFinite(Number(rawAnalysis.bpm))
        ? Math.max(68, Math.min(160, Math.round(Number(rawAnalysis.bpm))))
        : 102;
      const rootMidi = Number.isFinite(Number(rawAnalysis.rootMidi))
        ? Math.max(45, Math.min(71, Math.round(Number(rawAnalysis.rootMidi))))
        : 57;
      const keyName =
        typeof rawAnalysis.keyName === 'string' && rawAnalysis.keyName.trim()
          ? rawAnalysis.keyName.trim()
          : 'La mineur';

      const scaleTypes = ['major', 'minor', 'pentatonic_minor', 'pentatonic_major', 'dorian'] as const;
      const scaleType = scaleTypes.includes(rawAnalysis.scaleType) ? rawAnalysis.scaleType : 'minor';

      const analysis = {
        bpm,
        keyName,
        rootMidi,
        scaleType,
        melodySummary: String(rawAnalysis.melodySummary || 'Ligne mélodique expressive avec phrasé fluide.'),
        rhythmFeel: String(rawAnalysis.rhythmFeel || 'Groove organique en 4/4 avec syncopes naturelles.'),
        melodicVariations: String(rawAnalysis.melodicVariations || 'Inflexions vocales nuancées sur les fins de phrases.'),
        emotion: String(rawAnalysis.emotion || 'Chaleureux et expressif'),
        energyScore: Number.isFinite(Number(rawAnalysis.energyScore))
          ? Math.max(10, Math.min(100, Math.round(Number(rawAnalysis.energyScore))))
          : 72,
        vocalRange: String(rawAnalysis.vocalRange || 'Tessiture médium naturelle'),
        silencesCount: Number.isFinite(Number(rawAnalysis.silencesCount)) ? Number(rawAnalysis.silencesCount) : 2,
        silences: Array.isArray(rawAnalysis.silences) ? rawAnalysis.silences.slice(0, 8) : [],
        structure:
          Array.isArray(rawAnalysis.structure) && rawAnalysis.structure.length > 0
            ? rawAnalysis.structure.slice(0, 8)
            : [
                {
                  label: 'Introduction vocale',
                  startSec: 0,
                  endSec: Math.max(1, Number((durationSec * 0.35).toFixed(1))),
                  energy: 0.55,
                  description: 'Entrée intimiste posant la tonalité.',
                },
                {
                  label: 'Cœur mélodique',
                  startSec: Number((durationSec * 0.35).toFixed(1)),
                  endSec: Number(durationSec.toFixed(1)),
                  energy: 0.85,
                  description: 'Déploiement rythmique et intensité vocale.',
                },
              ],
        recommendedStyles: Array.isArray(rawAnalysis.recommendedStyles)
          ? rawAnalysis.recommendedStyles.slice(0, 4).map((s: unknown, i: number) => sanitizeStyle(s, i))
          : ['Afrobeats', 'R&B', 'Afro Gospel'],
        musicalNotes: String(
          rawAnalysis.musicalNotes ||
            'Arrangement conçu pour laisser respirer la voix originale au centre du spectre.'
        ),
      };

      const rawProposals = Array.isArray(parsed.proposals) ? parsed.proposals : [];
      const proposals = [0, 1, 2].map((i) =>
        sanitizeProposal(rawProposals[i] ?? rawProposals[0], i, bpm, keyName, rootMidi)
      );

      res.json({ analysis, proposals });
    } catch (err: any) {
      console.error('Analyze vocal error:', err);
      const message = err?.message || "Erreur lors de l'analyse vocale IA.";
      res.status(500).json({ error: message });
    }
  });

  // Speech-to-Text Transcription with gemini-3.5-transcribe
  app.post('/api/transcribe-vocal', async (req: Request, res: Response) => {
    try {
      const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64 : '';
      const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : 'audio/wav';

      if (!audioBase64 || audioBase64.length < 100) {
        res.status(400).json({ error: 'Audio vocal manquant pour la transcription.' });
        return;
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: "Transcris fidèlement toutes les paroles chantées ou parlées présentes dans cet enregistrement vocal, en respectant les retours à la ligne entre les phrases. Si aucun mot intelligible n'est présent (uniquement des vocalises ou fredonnements), indique-le brièvement entre crochets.",
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({ transcript });
    } catch (err: any) {
      console.error('Transcribe vocal error:', err);
      res.status(500).json({ error: err?.message || 'Erreur lors de la transcription vocale.' });
    }
  });

  // Regenerate 3 Beat Proposals from VocalAnalysis + Selected Styles + Emotional Context
  app.post('/api/generate-beats', async (req: Request, res: Response) => {
    try {
      const analysis = req.body?.analysis;
      const requestedStyles: string[] = Array.isArray(req.body?.styles)
        ? req.body.styles.slice(0, 3).map((s: unknown, i: number) => sanitizeStyle(s, i))
        : [];
      const emotionalTags: string[] = Array.isArray(req.body?.emotionalTags)
        ? req.body.emotionalTags.map((t: unknown) => String(t)).slice(0, 6)
        : [];

      if (!analysis || !Number.isFinite(Number(analysis.bpm))) {
        res.status(400).json({ error: 'Analyse vocale requise pour générer des beats.' });
        return;
      }

      const ai = getGeminiClient();
      const stylesList =
        requestedStyles.length === 3
          ? requestedStyles
          : [
              requestedStyles[0] || sanitizeStyle(analysis.recommendedStyles?.[0], 0),
              requestedStyles[1] || sanitizeStyle(analysis.recommendedStyles?.[1], 4),
              requestedStyles[2] || sanitizeStyle(analysis.recommendedStyles?.[2], 8),
            ];

      const emotionalDirection =
        emotionalTags.length > 0
          ? `\n- Contexte émotionnel choisi par l'artiste : ${emotionalTags.join(', ')}.\nAdapte impérativement les choix d'accords (majeur/mineur/7e/9e), la densité de batterie, le choix de basse (sub808, logdrum, plucked, reese), les guitares et synthés pour refléter fidèlement ces émotions (${emotionalTags.join(', ')}).`
          : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Génère 3 nouvelles propositions d'accompagnements instrumentaux distincts dans les styles suivants : ${stylesList.join(', ')}.
Paramètres vocaux à respecter impérativement :
- Tempo naturel : ${analysis.bpm} BPM
- Tonalité : ${analysis.keyName} (rootMidi = ${analysis.rootMidi}, gamme = ${analysis.scaleType})
- Mélodie : ${analysis.melodySummary}
- Rythme : ${analysis.rhythmFeel}
- Émotion détectée : ${analysis.emotion}${emotionalDirection}

Chaque proposition doit inclure des motifs précis sur 16 pas pour kick, snare, hihat, percussion, bassSteps (relatif à rootMidi-12, -1 pour silence), chordProgression (4 accords MIDI entre 48 et 76), guitarPattern (relatif à rootMidi, -1 pour silence), synthPattern (relatif à rootMidi+12, -1 pour silence), ainsi que des descriptions riches en français.`,
        config: {
          systemInstruction: `Tu es un compositeur et arrangeur multi-instrumentiste. Crée des rythmes, lignes de basse, accords de piano, guitares et synthétiseurs authentiques pour chaque style demandé, parfaitement accordés à rootMidi=${analysis.rootMidi} (${analysis.keyName}).`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              proposals: {
                type: Type.ARRAY,
                items: BEAT_PROPOSAL_SCHEMA,
              },
            },
            required: ['proposals'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      const rawProposals = Array.isArray(parsed.proposals) ? parsed.proposals : [];
      const proposals = [0, 1, 2].map((i) =>
        sanitizeProposal(rawProposals[i] ?? rawProposals[0], i, Number(analysis.bpm), String(analysis.keyName), Number(analysis.rootMidi))
      );

      res.json({ proposals });
    } catch (err: any) {
      console.error('Generate beats error:', err);
      res.status(500).json({ error: err?.message || 'Erreur lors de la génération de nouveaux beats.' });
    }
  });

  const httpServer = http.createServer(app);

  // Vite or Static Frontend Serving
  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`BEATMAKER AI Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
