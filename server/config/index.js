import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DEFAULT_COORDINATORS = [
  { id: 'akul', name: 'Akul P Yadav', pin: 'AKUL#101' },
  { id: 'gagan', name: 'Gagan S Urs', pin: 'GAGAN#202' },
  { id: 'punya', name: 'M Punya Sagar', pin: 'PUNYA#303' },
  { id: 'shashank', name: 'MN Shashank', pin: 'SHASHANK#404' },
  { id: 'dhanush', name: 'Dhanush KP', pin: 'DHANUSH#505' },
  { id: 'anirudh', name: 'Anirudh m', pin: 'ANIRUDH#606' },
  { id: 'anish', name: 'Anish S Kumar', pin: 'ANISH#707' },
  { id: 'ayush', name: 'Ayush P', pin: 'AYUSH#808' },
  { id: 'skanda', name: 'Skanda', pin: 'SKANDA#909' },
  { id: 'vishnu', name: 'Vishnuvardhan', pin: 'VISHNU#111' },
  { id: 'vandhana', name: 'Vandhana V', pin: 'VANDHANA#222' },
  { id: 'abhiram', name: 'Abhiram BS', pin: 'ABHIRAM#333' },
  { id: 'harshil', name: 'Harshil', pin: 'HARSHIL#444' },
  { id: 'arun', name: 'Arun', pin: 'ARUN#234' },
  { id: 'divya', name: 'Divya', pin: 'DIVYA#567' },
  { id: 'kiran', name: 'Kiran', pin: 'KIRAN#890' },
  { id: 'pooja', name: 'Pooja', pin: 'POOJA#123' },
  { id: 'rakshith', name: 'Rakshith', pin: 'RAKSHITH#456' }
];

let parsedCoordinators = DEFAULT_COORDINATORS;
if (process.env.COORDINATORS) {
  try {
    parsedCoordinators = JSON.parse(process.env.COORDINATORS);
  } catch (e) {
    parsedCoordinators = DEFAULT_COORDINATORS;
  }
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  ADMIN_PIN: process.env.ADMIN_PIN || 'INVICTORS@23',
  COORDINATORS: parsedCoordinators,
  TIME_CAP_SECONDS: parseInt(process.env.TIME_CAP_SECONDS || '5400', 10),
  SALT: process.env.SALT || 'INVICTORS_OVERRIDE_SALT_998124',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'FO_SECRET_KEY_CYBER_2024',
  NODE_ENV: process.env.NODE_ENV || 'production'
};

// SERVER-AUTHORITATIVE ANSWERS (NEVER SENT TO CLIENT)
export const STAGE_ANSWERS = {
  1: 'NOVA',
  2: '7K2',
  3: 'ORBIT',
  4: '91X',
  5: 'HEX82D',
  6: 'FO{91X-7K2-HEX82D-TIBRO-NOVA}#29'
};

export const STAGE_HINTS = {
  1: {
    1: 'Reveals 15-character international Morse code chart: A(•—), B(—•••), C(—•—•), D(—••), E(•), F(••—•), G(——•), H(••••), I(••), J(•———), K(—•—), N(—•), O(———), V(•••—), Z(——••).',
    2: 'Combining the 4 sectors yields the 4-letter cosmic word NOVA.'
  },
  2: {
    1: 'Structural markers: Base64 has \'==\' padding; Hex has byte pairs; ROT13 has English frequency distribution.',
    2: 'Sequential order: Base64 Decode -> Hex Decode -> ROT13 Shift. Record both the key fragment (7K2) and the secret access phrase (AURORA).'
  },
  3: {
    1: 'WARDEN requires the access phrase AURORA from Stage 2.',
    2: 'Write a professional statement of 10 or more words that says who you are and asks for the fragment.'
  },
  4: {
    1: 'Each station hides ONE character. Find all three and join them in order (Station 1 + 2 + 3).',
    2: 'Station 1: find the DENIED odd row clearance digit. Station 2: slide camera brightness up. Station 3: match glowing symbol with the legend.'
  },
  5: {
    1: 'High-voltage data flows along Column 1 across Channels A through F.',
    2: 'Read Column 1 bytes (48 45 58 38 32 44) into the workbench and decode Hex to ASCII text.'
  },
  6: {
    1: 'Sort the 5 missions A-Z by NAME: CTF Challenges (f4), Decoding (f2), Hex Decryption (f5), Prompt the AI (f3 reversed), Signal Intercept (f1).',
    2: 'Reverse Fragment 3 (ORBIT -> TIBRO). Checksum is sum of all digits (0-9) in the key body. Format: FO{...}#checksum.'
  }
};
