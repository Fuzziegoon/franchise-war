/**
 * Story + Twatter template bank.
 *
 * who:  P player · T team · C a team with a human coach · L league-wide · G game recap · R coach-vs-coach game
 * need: tags the subject must have, joined with "+" (e.g. "star+qb"). "any" = no requirement.
 *   Player tags: injured, healthy, star(90+), good(80+), rookie(<=22), young(<=24), vet(>=31), ancient(>=34),
 *                payday (good player on a small deal / big young talent), paid (big contract),
 *                qb, rb, wr, te, ol, dl, lb, db, st, mate (has a teammate for {p2})
 *   Team tags:   hot (2+ wins in a row), cold (2+ losses in a row), top (leads division), winless, coach, cpu
 *   Game tags:   blowout, close, upset, shutout, h2h
 *   Coach tags:  rivalry (another human coach exists, so {rival} is a real person)
 * wk:   optional [min, max] week range (0 = preseason, 1 = week 1 ...). Omit for any week.
 *
 * Slots (only these are allowed; stories.test.ts checks every template):
 *   P: {p} {pf} {pl} {pos} {age} {ovr} {inj} {p2} {t} {tc} {tf} {coach} {qb} {star}
 *   T/C: {t} {tc} {tf} {coach} {qb} {star} {rival} {rivalt} {rec}
 *   L: {wk} {season}
 *   G/R: {w} {l} {wc} {lc} {wf} {lf} {ws} {ls} {wcoach} {lcoach} {margin} {wk} {star}
 *
 * Wording rule: reporter-voice and "sources say" only. No invented direct quotes from real players.
 */

export type Who = 'P' | 'T' | 'C' | 'L' | 'G' | 'R';

export interface NewsTpl {
  who: Who;
  need: string;
  h: string;
  b: string;
  wk?: [number, number];
  cat: string;
}
export interface TweetTpl {
  who: Who;
  need: string;
  t: string;
  wk?: [number, number];
  cat: string;
}

const N = (cat: string, who: Who, need: string, h: string, b: string, wk?: [number, number]): NewsTpl => ({ cat, who, need, h, b, wk });
const W = (cat: string, who: Who, need: string, t: string, wk?: [number, number]): TweetTpl => ({ cat, who, need, t, wk });

const EARLY: [number, number] = [0, 2];
const LATE: [number, number] = [10, 18];
const PLAYOFFS: [number, number] = [19, 23];

