import { fill } from './stories';
import { makeRng } from './rng';
import type { Article } from './types';

/** Pulls a YouTube video id out of any common link (watch, youtu.be, shorts, embed) found anywhere in the text. */
export function youtubeId(text: string | undefined | null): string | null {
  if (!text) return null;
  const m = String(text).match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^\s]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

export const VIDEO_KINDS = [
  'Game Highlights', 'Top 5 Plays', 'Interview', 'Film Room', 'Power Rankings Show', 'Rivalry Special', 'Mailbag', 'Season Preview',
] as const;
export type VideoKind = (typeof VIDEO_KINDS)[number];

/** Video type is stored in the Articles "Type" column as "Video: <kind>" so no Sheet changes are needed. */
export const videoType = (k: string) => `Video: ${k}`;
export const isVideo = (a: Article) => String(a.Type).startsWith('Video') && youtubeId(a.Summary + ' ' + (a['Key facts used'] ?? '')) !== null;
export const videoKindOf = (a: Article) => String(a.Type).replace(/^Video:?\s*/, '') || 'Video';
export const videoIdOf = (a: Article) => youtubeId(a.Summary + ' ' + (a['Key facts used'] ?? '')) ?? '';
/** Text of the article with the link stripped out. */
export const videoBlurb = (a: Article) => String(a.Summary).replace(/https?:\/\/\S+/g, '').trim();

export interface VideoSubject {
  team?: { name: string; city: string; nick: string; coach?: string };
  player?: { name: string; first: string; last: string; team: string; teamCity: string; teamNick: string };
  coach?: string;
}

interface Tpl { h: string; b: string }

/**
 * Slots: {s} the subject (team nickname, player name, or coach), {sf} full subject name, {tc} city, {tf} team name, {coach}, {wk} {season}.
 * Subject-free variants use only {wk} {season}. Reporter voice only; nothing here quotes a real player.
 */
