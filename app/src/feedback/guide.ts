// Content of the "How to take digitals" guide. Section ids are what rubric.json criteria and the
// feedback tips link to (criterion "guide" field), so renaming one here means updating the rubric.
export type GuideSection = {
  id: string;
  title: string;
  /** Link text on a note that points to this section. */
  cta: string;
  intro: string;
  steps: string[];
};

export const GUIDE: GuideSection[] = [
  {
    id: 'shots',
    title: 'The three shots',
    cta: 'See how to shoot the three photos',
    intro: 'Digitals are plain, recent photos that show agencies what you look like today.',
    steps: [
      'Face close-up: head and shoulders, facing the camera, chin level, hair away from your face.',
      'Full length: head to toe, standing straight with arms relaxed, feet slightly apart, camera at chest height.',
      'Side profile: the same full-length framing, turned 90 degrees, looking straight ahead.',
      'Keep a neutral expression in at least one face shot. A natural smile in another is fine.',
    ],
  },
  {
    id: 'light',
    title: 'Light',
    cta: 'See how to use daylight',
    intro: 'Soft, even daylight shows you as you are and keeps colours true.',
    steps: [
      'Stand facing a window in daylight, not in direct sun.',
      'Switch off the flash and any warm, coloured or LED mood lights in the room.',
      'If one side of your face is dark, turn towards the window or hold a white sheet or card on that side.',
      'Avoid evening light and open shade outdoors; they tint photos blue or orange.',
    ],
  },
  {
    id: 'background',
    title: 'Background',
    cta: 'See how to choose a wall',
    intro: 'A plain background keeps the attention on you and lets the app check colour.',
    steps: [
      'Use a plain white or light grey wall with nothing on it.',
      'Stand about a metre in front of the wall so you do not cast a hard shadow on it.',
      'Clear the floor around your feet for the full-length shots.',
    ],
  },
  {
    id: 'clothes',
    title: 'What to wear',
    cta: 'See what to wear',
    intro: 'Agencies want to see your shape and features, not an outfit.',
    steps: [
      'Fitted, plain clothes in a solid colour: for example a fitted top and fitted jeans or leggings.',
      'No logos, patterns, jewellery or hats.',
      'Little or no make-up, and hair natural and off your face.',
      'Flat shoes or barefoot, unless an agency asks for heels.',
    ],
  },
  {
    id: 'camera',
    title: 'Camera and focus',
    cta: 'See how to get a sharp photo',
    intro: 'Sharp photos let agencies see detail.',
    steps: [
      'Use the rear camera, not the selfie camera.',
      'Ask someone to take the photos, or use a tripod and the self-timer.',
      'Step back and zoom in about 2x rather than standing close; this avoids distortion.',
      'Tap on yourself on the screen to focus, hold the phone still, and wipe the lens first.',
      'Turn off portrait mode, beauty mode and filters.',
    ],
  },
  {
    id: 'export',
    title: 'Sending the files',
    cta: 'See how to send the files',
    intro: 'Compression and edits remove the detail agencies look for.',
    steps: [
      'Use the original file from your camera roll.',
      'Do not send screenshots or copies saved from messaging apps; they are smaller and compressed.',
      'Do not retouch, crop tightly or apply filters.',
    ],
  },
  {
    id: 'measuring',
    title: 'Measuring yourself',
    cta: 'See how to measure yourself',
    intro: 'Use a soft tape measure in centimetres, ideally with someone helping. Keep the tape snug, not tight, and level with the floor.',
    steps: [
      'Height: without shoes, heels against a wall, looking straight ahead. Mark the top of your head and measure to the floor.',
      'Bust or chest: around the fullest part, under the arms.',
      'Waist: around your natural waist, the narrowest part of your torso, breathing normally.',
      'Hips: around the fullest part of your hips and seat, feet together.',
      'Shoe size: the EU size you usually wear.',
    ],
  },
];

export const GUIDE_IDS = GUIDE.map((s) => s.id);