export const NEWS: NewsTpl[] = [
  // ---------------------------------------------------------------- contracts
  N('contract', 'P', 'payday', '{p} eyeing a big payday as {tc} contract talks loom',
    'The {pos} has been one of the most valuable pieces on the {tf} roster, and a new deal is the talk of the {tc} locker room. Sources say both sides want to get something done, but nobody expects it to be cheap.'),
  N('contract', 'P', 'payday+young', 'Rising star {p} is about to get very expensive for {tc}',
    'At {age}, {p} is playing well above his current deal, and the {t} front office knows the clock is ticking. Around the league, executives are already wondering how high the number will climb.'),
  N('contract', 'P', 'payday+qb', '{p} extension talk heats up: what is a franchise QB worth in {tc}?',
    'The {t} have a quarterback playing like a building block, and the whispers about a record-setting extension are getting louder. If {tc} wait too long, the price only goes one direction.'),
  N('contract', 'P', 'paid', '{p} is earning that money, and {tc} fans are noticing',
    'With one of the bigger deals on the {t} books, {p} came into the season with plenty to prove. Early reviews around the league: so far, the {pos} looks worth every dollar.', [1, 18]),
  N('contract', 'P', 'paid+ancient', 'Is it time? {tc} weigh the cost of keeping {p}',
    'At {age}, {p} is still producing, but his number on the {t} salary sheet keeps getting harder to ignore. Insiders say the front office is keeping every option open.'),
  N('contract', 'P', 'payday+wr', 'Receivers around the league are watching the {p} contract situation',
    'A new deal for {p} would reset the market for {pos}s, and agents everywhere are paying attention. The {t} would like to keep him around, but the price tag will decide how this story ends.'),
  N('contract', 'P', 'payday+dl', '{p} could be the next big-money pass rusher',
    'The {t} lineman has been wrecking game plans, and the contract chatter is picking up. A long-term deal would lock down the front for years, if {tc} can find the cap room.'),
  N('contract', 'P', 'payday+db', 'Lockdown talent {p} looking for a lockdown contract',
    'There is no shortage of teams who would love a corner or safety like {p}, and the {t} know it. Expect talks to be a hot topic as the season goes on.'),
  N('contract', 'P', 'payday+ol', 'Pay the man: {tc} told to lock up {p} before the market explodes',
    'Good offensive linemen do not grow on trees, and {p} is one of the best the {t} have. The smart money says an extension is coming. The question is how much.'),
  N('contract', 'P', 'payday+te', '{p} deserves more, say {tc} insiders',
    'The {t} tight end has quietly become a go-to option, and the contract he is playing under no longer reflects it. One more big week could force the front office to act.'),
  N('contract', 'P', 'payday+rb', 'Running back market: where does {p} land?',
    'It is a tough business for backs, but {p} has earned the right to ask for a raise. The {t} will have to decide how much a workhorse is worth these days.'),
  N('contract', 'P', 'good+vet', '{p} wants one more big contract, and nobody can blame him',
    'At {age}, {p} knows this could be the last real payday. The {t} veteran has still got it, and teams with cap space are already circling.'),
  N('contract', 'P', 'good+mate', '{p} and {p2} give {tc} a cap headache',
    'Both players are in line for big raises, and the {t} cannot keep everybody. Insiders say one of them might end up being the odd man out.'),

  // ---------------------------------------------------------------- health
  N('health', 'P', 'injured', '{p} dealing with {inj}, {tc} hoping for good news',
    'The {t} {pos} is working through a {inj} and the team is taking it day by day. Depth behind him is about to get tested.'),
  N('health', 'P', 'injured+good', 'Big blow for {tc}: {p} sidelined with {inj}',
    'Losing a player like {p} hurts, and the {t} will need somebody to step up in his absence. The medical staff says nothing is set in stone on a timeline.'),
  N('health', 'P', 'injured+star', 'Star watch: {p} working his way back from {inj}',
    'Everyone around the {t} knows how much {p} means to this team. His progress is the biggest storyline in {tc} right now.'),
  N('health', 'P', 'injured+qb', 'Quarterback injury report: {p} and the {inj}',
    'When your QB is hurt, everything changes. The {t} are bracing for a few different scenarios while {p} works with the training staff.'),
  N('health', 'P', 'healthy+star', '{p} fully healthy and ready to roll for {tc}',
    'The {t} got some great news this week: their best player is feeling good and looks ready to dominate. Opponents should be nervous.', EARLY),
  N('health', 'P', 'healthy+vet+good', '{p} reportedly feels great heading into the season',
    'At {age}, {p} has been careful about how he handles the offseason, and it looks like it paid off. The {t} are counting on him to anchor the {pos} group.', EARLY),
  N('health', 'P', 'injured+vet', 'Age and injuries: how long can {p} keep going?',
    'The {t} veteran has dealt with {inj} before, and the questions are starting up again. {tc} insiders say there is no panic yet.'),
  N('health', 'P', 'injured+young', 'Tough break for young {pos} {p}: {inj} slows his season',
    'The {t} thought they had a rising star, and now they will have to wait a bit longer to see him at full speed. The team says he is determined to get back.'),

  // ---------------------------------------------------------------- Super Bowl / outlook
  N('outlook', 'P', 'star', '{p} has one goal in mind: the Super Bowl',
    'Nobody around {tc} is hiding it. With {p} leading the way, the {t} believe this is the year. The only thing standing between them and a title is the rest of the league.', EARLY),
  N('outlook', 'P', 'star+qb', '{p} has the {t} dreaming of a championship',
    'When your quarterback is rated like {p}, expectations follow. {tc} fans are circling February on the calendar.', EARLY),
  N('outlook', 'T', 'any', '{tc} keeps eyes on the prize: a trip to the Super Bowl',
    'It is early, but the {t} are talking like contenders. The roster has talent, the coaching staff has a plan, and the fans are ready.', EARLY),
  N('outlook', 'T', 'top', 'The {t} are in control of the division, and they know it',
    'A strong start has put {tc} at the top of the standings. The challenge now is staying there when the schedule toughens up.', [3, 18]),
  N('outlook', 'T', 'hot', 'Win streak has {tc} believing: the {t} are for real',
    'Another win, another step toward the playoffs. The {t} are playing with confidence and the locker room is loving it. Record: {rec}.', [3, 18]),
  N('outlook', 'T', 'cold', 'Slump alert: the {t} are searching for answers',
    'The losses are piling up, and the heat is getting turned up in {tc}. Something needs to change, and fast. Record: {rec}.', [3, 18]),
  N('outlook', 'T', 'winless', 'Still waiting on win number one in {tc}',
    'The {t} are 0-for-the-season so far, and patience is wearing thin. A win would do a world of good for a team that needs it.', [3, 18]),
  N('outlook', 'L', 'any', 'League preview: who is built for a Super Bowl run?',
    'A handful of teams look like real contenders, and a handful more are hoping to sneak in. With the season about to heat up, everybody believes in their shot.', [0, 1]),
  N('outlook', 'L', 'any', 'Week {wk} preview: five storylines worth watching',
    'From quarterback battles to coaching rivalries, there is no shortage of drama around the league this week. The battle for the top of each division is just getting started.', [1, 18]),
  N('outlook', 'L', 'any', 'Playoff picture: who is in, who is out, who is sweating?',
    'The race for the postseason is heating up, and every game matters now. Teams on the bubble are running out of chances.', LATE),
  N('outlook', 'L', 'any', 'Super Bowl chase: the field is down to the finalists',
    'Everything the league did all year comes down to this stretch. One game at a time, one team will walk away with the trophy.', PLAYOFFS),
  N('outlook', 'T', 'any', '{tc} fans have a message for the rest of the league: we are coming',
    'The {t} faithful have been fired up since the preseason. Expect a loud crowd and a team with something to prove.', EARLY),

  // ---------------------------------------------------------------- rookies / young
  N('rookie', 'P', 'rookie+good', 'Rookie {p} is turning heads in {tc}',
    'The {t} rookie {pos} has been one of the pleasant surprises of the early going. Coaches are already finding ways to get him on the field more.'),
  N('rookie', 'P', 'rookie', 'Rookie report: {p} learning the ropes with the {t}',
    'The first-year {pos} is reportedly adjusting to the speed of the pro game and is picking things up quickly. The coaching staff likes what it sees so far.', EARLY),
  N('rookie', 'P', 'young+star', '{p} is already one of the best in the game, and he is just {age}',
    'The {t} have a franchise cornerstone on their hands. If the early returns hold up, the sky is the limit for {p}.'),
  N('rookie', 'P', 'young+good+mate', '{p} and {p2} could be the {t} core for a decade',
    'Two young talents with huge upside, and the {t} intend to build around both. The future in {tc} looks bright.'),
  N('rookie', 'P', 'rookie+qb', 'Rookie QB {p} gets his chance in {tc}',
    'Every young quarterback goes through growing pains, and {p} is no exception. The {t} are being patient, and the fan base is already invested.'),
  N('rookie', 'P', 'young+db', '{p} is shutting down receivers early for {tc}',
    'The {t} defensive back has been all over the field. Opposing quarterbacks have noticed.', [1, 18]),
  N('rookie', 'P', 'young+dl', 'Young pass rusher {p} is a problem for offensive lines',
    'The {t} knew they had a talent. They might not have known he would be this disruptive this quickly.', [1, 18]),
  N('rookie', 'P', 'rookie+wr', 'Rookie wideout {p} is the {t} newest favorite target',
    'Quick feet, strong hands, and a growing connection with the quarterback. The {t} offense is finding new life.', [1, 18]),

  // ---------------------------------------------------------------- veterans
  N('veteran', 'P', 'ancient+good', 'Father Time? Not yet: {p} still going strong at {age}',
    'The {t} veteran keeps defying expectations, and {tc} is happy to keep riding with him. Nobody expects him to slow down anytime soon.'),
  N('veteran', 'P', 'vet+star', 'Veteran leader {p} sets the tone in the {t} locker room',
    'He has done it all, and the younger players on the {t} look up to him. {tc} fans hope there are plenty of good years left.'),
  N('veteran', 'P', 'vet+qb+good', 'Wily veteran {p} has the {t} offense humming',
    'At {age}, he is not the fastest guy on the field, but he is almost always the smartest. {tc} is getting steady play at the most important position.'),
  N('veteran', 'P', 'vet+ol', '{p} anchors the {t} line with years of experience',
    'The offensive line is the heart of any good offense, and {p} is the heart of this one. The rest of the group follows his lead.'),
  N('veteran', 'P', 'ancient', 'Retirement watch: {p} keeps the question open',
    'At {age}, nobody would blame {p} for wrapping things up soon, but the {t} are hoping he decides to keep going. {tc} could use every bit of that experience.'),
  N('veteran', 'P', 'vet+st', '{p} has been a rock for the {t} special teams',
    'The kicking game does not get much attention until it matters, and {p} has made sure it never has to worry {tc}.'),

  // ---------------------------------------------------------------- quarterbacks / stars
  N('star', 'P', 'qb+good', 'Quarterback spotlight: how good is {p} really?',
    'The {t} signal-caller is putting up numbers that have fans and analysts talking. {tc} believes the best is still ahead.'),
  N('star', 'P', 'star+wr', '{p} is the most dangerous receiver in the league, says nobody who plays {tc}',
    'Defensive coordinators spend all week thinking about him, and it still might not be enough. {p} is making a habit of turning the ordinary into highlights.'),
  N('star', 'P', 'star+dl', 'Offensive linemen fear one name: {p}',
    'The {t} defender keeps living in opposing backfields. It has become a weekly tradition.'),
  N('star', 'P', 'star+db', 'Throw at your own risk: {p} is making life miserable for {tc} opponents',
    'The {t} secondary is led by a player who treats every route like it belongs to him. Quarterbacks are learning to look the other way.'),
  N('star', 'P', 'star+rb', '{p} is a one-man highlight reel for the {t}',
    'Whenever the {t} need yards, they know where to look. {p} is making the case that he is the best back in the game.'),
  N('star', 'P', 'star+te', 'Mismatch machine: {p} keeps defenses guessing',
    'Too big for the defensive backs, too fast for the linebackers, and the {t} know exactly how to use him.'),
  N('star', 'P', 'star+lb', '{p} is the heartbeat of the {t} defense',
    'Wherever the ball goes, {p} seems to be there. The {t} defense is built around his ability to find it.'),
  N('star', 'P', 'star+ol', 'Quarterbacks love him: {p} keeps the {t} pocket clean',
    'There are few players who change the way an offense operates like a great tackle. {p} is one of them.'),

  // ---------------------------------------------------------------- coaches & rivalry
  N('coach', 'C', 'coach', 'Coach {coach} has the {t} focused on the long game',
    'The {tc} head coach says the team is taking things one week at a time, but the roster tells a bigger story. {star} and company have the talent. Now it is about putting it together.', EARLY),
  N('coach', 'C', 'coach+rivalry', 'Coach {coach} has {rival} on the radar',
    'It is not hard to see where this is going. The {t} head coach is well aware of {rival} and the {rivalt}, and the rivalry is the best story in the league.'),
  N('coach', 'C', 'coach+hot', 'Coach {coach} rides the hot hand as the {t} keep winning',
    'The {t} are rolling at {rec}. The head coach says the credit belongs to the players, but the fans know who is calling the shots.', [3, 18]),
  N('coach', 'C', 'coach+cold', 'Pressure on coach {coach} as the {t} stumble',
    'The {t} are {rec} and the questions are getting louder. The head coach says he is not worried, but the schedule does not get any easier.', [3, 18]),
  N('coach', 'C', 'coach+rivalry', 'Inside the {t} war room with coach {coach}',
    'The {t} head coach has been burning the midnight oil with {star} and {qb} on the whiteboard. Sources say he likes where the roster is, and he likes it even more when {rival} is on the schedule.', EARLY),
  N('coach', 'L', 'any', 'The coaching rivalry everyone is talking about',
    'The best coaches in the league are matching wits every week, and fans cannot get enough. Bragging rights are on the line every time.'),

  // ---------------------------------------------------------------- team notes
  N('team', 'T', 'cpu', 'Quiet confidence in {tc} as the {t} get ready for the season',
    'The {t} do not make a lot of noise, but they have the talent to make some. Keep an eye on {star} and the {t} offense.', EARLY),
  N('team', 'T', 'any', 'Depth chart battles heat up in {tc}',
    'Several roles are still up for grabs on the {t} roster, and coaches say there is real competition in practice. That is a good problem to have.', EARLY),
  N('team', 'T', 'any', 'Who is the {t} MVP so far? It is not a hard question',
    'Ask around {tc} and you will hear the same name over and over: {star}. The team goes as he goes.', [2, 18]),
  N('team', 'T', 'any', '{tc} front office stays busy as the season rolls on',
    'Cap space, roster spots and a few big decisions are on the table for the {t}. Insiders say to expect movement.', [1, 18]),
  N('team', 'T', 'any', 'The {t} are hoping {qb} can lead them where they want to go',
    'Everything starts at quarterback, and {qb} has the {t} faithful excited about what is possible this year.', EARLY),

  // ---------------------------------------------------------------- league notes
  N('league', 'L', 'any', 'Around the league: the quiet storylines you might have missed',
    'Not every story makes the highlight reel. A few of the most interesting developments of the week are happening away from the spotlight.'),
  N('league', 'L', 'any', 'Preseason power rankings: who is on top?',
    'The experts do not agree on much, but they agree on this: it is going to be a wild year. Fans are ready for football.', [0, 1]),
  N('league', 'L', 'any', 'Fantasy football watch: players to target this week',
    'Whether you are looking for a breakout or a safe play, there are plenty of names to consider. As always, injuries could change everything.', [1, 18]),
  N('league', 'L', 'any', 'Trade rumors: what the league is buzzing about',
    'Nothing is official, but the phones are busy around the league. Contenders are looking to add, and rebuilders are listening.', [2, 12]),
  N('league', 'L', 'any', 'Midseason awards: our early picks for MVP and more',
    'It is too early to hand out hardware, but that is never stopped anyone from guessing. The race for MVP has a few clear frontrunners.', [6, 12]),
  N('league', 'L', 'any', 'Draft class buzz: scouts are already circling the top prospects',
    'It might be a long way off, but scouts are already hard at work. Teams out of contention are paying close attention.', [8, 18]),

  // ---------------------------------------------------------------- bonus pack
  N('contract', 'P', 'payday+wr', '{p} wants to be paid like a WR1, and {tc} is listening',
    'The {t} receiver has been quietly making a case at the negotiating table all year. League sources expect talks to pick up as soon as the schedule allows.'),
  N('contract', 'P', 'payday+rb', 'Running back market: how much is {p} worth to {tc}?',
    'The {t} have a back who produces more than his deal suggests, and the league has changed how it pays the position. Both sides know a decision is coming.'),
  N('contract', 'P', 'payday+dl', '{p} could be next in line for a monster {pos} deal',
    'Pass rushers get paid, and {p} is playing like one of the best on the {tf} defense. A new contract would reset how {tc} builds the rest of the roster.'),
  N('contract', 'P', 'payday+db', 'Lockdown {pos} {p} is looking forward to a payday',
    'The {t} secondary leans on {p}, and everyone in the building understands what that is worth on the open market.'),
  N('contract', 'P', 'payday+ol', '{tc} line anchor {p} is up for a raise',
    'Protecting the passer is expensive, and {p} has done it well enough that the {t} cannot let him get anywhere near free agency.'),
  N('contract', 'P', 'payday+vet', 'Veteran {p} wants one more big contract',
    'At {age}, the {t} {pos} knows this may be his last real chance to cash in, and he is playing like it.'),
  N('contract', 'P', 'paid+qb', 'Is {p} worth every penny? {tc} fans are split',
    'The {t} handed {p} a huge deal, and the debate has not slowed down. Winning will settle it faster than any column.'),
  N('contract', 'P', 'paid+star', 'Superstar {p} is making superstar money and playing like it',
    'With a deal this big, every snap gets a microscope. So far {p} has made {tf} fans feel pretty good about the investment.'),
  N('health', 'P', 'healthy+vet', '{p} reportedly feels great heading into the year',
    'After a long offseason of work, the {t} {pos} is reportedly moving better than he has in a while. {tc} would love a full season out of him.', [0, 3]),
  N('health', 'P', 'healthy+star', 'Fully healthy {p} is ready to roll for the {tf}',
    'There are no injury designations on the {t} star heading into this one, and that is good news for everyone except the opposing defense.', [0, 3]),
  N('health', 'P', 'healthy+rookie', 'Rookie {p} is past the nerves and ready to play',
    'The {t} first-year {pos} has been practicing without limits and the staff is eager to see what he does in a real game.', [0, 3]),
  N('health', 'P', 'injured+star', 'Bad news for {tc}: {p} is dealing with {inj}',
    'The {t} can ill afford to lose a player of this caliber. The next few days of tests will tell the story.'),
  N('health', 'P', 'injured+qb', '{tc} holding their breath on {p} and his {inj}',
    'Everything for the {t} offense runs through the quarterback, and a backup is suddenly a very real conversation.'),
  N('health', 'P', 'injured+vet', '{p}, {age}, battling back from {inj}',
    'The {t} veteran has been through this before, but the calendar never gets any easier to beat.'),
  N('health', 'P', 'injured+rookie', 'Tough start for rookie {p}: {inj} slows the {tf}',
    'The {t} wanted to ease the {pos} in, but they did not expect a trainer’s room welcome. Expect a patient approach.'),
  N('star', 'P', 'star+qb+healthy', '{p} is the name on everyone’s MVP list',
    'A healthy {p} at {ovr} overall is the kind of quarterback who changes what the {t} can be. The rest of the league is watching.', [0, 12]),
  N('star', 'P', 'star+wr', '{p} might be the most unguardable {pos} in the league',
    'At {ovr} overall, {p} makes {tc} fans feel like every pass is a possible touchdown. Defensive coordinators are losing sleep.'),
  N('star', 'P', 'star+dl', 'Offensive linemen are dreading another date with {p}',
    'The {t} defender has been a game-wrecker, and the league knows it. Expect a lot of extra blockers in his direction.'),
  N('star', 'P', 'star+db', 'Nobody wants to throw at {p}',
    'The {t} defensive back is playing at an elite level, and quarterbacks are quietly looking away.'),
  N('star', 'P', 'good+te', '{p} is quietly becoming a matchup nightmare',
    'The {t} tight end is too big for defensive backs and too fast for linebackers. {tc} are leaning into it.'),
  N('rookie', 'P', 'rookie+qb', 'Rookie QB {p} has {tc} dreaming big',
    'The {t} invested heavily in the position and the early returns have been good. The learning curve is steep, but the arm talent is obvious.'),
  N('rookie', 'P', 'rookie+good', 'Rookie {p} is already one of the {tf} best',
    'At {ovr} overall, the first-year {pos} is not waiting for an invitation. {tc} fans have a new favorite.'),
  N('veteran', 'P', 'ancient', 'Age is just a number for {p}, {age}',
    'The {t} {pos} keeps showing up and keeps producing. He has already outlasted most of his draft class.'),
  N('outlook', 'T', 'hot', 'The {tf} are rolling: how long can it last?',
    'A few wins in a row have {tc} thinking big. The schedule gets tougher, but the confidence is real.'),
  N('outlook', 'T', 'cold', 'Pressure is building in {tc} after another loss',
    'Two losses in a row is how rumors start. The {t} need to find an answer quickly.'),
  N('outlook', 'T', 'top', 'The {tf} are atop the division and everyone is chasing',
    'The standings do not lie, and for now {tc} are the team to beat. The rest of the division will get their shots.', [3, 18]),
  N('outlook', 'T', 'winless', 'No wins yet for {tc}: what is going wrong?',
    'The {t} are still looking for that first victory. Fans are patient, but not forever.', [3, 18]),
  N('outlook', 'T', 'any', 'Super Bowl or bust? {tc} thinks this is their year',
    'The {t} have the roster, the coach and the confidence to make a deep run. Around the league, more than a few voices agree.', [0, 8]),
  N('outlook', 'T', 'any', 'Sleeper alert: could the {tf} surprise people?',
    'Nobody is talking about {tc}, and that might be exactly how they want it. The {t} have more talent than the preseason chatter suggests.', [0, 5]),
  N('coach', 'C', 'rivalry', '{coach} vs. {rival}: the coach rivalry nobody asked for, but everyone wants',
    'The {t} and {rivalt} are led by two coaches who love to talk. Neither of them is going to lose the bragging rights quietly.'),
  N('coach', 'C', 'any', '{coach} says the {tf} are built for a title run',
    'Everything about the {t} points toward a big season, if the coach is to be believed. {rec} so far says the plan is working.', [1, 18]),
  N('league', 'L', 'any', 'Week {wk} preview: ten things to watch around the league',
    'A fresh slate, a lot of questions and plenty of big matchups. We break down what matters most in Week {wk} of season {season}.', [1, 18]),
  N('league', 'L', 'any', 'Super Bowl favorites in season {season}: our early rankings',
    'The usual suspects are there, but a few surprises could make some noise before the playoffs.', [0, 6]),
  N('league', 'L', 'any', 'Fantasy football heads up: breakout candidates for Week {wk}',
    'Know a bargain when you see one. These players could be the difference in your league this week.', [1, 18]),
];