const T: Record<VideoKind, { any: Tpl[]; team: Tpl[]; player: Tpl[]; coach: Tpl[] }> = {
  'Game Highlights': {
    any: [
      { h: 'Week {wk} highlights: every big play, one video', b: 'Touchdowns, takeaways and a couple of plays you will want to watch twice. All the best moments from Week {wk} of season {season}.' },
      { h: 'Watch: the biggest moments from Week {wk}', b: 'It was a week full of swings. Relive the plays that decided it.' },
    ],
    team: [
      { h: '{sf} highlights: the full game in four minutes', b: 'Everything you need from the {tf} game: the big plays, the turning point and the finish.' },
      { h: 'Watch: how the {tf} did it', b: 'From the opening drive to the final whistle, here is how {tc} put it together in Week {wk}.' },
    ],
    player: [
      { h: 'Watch: {sf} puts on a show', b: 'The {tf} star had a game to remember, and the cameras caught all of it. Highlights from Week {wk}.' },
      { h: '{sf} highlights: every touch from the {tc} game', b: 'If you missed it live, this is the best way to catch up on what {s} did in Week {wk}.' },
    ],
    coach: [
      { h: 'Coach {coach} highlights: the game that got everyone talking', b: 'A big week for the coach and his team. Watch the plays that made the difference in Week {wk}.' },
    ],
  },
  'Top 5 Plays': {
    any: [
      { h: 'Top 5 plays of Week {wk}', b: 'We counted down the five best plays from around the league. Number one is a lot to take in.' },
      { h: 'Ranking the five best plays from Week {wk}', b: 'Jukes, picks and a couple of throws that should not have worked. Do you agree with our order?' },
    ],
    team: [
      { h: 'Top 5 {tf} plays of the season so far', b: 'From big throws to bigger hits, here are the best moments from {tc} through Week {wk}.' },
    ],
    player: [
      { h: 'Top 5 {sf} plays so far', b: 'The {tf} standout keeps stacking highlights. We picked the five best of season {season}.' },
    ],
    coach: [
      { h: 'Coach {coach}’s top 5 plays of the week', b: 'The coach picks the plays that defined Week {wk}, and not everyone is going to agree.' },
    ],
  },
  Interview: {
    any: [
      { h: 'Sit-down: a look at where the league stands after Week {wk}', b: 'A long conversation about the season so far, what is working and what comes next.' },
    ],
    team: [
      { h: 'Interview: inside the {tf} locker room', b: 'We sat down to talk about the {tf} season, expectations and what {tc} fans should expect next.' },
    ],
    player: [
      { h: 'Interview: {sf} on the season, the team and what comes next', b: 'A relaxed, wide-ranging conversation with the {tf} {s}. Watch the full sit-down.' },
      { h: 'One-on-one with {sf}', b: 'We caught up with {s} to talk about Week {wk} and the road ahead for {tc}.' },
    ],
    coach: [
      { h: 'Coach {coach} breaks down the season so far', b: 'The coach goes deep on strategy, rivalries and what he thinks it takes to win a title.' },
    ],
  },
  'Film Room': {
    any: [
      { h: 'Film Room: the plays that decided Week {wk}', b: 'We broke down the tape and found the small details that swung the biggest games.' },
    ],
    team: [
      { h: 'Film Room: how the {tf} are winning (or not)', b: 'A closer look at the {tf} schemes, matchups and the adjustments that matter next week.' },
    ],
    player: [
      { h: 'Film Room: why {sf} is so hard to stop', b: 'We went through the tape on the {tf} {s} and showed exactly what makes him special.' },
    ],
    coach: [
      { h: 'Film Room: Coach {coach}’s game plan, explained', b: 'Walking through the play calls and the decisions that shaped Week {wk}.' },
    ],
  },
  'Power Rankings Show': {
    any: [
      { h: 'Power Rankings, Week {wk}: who is up and who is down', b: 'Our updated rankings are here, and a few teams are not going to like where they landed.' },
      { h: 'Week {wk} power rankings are in. Go ahead, get mad.', b: 'Risers, fallers and one pick that is going to start an argument.' },
    ],
    team: [
      { h: 'Where do the {tf} rank after Week {wk}?', b: 'Our power rankings are out, and {tc} fans might have something to say about it.' },
    ],
    player: [
      { h: 'Power Rankings: the best players in the league, with {sf} in the mix', b: 'Our list of the top players is here, and the {tf} star made the cut.' },
    ],
    coach: [
      { h: 'Coach rankings: where does {coach} land?', b: 'We ranked every head coach in the league. This one is going to cause some problems.' },
    ],
  },
  'Rivalry Special': {
    any: [
      { h: 'Rivalry week: the best rivalries in the league, ranked', b: 'Old grudges, close games and a lot of bad blood. Here are the rivalries that matter.' },
    ],
    team: [
      { h: 'The {tf} rivalry, explained', b: 'Why the {tf} cannot stand their biggest rival, and how it all started.' },
    ],
    player: [
      { h: '{sf} and the rivalry everyone is watching', b: 'The {tf} {s} is in the middle of one of the best storylines of the season.' },
    ],
    coach: [
      { h: 'Coach {coach} and the rivalry that will not die', b: 'It is personal, it is loud and it is the best thing in the league right now.' },
    ],
  },
  Mailbag: {
    any: [
      { h: 'Mailbag: your questions, our answers (Week {wk})', b: 'You asked, we answered. Some of these are fair questions, and some are not.' },
    ],
    team: [
      { h: 'Mailbag: your {tf} questions answered', b: 'Fans of the {tf} sent in a lot of questions this week. We got to as many as we could.' },
    ],
    player: [
      { h: 'Mailbag: is {sf} for real?', b: 'The mailbag is full of {s} questions this week. Here is what we think.' },
    ],
    coach: [
      { h: 'Mailbag: your questions for Coach {coach}', b: 'The mailbag came in hot. Here is what the coach had to say.' },
    ],
  },
  'Season Preview': {
    any: [
      { h: 'Season {season} preview: who wins it all?', b: 'Predictions, sleepers and a few bold calls before the season really gets going.' },
    ],
    team: [
      { h: 'Season {season} preview: can the {tf} make a run?', b: 'We look at the {tf} roster, the schedule and what a good year looks like for {tc}.' },
    ],
    player: [
      { h: 'Season {season} preview: {sf} is the player to watch', b: 'The {tf} {s} could be the story of the year. We break down why.' },
    ],
    coach: [
      { h: 'Season {season} preview: Coach {coach}’s plan for the title', b: 'What the coach wants, what the roster can do, and what could go wrong.' },
    ],
  },
};

/** Draft a headline + blurb for a video. Same inputs give the same draft; pass a different `variant` to reroll. */
export function draftVideoStory(kind: VideoKind, subject: VideoSubject, week: number, season: number, variant = 0) {
  const kindSet = T[kind];
  let list = kindSet.any;
  let slots: Record<string, string | number> = { wk: week, season };
  if (subject.player) {
    list = kindSet.player;
    const p = subject.player;
    slots = { ...slots, s: p.last, sf: p.name, tc: p.teamCity, tf: p.teamNick };
  } else if (subject.team) {
    list = kindSet.team;
    const t = subject.team;
    slots = { ...slots, s: t.nick, sf: `${t.city} ${t.nick}`, tc: t.city, tf: t.nick };
  } else if (subject.coach) {
    list = kindSet.coach;
    slots = { ...slots, coach: subject.coach, s: subject.coach, sf: subject.coach };
  }
  const rng = makeRng(`${kind}|${week}|${season}|${variant}`);
  const tpl = list[(rng.int(0, list.length - 1) + variant) % list.length];
  return { headline: fill(tpl.h, slots), blurb: fill(tpl.b, slots) };
}
