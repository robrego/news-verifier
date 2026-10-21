// Well-documented claims for visitors to try. A few rotate each day (same ones for everybody that day),
// so repeat visitors see something new and the server cache serves most clicks for free.
export type Example = { tag: string; text: string; note: string };

export const SATIRE_EXAMPLE: Example = { tag: 'Satire', text: 'https://www.theonion.com/', note: 'Spots parody sites instantly' };

export const POOL: Example[] = [
  { tag: 'Popular myth', text: 'Humans only use 10% of their brain', note: 'A classic that sounds true' },
  { tag: 'Space', text: 'The Great Wall of China is visible from space with the naked eye', note: 'Check what the sources say' },
  { tag: 'Health', text: 'Cracking your knuckles causes arthritis', note: 'Often backed by fact-checks' },
  { tag: 'Weather', text: 'Lightning never strikes the same place twice', note: 'Sounds reassuring, is it right?' },
  { tag: 'Animals', text: 'Goldfish have a three second memory', note: 'Everyone has heard this one' },
  { tag: 'Animals', text: 'Bulls get angry when they see the color red', note: 'Think of the matador' },
  { tag: 'Health', text: 'Sugar makes children hyperactive', note: 'Parents swear by it' },
  { tag: 'Health', text: 'You lose most of your body heat through your head', note: 'Your hat says otherwise' },
  { tag: 'Health', text: 'Shaving makes hair grow back thicker', note: 'A barbershop staple' },
  { tag: 'Animals', text: 'Bats are blind', note: 'Blind as a bat?' },
  { tag: 'History', text: 'Napoleon Bonaparte was unusually short', note: 'A famous complex' },
  { tag: 'History', text: 'Vikings wore horned helmets', note: 'Check the archaeology' },
  { tag: 'History', text: 'Albert Einstein failed math at school', note: 'A comforting story' },
  { tag: 'Animals', text: 'Chameleons change color mainly to blend into their surroundings', note: 'Camouflage, right?' },
  { tag: 'Health', text: 'Cold weather causes colds', note: 'Your grandmother insists' },
  { tag: 'Health', text: 'Microwave ovens make food radioactive', note: 'A kitchen worry' },
  { tag: 'Science', text: 'Toilets flush the opposite way in the southern hemisphere', note: 'Ask any traveller' },
  { tag: 'Science', text: 'Humans have only five senses', note: 'School taught you five' },
  { tag: 'Animals', text: 'Dogs see only in black and white', note: 'Common pet wisdom' },
  { tag: 'Science', text: 'Glass is a slow-flowing liquid, which is why old windows are thicker at the bottom', note: 'Visit an old church' },
  { tag: 'Health', text: 'Eating carrots gives you night vision', note: 'A wartime story' },
  { tag: 'Food', text: 'Honey never spoils', note: 'Found in ancient tombs?' },
  { tag: 'Animals', text: 'Ostriches bury their heads in the sand when scared', note: 'Cartoon favourite' },
  { tag: 'Science', text: 'Different parts of the tongue taste different flavors', note: 'The famous tongue map' },
];

// Same three for everyone on a given UTC day.
export function dailyExamples(dayIndex: number, count = 3): Example[] {
  const start = (dayIndex * count) % POOL.length;
  return Array.from({ length: count }, (_, i) => POOL[(start + i) % POOL.length]);
}

export function todayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}