// Game recap news (G = any logged game, R = both coaches human)
export const RECAPS: NewsTpl[] = [
  N('recap', 'G', 'blowout', '{w} roll {l}, {ws}-{ls}, in a statement win',
    'It was never close. {wf} controlled the game from the start and {star} was the headline. {lf} will want to forget this one.'),
  N('recap', 'G', 'close', '{w} survive {l} in a {ws}-{ls} nail-biter',
    'It came down to the final moments, and {wf} made just enough plays to win. {lf} will be left wondering what might have been.'),
  N('recap', 'G', 'upset', 'Upset alert: {w} take down {l}, {ws}-{ls}',
    'On paper, it was not supposed to go this way. {wf} did not care about the rankings and got the win, with {star} leading the charge.'),
  N('recap', 'G', 'shutout', '{w} shut out {l} {ws}-{ls}',
    'The {wf} defense was perfect. {lf} never found a rhythm and never found the end zone.'),
  N('recap', 'G', 'any', 'Week {wk} recap: {w} beat {l}, {ws}-{ls}',
    'The {wf} got the job done at home and on the road alike. {star} had a big hand in it, and {lf} head back to the drawing board.'),
  N('recap', 'R', 'h2h+close', 'Coach {wcoach} edges Coach {lcoach} in a coach-war classic, {ws}-{ls}',
    'This one had everything. When it was over, {wcoach} got the bragging rights and {lcoach} got a long list of what-ifs. The rivalry just got hotter.'),
  N('recap', 'R', 'h2h+blowout', 'Coach {wcoach} dominates Coach {lcoach}: {w} win {ws}-{ls}',
    'There was no doubt about this one. {wcoach} had the {wf} ready from the opening snap, and {lcoach} will be hearing about it for weeks.'),
  N('recap', 'R', 'h2h', 'Coach War: {wcoach} and the {w} top {lcoach} and the {l}, {ws}-{ls}',
    'The war between coaches continues, and today it belongs to {wcoach}. {star} was a major factor, and the rematch cannot come soon enough.'),
];

