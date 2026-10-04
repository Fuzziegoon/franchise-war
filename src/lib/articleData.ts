/**
 * Paragraph banks that turn a short story into a full article.
 * need: tags the subject must have (same tags as storyData). "any" = always eligible.
 * Slots: player slots + team slots from storyData, plus {rank} {form} {wk} {season}.
 * League stories: {topt} {topr} {coldt} {coldr} {starp} {startm} {starovr} {rivalry}.
 * Game stories: {w} {l} {wf} {lf} {ws} {ls} {margin} {wrec} {lrec} {star} {wcoach} {lcoach} {wk}.
 * Wording rule: reporter voice only. No direct quotes from real players.
 */
export interface Para { need: string; t: string }
const P = (need: string, t: string): Para => ({ need, t });

export const P_CONTEXT: Para[] = [
  P('any', '{p} is a {age}-year-old {pos} rated {ovr} overall, which makes him {rank} on the {tf} roster. {form}'),
  P('injured', 'The big question is health. {p} is dealing with {inj}, and the {t} have not committed to a timeline. In a league this tight, even a short absence at {pos} can swing a division race.'),
  P('healthy', 'The good news is that {p} is healthy and going through practice without limits. For a {pos} rated {ovr}, that is the best update a {tc} fan can get.'),
  P('star', 'Players rated {ovr} do not come around often. {p} is the kind of {pos} opposing coaches build an entire game plan around, and the {t} know exactly what they have.'),
  P('rookie', 'At just {age}, {p} is still learning the speed of the league, but the {t} like the ceiling and the work ethic they have seen so far.'),
  P('vet', 'Experience matters, and {p} has plenty of it. At {age}, the mental side of the game is as big a part of his value as athleticism, and the {t} locker room leans on it.'),
  P('ancient', 'Not many players are still doing this at {age}. {p} has outlasted most of his draft class, and the {t} are happy to keep reaping the benefits.'),
  P('payday', 'On the business side, {p} is on a deal that looks small next to his rating. That math tends to lead to a long negotiation, and the {t} front office knows the clock is ticking.'),
  P('paid', 'With a contract this size, the expectations are sky high. Every snap gets measured against the number, and {p} knows it.'),
  P('qb', 'The {t} offense runs through {p}. When the quarterback is right, everything else follows, and when he is not, the whole building feels it.'),
  P('mate', 'He is not alone, either. With {p2} alongside him, the {t} have more than one reason to feel good about the roster.'),
  P('wr', 'Receivers live and die on timing, and {p} has the kind of chemistry with the {t} offense that you cannot manufacture.'),
  P('dl', 'Pressure up front changes everything, and {p} is a big part of why the {t} defense can dictate terms.'),
  P('db', 'Coverage players rarely get the credit, but offensive coordinators see the tape. Nobody wants to throw {p}’s way.'),
  P('st', 'Special teams rarely make headlines until a kick decides a game. When that happens, everybody remembers the name.'),
];

export const P_OUTLOOK: Record<string, Para[]> = {
  contract: [
    P('any', 'Nothing is official, and both sides are expected to keep talks quiet. But the longer a player like {p} waits, the higher the price tends to climb. Expect this story to follow the {t} all season.'),
    P('any', 'The {t} have options: extend now, wait and see, or let the market decide. Each path has risks, and none of them are cheap. League executives are watching closely.'),
  ],
  health: [
    P('any', 'Expect updates from the {t} later this week. Until then, fans in {tc} will be checking the injury report more often than they will admit.'),
    P('injured', 'If {p} misses time, the {t} will lean on depth, and depth is only as good as the last practice. Watch how {coach} handles the next few games.'),
  ],
  star: [
    P('any', 'The question now is whether anyone can slow {p} down. So far, the answer around the league has been no, and the {t} are happy to keep it that way.'),
    P('any', 'If {p} keeps this up, the awards conversation writes itself. It is early, but the {tc} faithful are starting to dream.'),
  ],
  rookie: [
    P('any', 'Rookies rarely get a smooth ride, but {p} has given the {t} reasons to be patient and reasons to be excited. The learning curve will keep coming, and so will the highlights.'),
  ],
  veteran: [
    P('any', 'How long can {p} keep it going? Nobody around the {t} seems worried. They are taking it one week at a time and enjoying the ride.'),
  ],
  outlook: [
    P('any', 'For the {t}, the next few weeks will say a lot. {p} is a major piece of the puzzle, and what he does next is worth watching.'),
  ],
  default: [
    P('any', 'It is only one chapter of a long season, but for {p} and the {t}, it is a chapter worth reading. Stay tuned.'),
  ],
};

