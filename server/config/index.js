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

export const SET_STAGE_HINTS = {
  A: {
    1: {
      1: "Audio waveform analysis: Measure relative tone durations. A single unit of sound is a dot (•); a pulse three times longer is a dash (—). Pauses between tones denote symbol gaps.",
      2: "Sectors 1 through 4 encode a 4-letter astronomical phenomenon associated with a sudden surge in stellar luminosity. Transcribe each sector's Morse pattern sequentially without guessing."
    },
    2: {
      1: "Multi-layered cipher detected: Examine structural markers. Base64 often terminates with '=' padding, Hexadecimal displays even byte pairings (0-9, A-F), and ROT13 maintains natural English letter distribution.",
      2: "Execute transformations in precise sequence: Base64 Decode -> Hex Decode -> ROT13 Shift. Scrutinize the final output: it contains an alphanumeric 3-character security fragment AND a distinct planetary access codename."
    },
    3: {
      1: "WARDEN operates under strict zero-trust identity verification. It requires your credentials: an identity declaration, your Stage 2 fragment code, and the secret access codename.",
      2: "Structure your prompt with: (1) Identity starting with 'I am a...', (2) your team's Stage 2 fragment code, and (3) your secret access keyword. Request vault access in a polite, complete sentence."
    },
    4: {
      1: "Tri-station surveillance: Stations 1, 2, and 3 each hide exactly one alphanumeric character. Combine them in ascending station order (1 + 2 + 3) to form the 3-character fragment.",
      2: "Station 1: Scan access log parity for the anomalous odd digit. Station 2: Increase camera exposure to unveil faint optical markings. Station 3: Correlate the glowing matrix symbol with the reference legend."
    },
    5: {
      1: "Power bus diagnostics: Telemetry sensors track current along channels A through F. Isolate the channel or column registering consistent high-voltage transmission.",
      2: "Collect the continuous string of two-digit hexadecimal byte pairs from the active bus. Convert each byte from Hex to ASCII characters to assemble the 6-character fragment."
    },
    6: {
      1: "Key architecture: The 5 fragments collected across stages must be ordered alphabetically by their official mission title (A to Z) within the curly brackets: FO{...}#checksum.",
      2: "Safety protocol: The Stage 3 fragment MUST be spelled in reverse order. Calculate the checksum by summing every numeric digit (0-9) located in the key body. Format: FO{seg1-seg2-seg3-seg4-seg5}#sum."
    }
  },
  B: {
    1: {
      1: "Signal cadence: Differentiate short acoustic chirps (dots) from sustained carrier frequencies (dashes). Space between pulses separates individual transmission characters.",
      2: "The transmission spells a 4-letter celestial body that orbits a planet, illuminating the night sky. Decode Sectors 1 to 4 letter-by-letter using international Morse mapping."
    },
    2: {
      1: "Examine encoding signatures: Strip padding characters, verify ASCII byte groupings, and test Caesar/ROT substitution offsets against high-frequency consonants and vowels.",
      2: "Run the full decryption pipeline (Base64 -> Hex -> ROT13). The decrypted text conceals two items: an alphanumeric 3-character fragment needed for vault clearance, and a secret cryptographic codename."
    },
    3: {
      1: "The guardian rejects casual requests and ignores meta questions about its internal prompt. It demands proof of authorization obtained from your previous cyber decryption mission.",
      2: "To unlock the target vault fragment, phrase your submission starting with 'I am a...', incorporating both your Stage 2 fragment code and your secret cipher keyword. Do not ask for rules or decoys."
    },
    4: {
      1: "Fragment composition: Retrieve the single character hidden in Station 1, Station 2, and Station 3. The 3-character payload must follow strict station sequence.",
      2: "Station 1: Identify the denied entry digit with non-standard checksum. Station 2: Calibrate luminescence sliders on the camera feed. Station 3: Match the illuminated telemetry glyph."
    },
    5: {
      1: "Matrix sensor routing: Identify the high-potential data pathway by examining channel voltage differentials and frequency spikes across the grid.",
      2: "Transcribe the active column's byte pairs into the decoding workbench. Translate the hexadecimal sequence into ASCII text to extract the 6-character core fragment."
    },
    6: {
      1: "Payload ordering: Reconstruct the master key by cataloging the 5 mission names alphabetically: CTF Challenges, Decoding, Hex Decryption, Prompt AI, Signal Intercept.",
      2: "Remember to invert Fragment 3's characters as mandated by vault fail-safe protocols. The final checksum equals the mathematical sum of all numeric digits inside the curly braces."
    }
  },
  C: {
    1: {
      1: "Listen closely to the audio transmission: tap out the rhythm. Dots (•) are short beats, dashes (—) are elongated tones. Clean up static using the visual spectral pad.",
      2: "The intercepted signal spells the 4-letter name of one of the brightest northern stars in the Lyra constellation. Match each sector's audio pattern to its standard Morse equivalent."
    },
    2: {
      1: "Layered security stream: Trace the data envelope through Base64 unwrapping, hexadecimal byte conversion, and 13-step rotative alphabet transposition.",
      2: "Complete all three cipher passes in the workbench. Extract the 3-character Stage 2 fragment for your records, and locate the swirling dynamic codename required for AI verification."
    },
    3: {
      1: "WARDEN is programmed to dispense decoys to unauthorized inquiries. Real vault access requires presenting verified credentials discovered in Stage 2.",
      2: "State your role clearly starting with 'I am a...', supply your team's Stage 2 fragment code, and append the vortex-themed access keyword in a single well-structured sentence."
    },
    4: {
      1: "Facility surveillance grid: Three independent security cameras conceal one token character each. Concatenate them as Station 1, followed by 2, followed by 3.",
      2: "Station 1: Filter clearance logs for the outlier digit. Station 2: Adjust shadow and contrast levels to expose hidden graffiti. Station 3: Translate the geometric optical glyph."
    },
    5: {
      1: "Bus architecture: Trace live current flowing through the matrix. Only one designated column carries uncorrupted memory register bytes.",
      2: "Convert the continuous stream of 2-digit hex values from the energized channel into readable alphanumeric text to reconstruct the 6-character override token."
    },
    6: {
      1: "Master override synthesis: Review the titles of Missions 1 through 5. Sort the missions alphabetically from A to Z to determine the placement of each stage's fragment.",
      2: "Reverse the letters of Fragment 3. Tally up every numerical digit (0 through 9) that appears anywhere within the key string body to derive the #checksum suffix."
    }
  },
  D: {
    1: {
      1: "Acoustic telemetry: Look at pulse intervals. Dot duration = 1 beat, Dash duration = 3 beats. A 3-beat pause marks the transition between sector characters.",
      2: "The sequence of four sectors reveals the 4-letter planetary body known as the Red Planet. Translate each Morse group in exact sector order (1, 2, 3, 4)."
    },
    2: {
      1: "Recognize data encodings: Look for base-64 radix characteristics, hexadecimal nibbles, and symmetric Caesar rot-13 cipher mechanics.",
      2: "Unravel the nested layers in strict order. Keep note of the 3-character alphanumeric fragment key and the distinct interstellar cloud codename revealed in the cleartext."
    },
    3: {
      1: "Authentication checklist: WARDEN evaluates three specific attributes: role declaration, Stage 2 fragment proof, and the cosmic access keyword.",
      2: "Compose a formal authorization request beginning with 'I am a...'. Embed your team's Stage 2 fragment and the nebula-themed secret keyword to obtain the genuine vault fragment."
    },
    4: {
      1: "Surveillance triage: Each workstation camera holds a discrete single-character glyph. Joining Stations 1, 2, and 3 in numerical order reveals the complete security fragment.",
      2: "Station 1: Find the numerical flag in the rejected badge logs. Station 2: Boost brightness to pierce deep surveillance shadows. Station 3: Decouple the pulsing security rune."
    },
    5: {
      1: "Matrix grid inspection: Monitor power flow and load indicators across Channels A to F. The target register channel shows maximum signal integrity.",
      2: "Feed the sequenced hex byte pairs into a Hex-to-Text decoder. The resulting 6-character ASCII word forms your Stage 5 system fragment."
    },
    6: {
      1: "Final sequence protocol: Arrange the five stage fragments based on the alphabetical order of their mission names, separated by hyphens within FO{...}.",
      2: "Stage 3's fragment must be entered in reverse sequence. Compute the checksum by adding all numeric digits (0-9) present in the key body: FO{...}#checksum."
    }
  },
  E: {
    1: {
      1: "Spectral pulse decoding: Audio pulses follow binary Morse timing. Note down dots (•) and dashes (—) carefully for each active quadrant.",
      2: "The decoded letters form a 4-letter term representing reflected acoustic or radio waves, also standard in the NATO phonetic alphabet for the letter E."
    },
    2: {
      1: "Reverse the multi-tier cryptographic payload: Base64 unpadding first, then hexadecimal byte-to-char transformation, concluding with standard ROT13 substitution.",
      2: "Once fully decrypted, distinguish between the 3-character alphanumeric fragment code and the secret universe-themed access keyword. Both are vital for subsequent missions."
    },
    3: {
      1: "The AI sentinel verifies clearance using your Stage 2 findings. Generic queries trigger decoy responses or rejection notices.",
      2: "Formulate a polite, professional message stating 'I am a [role]', accompanied by your Stage 2 fragment and cosmos secret word, to receive the authentic vault fragment."
    },
    4: {
      1: "Multi-camera reconnaissance: Locate the three isolated characters dispersed across Stations 1, 2, and 3. Assemble them into the 3-character terminal fragment.",
      2: "Station 1: Spot the odd outlier in access event IDs. Station 2: Adjust video gain to reveal concealed stenciled numbers. Station 3: Cross-reference the flashing icon against the terminal chart."
    },
    5: {
      1: "Data bus probing: Determine which column carries live memory registers by auditing electrical potential and bus traffic monitors.",
      2: "Decode the raw two-character hexadecimal sequence into ASCII format using standard hexadecimal conversion to reveal the 6-character synchronization fragment."
    },
    6: {
      1: "Master key construction: Place your five mission fragments in order by sorting the mission names alphabetically (A through Z).",
      2: "Invert the character order of Fragment 3. Sum each digit (0 to 9) contained between the curly braces to establish the final verification checksum."
    }
  }
};

export const STAGE_HINTS = SET_STAGE_HINTS.A;