// ------------------------------------------------------------------------------------------------ Twatter
export const TWEETS: TweetTpl[] = [
  // contracts
  W('contract', 'P', 'payday', 'Somebody call the {t} front office. {p} needs a new deal and he needs it yesterday.'),
  W('contract', 'P', 'payday', 'Report: {tc} and {p} have not started talks yet. Wow. Pay the man.'),
  W('contract', 'P', 'payday+good', 'If {p} hits the open market, it is going to be absolute chaos.'),
  W('contract', 'P', 'paid', '{p} contract looking better and better every week. Money well spent, {tc}.', [1, 18]),
  W('contract', 'P', 'paid+vet', 'Is {p} still worth it at {age}? Asking for {tc} fans everywhere.'),
  W('contract', 'P', 'payday+young', 'The {t} lock up {p} long-term or they will regret it for years. Not a hot take.'),
  W('contract', 'P', 'payday+qb', 'Franchise QB money. That is all. That is the tweet. {p}.'),
  W('contract', 'P', 'good+mate', 'The {t} cannot pay both {p} and {p2}. Pick one. Cap space is a cruel mistress.'),
  W('contract', 'P', 'payday', 'Free agency is going to be wild if {p} actually gets there. Plenty of teams with space.'),
  W('contract', 'P', 'ancient', '{p} is {age} and still playing. Give him whatever he wants.'),

  // health
  W('health', 'P', 'injured', 'Sending good vibes to {p} as he deals with {inj}. Come back strong. #{t}'),
  W('health', 'P', 'injured+good', 'Not great, {tc}. {p} is dealing with {inj} and your depth is about to get tested.'),
  W('health', 'P', 'injured+star', 'The {t} season hinges on how fast {p} gets back. Everything else is noise.'),
  W('health', 'P', 'injured+qb', 'Injury report: {p}, {inj}. Please let the backup be good.'),
  W('health', 'P', 'healthy+star', '{p} is HEALTHY. The rest of the league should be nervous.', EARLY),
  W('health', 'P', 'healthy+vet+good', '{p} looking great heading into the season. {age} years young.', EARLY),
  W('health', 'P', 'injured+vet', 'Hate seeing it. {p} battling {inj} at {age}. Hoping for a quick recovery.'),
  W('health', 'P', 'healthy+good', 'Everybody healthy in {tc} heading into the year? That is rare. Enjoy it.', EARLY),

  // hype / outlook
  W('outlook', 'P', 'star', 'This is the year for {tc}. I said it. {p} said it. Do not @ me.', EARLY),
  W('outlook', 'P', 'star+qb', '{p} is a top-three QB and {tc} fans are going to be loud this season.'),
  W('outlook', 'T', 'any', 'Super Bowl or bust in {tc}? I feel like the answer is yes.', EARLY),
  W('outlook', 'T', 'top', 'The {t} are running the division. It is not even close. 😤', [3, 18]),
  W('outlook', 'T', 'hot', 'Winning streak in {tc}. Everybody is a genius when the {t} are rolling.', [3, 18]),
  W('outlook', 'T', 'cold', 'The {t} are not good right now. Prove me wrong.', [3, 18]),
  W('outlook', 'T', 'winless', 'Still no wins for the {t}. Pain is a feeling. Pain is a lifestyle.', [3, 18]),
  W('outlook', 'T', 'any', 'Ranking every team by vibes: {t} are in the top ten.', EARLY),
  W('outlook', 'T', 'any', 'Not saying the {t} are winning the Super Bowl but I am looking at flights.', EARLY),
  W('outlook', 'L', 'any', 'Week {wk} take: all of you are overreacting.', [1, 18]),
  W('outlook', 'L', 'any', 'Football season is back and nothing else matters.', [0, 1]),
  W('outlook', 'L', 'any', 'Playoff picture is a mess and I love every second of it.', LATE),
  W('outlook', 'L', 'any', 'Super Bowl week vibes. Nothing else exists.', PLAYOFFS),

  // players
  W('star', 'P', 'star', 'Just a quick reminder that {p} is the best {pos} in the league. Thank you.'),
  W('star', 'P', 'star+wr', '{p} is in a different tier. Nobody else gets open like that.'),
  W('star', 'P', 'star+dl', 'Offensive tackles seeing {p} on the schedule: 😬'),
  W('star', 'P', 'star+db', 'Do not throw at {p}. Please. For your own sake.'),
  W('star', 'P', 'star+rb', '{p} is going to make a defense look silly this season. Mark it.'),
  W('star', 'P', 'star+ol', 'The most underrated position is OL and the most underrated OL is {p}.'),
  W('star', 'P', 'star+te', 'Tight ends are cheat codes. {p} is the cheat code.'),
  W('star', 'P', 'star+lb', 'Wherever the ball is, {p} is there. How?'),
  W('star', 'P', 'good', 'Hot take: {p} is better than people give him credit for. {tc} knows it.'),
  W('star', 'P', 'good+qb', 'You can say what you want about the {t}, but {p} can play.'),
  W('star', 'P', 'good+te', '{p} is going to have a big year for {tc}. Writing it down.'),
  W('star', 'P', 'good+st', 'Never underestimate a great kicker. {p} for {tc} can win you games.'),
  W('star', 'P', 'good+ol', 'Shout out to {p} and the {t} line. Nobody talks about them enough.'),

  // rookies / vets
  W('rookie', 'P', 'rookie', 'Rookie {p} is going to be good. Mark my words. {tc} has a gem.'),
  W('rookie', 'P', 'rookie+good', '{p} is already good. As a ROOKIE. The {t} are stealing.'),
  W('rookie', 'P', 'rookie+qb', 'Rookie QBs are a roller coaster. {p} is about to give {tc} the ride of their lives.'),
  W('rookie', 'P', 'young+good', 'Just {age} and already great. {p} is going to be a problem for a decade.'),
  W('veteran', 'P', 'ancient+good', '{p} at {age} is still outplaying half the league. Respect.'),
  W('veteran', 'P', 'vet+qb', 'Experience matters. {p} still has it. The {t} offense is in good hands.'),
  W('veteran', 'P', 'vet+ol', 'Vets like {p} are why the {t} offense works. Quiet impact.'),
  W('veteran', 'P', 'ancient', 'Retirement watch: {p}. Please do not go. We are not ready.'),

  // coaches
  W('coach', 'C', 'coach', 'Coach {coach} has the {t} locked in. This team means business.', EARLY),
  W('coach', 'C', 'coach+rivalry', 'Honestly, {coach} vs {rival} is the best rivalry in football right now. Get the popcorn.'),
  W('coach', 'C', 'coach+hot+rivalry', '{coach} and the {t} are rolling. {rival} should be looking over their shoulder.', [3, 18]),
  W('coach', 'C', 'coach+cold', '{coach} is catching heat in {tc}. Rough stretch for the {t}.', [3, 18]),
  W('coach', 'C', 'coach', 'Does {coach} have the {t} as the top team in the league? Debate me.', [2, 18]),
  W('coach', 'C', 'coach', 'Coach {coach} is the most dangerous man in {tc} right now and it is not close.'),
  W('coach', 'C', 'coach+rivalry', 'The war is on. {coach} vs {rival}. May the best coach win.'),
  W('coach', 'C', 'coach', 'My favorite part of the week is seeing what {coach} does next with the {t}.'),

  // fan voices
  W('fan', 'L', 'any', 'Reminder: it is only week {wk}. Everybody calm down.', [1, 6]),
  W('fan', 'L', 'any', 'My team lost and I am in a bad mood. That is all.', [1, 18]),
  W('fan', 'L', 'any', 'The refs did it again. I have seen enough.', [1, 18]),
  W('fan', 'L', 'any', 'Who has the best fan base in the league? I will wait.'),
  W('fan', 'L', 'any', 'Offense wins games. Defense wins championships. Special teams wins nothing. Do not @ me.'),
  W('fan', 'L', 'any', 'Fantasy trade proposals this early in the week are criminal.', [1, 18]),
  W('fan', 'L', 'any', 'Football is a game of inches and I have none of them.'),
  W('fan', 'L', 'any', 'This is the year. This is the year. This is the year. (Said every fan, every year.)', EARLY),
  W('fan', 'L', 'any', 'Draft talk already? I cannot. I have not even finished this season.', LATE),
  W('fan', 'L', 'any', 'MVP race has three names and I am not allowed to say them all.', [6, 18]),
  W('fan', 'T', 'any', '{tc} Sunday vibes. Wear the colors. Make some noise.'),
  W('fan', 'T', 'any', 'The {t} fan base is the most loyal in the league. No exceptions.'),
  W('fan', 'T', 'any', 'I have been a {t} fan since birth and I have never been more nervous.'),
  W('fan', 'T', 'any', 'The {t} play like champions on Sunday. Do not mess it up now.', [1, 18]),
  W('fan', 'T', 'any', '{star} is the only reason I still watch the {t}. And honestly, he is plenty.'),
  W('fan', 'T', 'any', 'Starting {qb} again? Fine. Prove me wrong.'),
  W('fan', 'T', 'any', 'Imagine being a {t} fan this week. Cannot relate. Just kidding. Go {t}.'),

  // trade / rumor
  W('rumor', 'L', 'any', 'Hearing a trade could be coming soon. No names yet. Stay tuned.', [2, 12]),
  W('rumor', 'L', 'any', 'Sources: a contender is checking in on a big-name veteran. Details later.', [2, 12]),
  W('rumor', 'P', 'good', 'Trade chatter involving {p}? Probably nothing. Probably.', [2, 12]),
  W('rumor', 'P', 'star+vet', 'There is a rumor circling {p}. I will not say more. Stay tuned.', [2, 12]),

  // ---------------------------------------------------------------- hate mail (fans yelling at players; football-only, no personal attacks)
  W('hatemail', 'P', 'injured', 'Dear {p}: you are hurt AGAIN? My fantasy team has filed a formal complaint. Get healthy.'),
  W('hatemail', 'P', 'injured+star', '{p}. {inj}. In THIS economy. Sit down, rest up, and come back in one piece or do not come back at all (please come back).'),
  W('hatemail', 'P', 'injured+qb', 'To {p}: the {tc} offense without you is a sitcom. Heal up. We are begging.'),
  W('hatemail', 'P', 'paid', 'Hey {p}, for that contract I expect you to also drive me to the airport.'),
  W('hatemail', 'P', 'paid+star', '{p} making all that money and STILL cannot fix my Sunday blood pressure.'),
  W('hatemail', 'P', 'paid+qb', '{p}: I would like a refund on the whole season. Sincerely, every {tc} fan.'),
  W('hatemail', 'P', 'qb', 'Dear {p}, throw the ball to the people in {tc} jerseys. Love, a concerned citizen.'),
  W('hatemail', 'P', 'qb+vet', 'Respectfully {p}, the {tc} fans need you to stop doing the thing where you hold the ball for nine seconds.'),
  W('hatemail', 'P', 'rookie', 'Rookie {p}, welcome to the league, now please stop making me nervous.'),
  W('hatemail', 'P', 'rookie+qb', 'Rookie QB {p}, the {tc} fans have been patient. Emphasis on HAVE BEEN.'),
  W('hatemail', 'P', 'st', 'Dear {p}: it is a short kick. You have one job. ONE.'),
  W('hatemail', 'P', 'st', '{p} gave me a heart attack on that kick. Medical bills incoming.'),
  W('hatemail', 'P', 'wr', 'Dear {p}: catch the ball. Signed, a fan who watched a drop in slow motion for 20 minutes.'),
  W('hatemail', 'P', 'wr+star', '{p}, you are great. You are also the reason I am tired. Stop making me scream at my TV.'),
  W('hatemail', 'P', 'rb', '{p}, one yard. ONE yard. I could have walked it.'),
  W('hatemail', 'P', 'te', 'Hey {p}, a tight end who drops it is just a large wide receiver with a bad attitude. Fix it.'),
  W('hatemail', 'P', 'ol', 'Dear {p}: block somebody. Sincerely, a quarterback somewhere.'),
  W('hatemail', 'P', 'dl', '{p}, the quarterback was RIGHT THERE. Right there!'),
  W('hatemail', 'P', 'lb', 'Dear {p}: you can tackle people. I have seen it. Please do it more.'),
  W('hatemail', 'P', 'db', '{p}, that was your guy. He was YOUR guy.'),
  W('hatemail', 'P', 'ancient', '{p}, {age} years old and still ruining my week. Retire (do not retire).'),
  W('hatemail', 'P', 'vet', 'Hey {p}, I appreciate the career, but the 2-minute drill was a crime scene.'),
  W('hatemail', 'P', 'good', '{p}, you are so good that when you mess up I take it personally.'),
  W('hatemail', 'P', 'star', 'Dear {p}: please stop making every other {pos} look bad. It is rude.'),
  W('hatemail', 'P', 'payday', '{p}, if you want a big contract maybe do not play like that the week the {t} front office is watching. Just saying.'),

  // ---------------------------------------------------------------- hot takes (fictional fans and commentators)
  W('hottake', 'T', 'hot', 'HOT TAKE: the {tf} are not a fluke. They are a problem.'),
  W('hottake', 'T', 'cold', 'Hot take: the {tf} season is already over and everybody is too polite to say it.'),
  W('hottake', 'T', 'top', 'Hot take: the {tf} win this division by three games and nobody can stop them.'),
  W('hottake', 'T', 'winless', 'Hot take: the {tf} are going 0-17. Tell your mother.'),
  W('hottake', 'T', 'any', 'Unpopular opinion: the {tf} are better than their record and everybody knows it.'),
  W('hottake', 'T', 'any', 'Hot take: the {tf} are the most underrated team in the league and I will not be taking questions.'),
  W('hottake', 'T', 'any', 'Controversial: {coach} gets too much credit and {star} gets too little.'),
  W('hottake', 'T', 'coach', 'The {tf} have a coach who thinks he is a genius. He might be right and I hate it.'),
  W('hottake', 'T', 'rivalry', 'Hot take: {coach} beats {rival} when it matters and I will fight anyone who disagrees.'),
  W('hottake', 'T', 'any', 'My hot take: {qb} is a top-five QB in the league and I do not care who is mad about it.'),
  W('hottake', 'P', 'qb+good', 'Hot take: {p} is a top-three QB and the {tc} fans do not deserve him.'),
  W('hottake', 'P', 'qb', 'Hot take: {p} is overrated. There, I said it. Fight me.'),
  W('hottake', 'P', 'star', 'Hot take: {p} is the best {pos} in the league and it is not close.'),
  W('hottake', 'P', 'star+vet', 'Hot take: {p} is still the best at {age}. Father Time can wait.'),
  W('hottake', 'P', 'rookie+good', 'Hot take: {p} is going to be Rookie of the Year and it will be unanimous.'),
  W('hottake', 'P', 'wr', 'Hot take: {p} is the most overrated receiver in football. Reply guys, form a line.'),
  W('hottake', 'P', 'rb', 'Hot take: {p} is the best back in the league and running backs deserve more money.'),
  W('hottake', 'P', 'st', 'Hot take: a great kicker is worth more than a great receiver. Argue with me.'),
  W('hottake', 'P', 'paid', 'Hot take: {p} is NOT worth that contract. Ask me again in a year.'),
  W('hottake', 'P', 'payday', 'Hot take: {p} is underpaid and the {t} know it. Pay the man.'),
  W('hottake', 'P', 'injured', 'Hot take: {p} should sit until he is 100 percent. Nobody wins a title in September.'),
  W('hottake', 'L', 'any', 'Hot take: this is the best season of football in a decade. Do not @ me.'),
  W('hottake', 'L', 'any', 'Hot take: the league is too soft. Back in my day we had MORE weeks.'),
  W('hottake', 'L', 'any', 'Hot take: week {wk} is where we find out who is real. Everyone else is just practicing.', [1, 18]),
  W('hottake', 'L', 'any', 'The preseason power rankings were a work of fiction and I stand by that.', [0, 4]),
  W('hottake', 'L', 'any', 'Hot take: we need more primetime games and fewer people explaining what a first down is.'),

  // ---------------------------------------------------------------- the Leakers (parody analysts; invented people only)
  W('leak-loud', 'P', 'star', 'LET ME TELL YOU SOMETHING ABOUT {p}!!! Greatness is not a rumor. It is a LIFESTYLE. Nobody else in the league is doing what he is doing. Nobody!'),
  W('leak-loud', 'P', 'qb', 'I have been saying it for YEARS: {p} is the {tc} offense. Without him they are a very expensive marching band.'),
  W('leak-loud', 'T', 'cold', 'The {tf} are in CRISIS. There is no other word. CRISIS. And {coach} knows it.'),
  W('leak-loud', 'T', 'hot', 'The {tf} are RED HOT. Respect the process. Respect the grind. RESPECT. THE. {tc}.'),
  W('leak-loud', 'T', 'any', 'I want to be very clear: the {tf} are not who we thought they were. And I am the one who thought it.'),
  W('leak-loud', 'L', 'any', 'WEEK {wk}!!! I have never been more excited and also more furious about football than I am RIGHT NOW.', [1, 18]),
  W('leak-scoop', 'P', 'payday', 'BREAKING: sources tell The League Leak that {p} and the {t} are expected to talk contract soon. A significant number is on the table.'),
  W('leak-scoop', 'P', 'injured', 'UPDATE: {p} is dealing with {inj}, per sources. More as we get it.'),
  W('leak-scoop', 'P', 'good', 'Sources: multiple teams have asked about {p}. The {t} are not budging, for now.', [2, 12]),
  W('leak-scoop', 'P', 'rookie+good', 'Hearing {p} has been turning heads in {tc} all week. Coaches love him.'),
  W('leak-scoop', 'T', 'coach', 'League source on {coach} and the {tf}: "they believe they are the team to beat." Take that however you like.'),
  W('leak-scoop', 'L', 'any', 'Sources: a trade is brewing involving a former All-Pro. Names to come. Stay close.', [2, 12]),
  W('leak-film', 'P', 'star', 'Watched the {pl} tape twice. The way he sets up the defender before the break? That is the whole game, folks.'),
  W('leak-film', 'P', 'good+qb', '{pl}’s footwork in the pocket is a master class. Quick feet, quiet eyes, and the offense never panics.'),
  W('leak-film', 'T', 'any', 'Film does not lie: the {tf} are winning at the line of scrimmage. Everything else is noise.'),
  W('leak-film', 'T', 'cold', 'Here is the {tf} problem on tape: they are late on every rotation. It is fixable. It is just not fixed.'),
  W('leak-ex', 'P', 'qb', 'Back in my day a quarterback like {p} would have gotten hit three times a half. I am not saying he is soft. I am saying I noticed.'),
  W('leak-ex', 'P', 'vet', 'Play {age} years old in this league and you either have the mind or you have a good trainer. {p} has both.'),
  W('leak-ex', 'P', 'rookie', 'Rookies today are bigger and faster than we ever were. {p} will be fine. His hands will need a few weeks.'),
  W('leak-ex', 'T', 'any', 'I played in a locker room like the {tf} have. The coach sets the tone. That is the whole job.'),
  W('leak-stats', 'P', 'star', 'Stat of the week: {p} ({ovr} OVR) is in a tier of his own. The next closest {pos} is not within shouting distance.'),
  W('leak-stats', 'T', 'top', 'The {tf} lead their division at {rec}. Teams that start like this make the playoffs more often than not.'),
  W('leak-stats', 'T', 'hot', 'The {tf} have won back-to-back. Over a full season, that is the difference between January and the couch.'),
  W('leak-stats', 'L', 'any', 'Week {wk} reminder: one game is one game. Revisit your takes after four.', [1, 4]),

  // ---------------------------------------------------------------- The Hot Seat (two panelists who always disagree) + a comic
  W('leak-rex', 'P', 'star', 'THE HOT SEAT, Rex says: {p} is a once-in-a-generation {pos}. Debate over. Next topic.'),
  W('leak-rex', 'P', 'good', 'Rex on {p}: we are looking at a future All-Pro. Put it in writing. I just did.'),
  W('leak-rex', 'P', 'injured', 'Rex says {p} is back in no time. Gil says otherwise. I say Gil is wrong. Again.'),
  W('leak-rex', 'P', 'payday', 'Rex: pay {p} NOW. Every week you wait costs the {t} money. It is basic math.'),
  W('leak-rex', 'T', 'hot', 'Rex: the {tf} are legit contenders and anyone who says different has not watched them play.'),
  W('leak-rex', 'T', 'cold', 'Rex: the {tf} are one win from a turnaround. One. Bookmark this.'),
  W('leak-rex', 'T', 'any', 'Rex on the {tf}: the roster is too good to lose for long. {star} alone is worth the price of admission.'),
  W('leak-rex', 'L', 'any', 'Rex: week {wk} will be the best week of the season. Gil: it will not. We will see.'),
  W('leak-gil', 'P', 'star', 'THE HOT SEAT, Gil says: {p} is great. {p} is also overhyped. Both can be true. I said what I said.'),
  W('leak-gil', 'P', 'good', 'Gil on {p}: good, not great. I will take the negative and I will be right.'),
  W('leak-gil', 'P', 'injured', 'Gil: {p} with {inj}? Do not count on him back soon. Rex is going to be mad.'),
  W('leak-gil', 'P', 'paid', 'Gil says {p} is NOT worth that contract. Rex says he is. Gil is right. Rex knows it.'),
  W('leak-gil', 'T', 'hot', 'Gil: the {tf} are a mirage. Schedule is soft. Wait and see.'),
  W('leak-gil', 'T', 'cold', 'Gil: the {tf} are exactly who I said they were. Tell Rex I said hello.'),
  W('leak-gil', 'T', 'any', 'Gil on the {tf}: the record says one thing, the film says another. I trust the film.'),
  W('leak-gil', 'L', 'any', 'Gil: week {wk} will be a letdown. The good teams will win and the rest will not matter.'),
  W('leak-comic', 'P', 'any', 'Dewey Fumble here: {p} played so well I forgot I was supposed to be a hater. Back to work.'),
  W('leak-comic', 'P', 'qb', 'Dewey: if {p} throws one more pass like that, the {t} are going to need a bigger cushion on the bench.'),
  W('leak-comic', 'P', 'st', 'Dewey: {p} is the only man in football who gets paid to be nervous in public. Respect.'),
  W('leak-comic', 'T', 'cold', 'Dewey on the {tf}: so bad this week the punter asked for a transfer.'),
  W('leak-comic', 'T', 'hot', 'Dewey on the {tf}: so good this week the other team asked if they could watch from the sideline.'),
  W('leak-comic', 'T', 'any', 'Dewey: breaking news, the {tf} are a football team. More as it develops.'),
  W('leak-comic', 'L', 'any', 'Dewey: the NFL schedule is just a very long group chat that sometimes becomes football.'),
];