export const T_CONTEXT: Para[] = [
  P('any', '{form} Every game from here carries weight, and the {t} know it.'),
  P('any', 'The roster is led by {star}, who is the best player on the team, with {qb} under center. The talent is there. The question is how much of it shows up every Sunday.'),
  P('coach', '{coach} is calling the shots, and every move gets extra attention. When your coach is also one of the faces of the series, the spotlight never goes away.'),
  P('rivalry', 'There is also the {coach} versus {rival} storyline hanging over everything. The {t} and {rivalt} have a lot of bragging rights on the line, and neither side is about to go quietly.'),
  P('hot', 'Confidence is high in {tc}. When a team starts winning, the players start believing, and belief is a powerful thing in a locker room.'),
  P('cold', 'The mood in {tc} is a lot different. Losses pile up quickly, patience gets thinner, and every question at a press conference starts to sound the same.'),
  P('top', 'For now, the {t} are the team to beat in their division. Every opponent gets their best shot when they lead the pack.'),
  P('winless', 'No wins yet, and the calendar is not slowing down. The {t} need a result soon before a rough start turns into a rough season.'),
];

export const T_OUTLOOK: Para[] = [
  P('any', 'The next few weeks will show whether the {t} are for real. Keep an eye on {star} and the {t} defense, who will decide how this plays out.'),
  P('any', 'What happens next is the whole story. If {qb} and the offense find a rhythm, the {t} are dangerous. If not, expect plenty of questions.'),
  P('coach', 'Whatever happens, {coach} will have an answer ready, even if the fans at home do not always agree with it.'),
];

export const L_CONTEXT: Para[] = [
  P('any', 'Around the league, {topt} lead the way at {topr}, while {coldt} are still searching for answers at {coldr}.'),
  P('any', 'On the player side, {starp} of the {startm} remains the best in the league at {starovr} overall. Everybody else is chasing him.'),
  P('any', '{rivalry}'),
  P('any', 'Every week brings new storylines, and this one is no different. A few results can change the picture fast, and teams on the bubble know it.'),
];

export const L_OUTLOOK: Para[] = [
  P('any', 'That is the picture heading into the next stretch. Check back for more as the games get logged and the standings shift.'),
  P('any', 'If recent weeks have taught us anything, it is to expect the unexpected. We will be here when it happens.'),
];

export const G_CONTEXT: Para[] = [
  P('any', 'The {wf} beat the {lf}, {ws}-{ls}, a {margin}-point margin in Week {wk}. The {w} improve to {wrec}, and the {l} fall to {lrec}.'),
  P('any', '{star} made the biggest plays for the {w}, and the {wf} did enough on both sides of the ball to take the win.'),
  P('close', 'It was a nail-biter. Neither side led by much, and the result was not decided until the late stages. A play here or there and this finishes the other way.'),
  P('blowout', 'This one got away early. The {w} controlled the game from the opening stretch, and the {l} never found a way back in.'),
  P('upset', 'It was a surprise on paper. The {l} came in with the better roster, but the {w} played the better game, and that is all that counts.'),
  P('shutout', 'The {w} defense was dominant. The {l} never got on the board, and the shutout will be talked about all week.'),
  P('h2h', 'And for the rivalry, it matters. {wcoach} takes the head-to-head over {lcoach}, and the bragging rights go with it.'),
];

export const G_OUTLOOK: Para[] = [
  P('any', 'Both teams will have a short turnaround to get ready for what is next. The {w} want to keep the momentum, and the {l} have a lot to clean up.'),
  P('h2h', 'These two will meet again. {lcoach} will have the rematch circled on the calendar, and {wcoach} knows it.'),
];
