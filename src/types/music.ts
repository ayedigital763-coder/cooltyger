export type PageId =
  | 'home'
  | 'auth'
  | 'dashboard'
  | 'record'
  | 'analyze'
  | 'beats'
  | 'studio'
  | 'export'
  | 'library';

export type MusicStyle =
  | 'Afrobeats'
  | 'Afro Gospel'
  | 'Amapiano'
  | 'R&B'
  | 'Hip-hop'
  | 'Rap'
  | 'Dancehall'
  | 'Coupé-décalé'
  | 'Zouk'
  | 'Reggae'
  | 'Pop'
  | 'Drill'
  | 'Gospel'
  | 'Musiques africaines traditionnelles';

export const MUSIC_STYLES: MusicStyle[] = [
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
];

export interface StructureSegment {
  label: string;
  startSec: number;
  endSec: number;
  energy: number;
  description: string;
}

export interface SilenceWindow {
  startSec: number;
  endSec: number;
  purpose: string;
}

export interface VocalAnalysis {
  bpm: number;
  keyName: string;
  rootMidi: number;
  scaleType: 'major' | 'minor' | 'pentatonic_minor' | 'pentatonic_major' | 'dorian';
  melodySummary: string;
  rhythmFeel: string;
  melodicVariations: string;
  emotion: string;
  energyScore: number;
  vocalRange: string;
  silencesCount: number;
  silences: SilenceWindow[];
  structure: StructureSegment[];
  recommendedStyles: MusicStyle[];
  musicalNotes: string;
}

export interface InstrumentPatterns {
  kick: number[];
  snare: number[];
  hihat: number[];
  percussion: number[];
  percussionType: 'logdrum' | 'conga' | 'shaker_clave' | 'djembe' | 'woodblock';
  bassSteps: (number | null)[];
  chordProgression: number[][];
  guitarPattern: (number | null)[];
  synthPattern: (number | null)[];
  swing: number;
  bassTone: 'sub808' | 'logdrum' | 'plucked' | 'reese';
  pianoTone: 'rhodes' | 'grand' | 'organ' | 'warm_pad';
  guitarTone: 'afro_mute' | 'nylon' | 'reggae_skank' | 'clean_arp';
  synthTone: 'lush_pad' | 'pluck_lead' | 'brass_stab' | 'bell_arp';
}

export interface BeatProposal {
  id: string;
  title: string;
  style: MusicStyle;
  bpm: number;
  keyName: string;
  rootMidi: number;
  mood: string;
  arrangementSummary: string;
  instrumentsIncluded: string[];
  transitionsDescription: string;
  patterns: InstrumentPatterns;
}

export interface StudioEffects {
  reverb: boolean;
  delay: boolean;
  warmth: boolean;
  stereoWidth: boolean;
  lofiFilter: boolean;
}

export interface MixSettings {
  vocalMode: 'original' | 'enhanced';
  vocalVolume: number;
  instrumentalVolume: number;
  drumVolume: number;
  percussionVolume: number;
  bassVolume: number;
  pianoVolume: number;
  guitarSynthVolume: number;
  tempoBpm: number;
  effects: StudioEffects;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ProjectSummary {
  id: string;
  userId: string;
  title: string;
  style: MusicStyle;
  bpm: number;
  keyName: string;
  durationSec: number;
  vocalMode: 'original' | 'enhanced';
  coverImage: string;
  createdAt: string;
  updatedAt: string;
}

export type EmotionalTag =
  | 'Melancholic'
  | 'Energetic'
  | 'Uplifting'
  | 'Dark'
  | 'Spiritual'
  | 'Romantic'
  | 'Groovy'
  | 'Intimate';

export interface EmotionalTagOption {
  id: EmotionalTag;
  label: string;
  musicalHint: string;
}

export const EMOTIONAL_CONTEXT_OPTIONS: EmotionalTagOption[] = [
  {
    id: 'Melancholic',
    label: 'Mélancolique · Melancholic',
    musicalHint: 'Accords mineurs sensibles, piano feutré, basse ronde et espace émotionnel.',
  },
  {
    id: 'Energetic',
    label: 'Énergique · Energetic',
    musicalHint: 'Batterie percutante, percussions syncopées et groove entraînant.',
  },
  {
    id: 'Uplifting',
    label: 'Lumineux · Uplifting',
    musicalHint: 'Harmonies ouvertes majeures, nappes chaleureuses et montée inspirante.',
  },
  {
    id: 'Dark',
    label: 'Sombre · Dark',
    musicalHint: 'Basses 808 profondes, synthés nocturnes et tension rythmique.',
  },
  {
    id: 'Spiritual',
    label: 'Spirituel',
    musicalHint: 'Orgue chaleureux, chœurs harmoniques et dynamique gospel.',
  },
  {
    id: 'Romantic',
    label: 'Romantique',
    musicalHint: 'Guitare acoustique douce, Rhodes velouté et swing délicat.',
  },
  {
    id: 'Groovy',
    label: 'Festif',
    musicalHint: 'Guitares dansantes, log drum ou congas dynamiques.',
  },
  {
    id: 'Intimate',
    label: 'Intime',
    musicalHint: 'Arrangement épuré laissant une place maximale au souffle vocal.',
  },
];

export interface StoredProject extends ProjectSummary {
  analysis: VocalAnalysis;
  proposals: BeatProposal[];
  selectedProposalId: string;
  mixSettings: MixSettings;
  vocalSampleRate: number;
  vocalChannels: Float32Array[];
  lyrics?: string;
  emotionalContext?: EmotionalTag[];
}

export const DEFAULT_MIX_SETTINGS = (bpm: number): MixSettings => ({
  vocalMode: 'original',
  vocalVolume: 1.0,
  instrumentalVolume: 0.85,
  drumVolume: 1.0,
  percussionVolume: 0.9,
  bassVolume: 0.95,
  pianoVolume: 0.85,
  guitarSynthVolume: 0.8,
  tempoBpm: bpm,
  effects: {
    reverb: true,
    delay: false,
    warmth: true,
    stereoWidth: false,
    lofiFilter: false,
  },
});