// Game highlights (used for the "around the league" feed)
export const HIGHLIGHTS: TweetTpl[] = [
  W('highlight', 'G', 'blowout', 'FINAL: {w} {ws}, {l} {ls}. It was never close. {wf} wanted this one badly.'),
  W('highlight', 'G', 'blowout', '{wf} ran away with it, {ws}-{ls}. {star} cooked.'),
  W('highlight', 'G', 'close', 'FINAL: {w} {ws}, {l} {ls}. Heart attack game. Somebody call the doctor.'),
  W('highlight', 'G', 'close', 'That one came down to the wire. {w} survive {l}, {ws}-{ls}.'),
  W('highlight', 'G', 'upset', 'UPSET: {w} stun {l}, {ws}-{ls}. Nobody saw that coming. 🚨'),
  W('highlight', 'G', 'upset', 'Underdog {w} take down {l}. {ws}-{ls}. The rankings do not matter on Sunday.'),
  W('highlight', 'G', 'shutout', 'SHUTOUT! {w} blank {l}, {ws}-{ls}. The {wf} defense was perfect.'),
  W('highlight', 'G', 'any', 'FINAL: {w} {ws}, {l} {ls}. {star} was the difference.'),
  W('highlight', 'G', 'any', '{wf} get it done, {ws}-{ls}. {lf} go back to the drawing board.'),
  W('highlight', 'G', 'any', 'Week {wk} highlight: {star} made a play that had the whole stadium on its feet. {w} win.'),
  W('highlight', 'R', 'h2h', 'COACH WAR: {wcoach} beats {lcoach}, {ws}-{ls}. The bragging rights belong to {wc}.'),
  W('highlight', 'R', 'h2h+close', 'COACH WAR CLASSIC: {wcoach} edges {lcoach}, {ws}-{ls}. Absolute war.'),
  W('highlight', 'R', 'h2h+blowout', 'COACH WAR: {wcoach} DOMINATES {lcoach}, {ws}-{ls}. Not even close.'),
];

