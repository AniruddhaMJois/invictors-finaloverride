import express from 'express';
import { gameEngine } from '../services/gameEngine.js';

export const stage5Router = express.Router();

// Middleware to ensure team is strictly on Stage 5
function requireStage5(req, res, next) {
  const team = gameEngine.teams.get(req.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  if (team.currentStage !== 5) {
    return res.status(403).json({
      error: 'Stage 5 content and memory core are only accessible while on Stage 5.'
    });
  }

  next();
}

const SET_STAGE5_BYTES = {
  A: ['48', '45', '58', '38', '32', '44'], // HEX82D
  B: ['43', '4F', '52', '45', '37', '46'], // CORE7F
  C: ['42', '59', '54', '45', '39', '41'], // BYTE9A
  D: ['42', '49', '54', '53', '31', '45'], // BITS1E
  E: ['53', '59', '4E', '43', '33', '43']  // SYNC3C
};

const DUMMY_COLUMNS = [
  ['0A', 'F2', '1C'],
  ['9B', '7E', 'D0'],
  ['3F', 'A1', '64'],
  ['E5', '2B', '99'],
  ['71', '8C', '4A'],
  ['BD', '15', 'EE']
];

const CHANNEL_ROUTING = [
  { channel: 'Channel A', seqNumber: 3, seqLabel: 'Seq #3', byteIndex: 2 },
  { channel: 'Channel B', seqNumber: 1, seqLabel: 'Seq #1', byteIndex: 0 },
  { channel: 'Channel C', seqNumber: 5, seqLabel: 'Seq #5', byteIndex: 4 },
  { channel: 'Channel D', seqNumber: 2, seqLabel: 'Seq #2', byteIndex: 1 },
  { channel: 'Channel E', seqNumber: 6, seqLabel: 'Seq #6', byteIndex: 5 },
  { channel: 'Channel F', seqNumber: 4, seqLabel: 'Seq #4', byteIndex: 3 }
];

function getMemoryChannelsForSet(bytes) {
  return CHANNEL_ROUTING.map((route, idx) => ({
    channel: route.channel,
    seqNumber: route.seqNumber,
    seqLabel: route.seqLabel,
    bytes: [
      DUMMY_COLUMNS[idx][0],
      bytes[route.byteIndex],
      DUMMY_COLUMNS[idx][1],
      DUMMY_COLUMNS[idx][2]
    ],
    activeIndex: 1
  }));
}

// GET /api/stage/5
stage5Router.get('/5', requireStage5, (req, res) => {
  const team = gameEngine.teams.get(req.teamId);
  const assignedSet = team?.setId || 'A';
  const setTargetBytes = SET_STAGE5_BYTES[assignedSet] || SET_STAGE5_BYTES.A;
  const channels = getMemoryChannelsForSet(setTargetBytes);
  const rawColumn1Bytes = channels.map((c) => c.bytes[c.activeIndex]);

  res.json({
    stage: 5,
    name: 'Hexadecimal Memory Core',
    heading: '🧠 Stage 5: Hexadecimal Memory Core & Bus Decoupler',
    story:
      '📖 The story: The vault’s memory core is pulsing with raw hexadecimal data! 🧠 Six high-frequency channels (Channel A through F) are dumping 4-column registers. The decoupled active high-voltage data bus line runs along Column 1, but hardware multiplexing has scrambled the packet order across channels. Reassemble the bytes in Bus Routing Sequence order (Seq #1 to #6) and translate them into ASCII.',
    tip: '💡 Tip: Examine the active Column 1 bytes across Channels A through F. Follow the Bus Routing Sequence (Seq #1 → #6) to arrange the bytes in proper order before decoding to ASCII text (e.g. 0x41 → "A").',
    footerLine:
      '✍️ Decode the active bus line bytes into ASCII text in sequence order and enter the fragment below.',
    activeColumnIndex: 1,
    activeBusBytes: rawColumn1Bytes,
    channels,
    routingOrder: [
      'Channel B (Seq #1)',
      'Channel D (Seq #2)',
      'Channel A (Seq #3)',
      'Channel F (Seq #4)',
      'Channel C (Seq #5)',
      'Channel E (Seq #6)'
    ]
  });
});