// ------------------------------------------------------------------------------------------------ people
/** Fictional reporters and outlets. None of these are real people or publications. */
export const REPORTERS = [
  'Marcus Delaney', 'Priya Raman', 'Tom Sullivan', 'Dana Whitfield', 'Jerome Pike', 'Lucia Ferraro',
  'Hank Oyelaran', 'Beth Kowalski', 'Reggie Tran', 'Nora Castellano', 'Walt Brennan', 'Sasha Okafor',
];
export const OUTLETS = ['The Gridiron Ledger', 'Pigskin Daily', 'Sunday Sentinel', 'The Blitz Report', 'End Zone Weekly', 'Two-Minute Warning'];

export interface Account {
  handle: string;
  name: string;
  kind: 'insider' | 'fan' | 'stats' | 'comic' | 'human' | 'leaker';
  verified?: boolean;
  /** Short label shown on Leaker accounts. */
  badge?: string;
}

/**
 * The Leakers: parody-style analyst archetypes with invented names. Not real people, and nothing they post is a quote from one.
 * The cat picks the voice: leak-loud, -scoop, -film, -ex, -stats, -rex and -gil (The Hot Seat), -comic.
 */
export const LEAKERS: Record<string, Account> = {
  'leak-loud': { handle: 'StuTheVolume', name: 'Stu \u201cThe Volume\u201d Bellows', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Debate' },
  'leak-scoop': { handle: 'AdrianScoopley', name: 'Adrian Scoopley', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Breaking' },
  'leak-film': { handle: 'CoachDaleWhiteboard', name: 'Dale Whiteboard', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Film' },
  'leak-ex': { handle: 'BigRodTanner', name: 'Big Rod Tanner', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Former QB' },
  'leak-rex': { handle: 'RexOnTheHotSeat', name: 'Rex Holloway', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Hot Seat' },
  'leak-gil': { handle: 'GilOnTheHotSeat', name: 'Gil Mancuso', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Hot Seat' },
  'leak-comic': { handle: 'DeweyFumble', name: 'Dewey Fumble', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Late Night' },
  'leak-stats': { handle: 'MinaByTheNumbers', name: 'Mina Cardwell', kind: 'leaker', verified: true, badge: 'Leaker \u00b7 Numbers' },
};

/** Fictional everyday fans for hot takes and hate mail. */
export const HUMANS: Account[] = [
  { handle: 'DaveFromDayton', name: 'Dave from Dayton', kind: 'human' },
  { handle: 'KristenAlbright', name: 'Kristen Albright', kind: 'human' },
  { handle: 'BigMoJenkins', name: 'Marcus \u201cBig Mo\u201d Jenkins', kind: 'human' },
  { handle: 'TerriVoss77', name: 'Terri Voss', kind: 'human' },
  { handle: 'RickyPellegrino', name: 'Ricky Pellegrino', kind: 'human' },
  { handle: 'JessOkonkwo', name: 'Jess Okonkwo', kind: 'human' },
  { handle: 'SeasonTicketGary', name: 'Gary (Season Ticket Guy)', kind: 'human' },
  { handle: 'BrendaHalloran', name: 'Brenda Halloran', kind: 'human' },
  { handle: 'TyronePruitt', name: 'Tyrone Pruitt', kind: 'human' },
  { handle: 'SamWhitaker', name: 'Sam Whitaker', kind: 'human' },
  { handle: 'LenaOrtiz', name: 'Lena Ortiz', kind: 'human' },
  { handle: 'FrankDombrowski', name: 'Frank Dombrowski', kind: 'human' },
  { handle: 'NateEverhart', name: 'Nate Everhart', kind: 'human' },
  { handle: 'ColleenBrandt', name: 'Colleen Brandt', kind: 'human' },
];
/** League-wide fictional accounts. Team beat accounts are built from team data in the engine. */
export const ACCOUNTS: Account[] = [
  { handle: 'LeagueInsiderLou', name: 'League Insider Lou', kind: 'insider', verified: true },
  { handle: 'FilmRoomFran', name: 'Film Room Fran', kind: 'stats', verified: true },
  { handle: 'CapSpaceCarl', name: 'Cap Space Carl', kind: 'insider' },
  { handle: 'BigDawgBoyd', name: 'Big Dawg Boyd', kind: 'fan' },
  { handle: 'HailMaryHolly', name: 'Hail Mary Holly', kind: 'fan' },
  { handle: 'TheNickelPackage', name: 'The Nickel Package', kind: 'comic' },
  { handle: 'SackAttackSam', name: 'Sack Attack Sam', kind: 'fan' },
  { handle: 'RedZoneRuth', name: 'Red Zone Ruth', kind: 'stats', verified: true },
  { handle: 'TailgateTommy', name: 'Tailgate Tommy', kind: 'comic' },
  { handle: 'DraftDayDev', name: 'Draft Day Dev', kind: 'insider' },
  { handle: 'FourthAndForget', name: 'Fourth And Forget', kind: 'comic' },
  { handle: 'ZebraWatch', name: 'Zebra Watch', kind: 'comic' },
];
