// Every player-facing string lives in a dictionary, French first (the reference). Components never inline text:
// they read `t` from useI18n(). Texts come from the PRD "Player copy" tables; French uses tu.
import { decimal, NBSP, NNBSP } from './format';

const n = decimal('fr-FR');

export const fr = {
  consent: {
    title: 'Ta vie privée',
    body:
      "J'aimerais mesurer de façon anonyme l'utilisation du jeu et détecter les plantages pour l'améliorer. " +
      "Aucune donnée personnelle n'est collectée et rien n'est utilisé à des fins publicitaires.",
    accept: 'Accepter',
    refuse: 'Refuser',
    footnote: "Tu pourras changer d'avis à tout moment dans les paramètres.",
  },
  home: {
    title: 'NIGHTSTALKER',
    tagline: 'Survis dans le labyrinthe. Compte tes balles.',
    play: 'Jouer',
    settings: 'Paramètres',
    guide: 'Guide',
    about: 'À propos',
    bestScore: 'Meilleur score',
    hintMove: 'Déplacement',
    hintFire: 'Tir',
    hintLeft: '← Gauche',
    hintRight: 'Droite →',
    footer: 'Un hommage aux jeux de tir en labyrinthe du début des années 80',
  },
  game: {
    lives: 'VIES',
    best: 'MEILLEUR',
    ammo: 'BALLES',
    noGun: "PAS D'ARME",
    lifeBonus: '+1 VIE',
    combo: (mult: number) => `COMBO ×${n(mult)}`,
    pause: 'Pause',
  },
  pause: {
    title: 'PAUSE',
    resume: 'Reprendre',
    quit: 'Quitter',
  },
  gameover: {
    title: 'PARTIE TERMINÉE',
    newBest: `NOUVEAU RECORD${NBSP}!`,
    topScores: 'MEILLEURS SCORES',
    replay: 'Rejouer',
    menu: 'Menu',
  },
  bonus: {
    doubleKill: 'DOUBLÉ',
    tripleKill: 'TRIPLÉ',
    megaKill: 'MÉGA',
    quickDraw: 'DÉGAINE ÉCLAIR',
    clutch: 'DERNIÈRE BALLE',
    fullClip: 'SANS FAUTE',
    noBunker: 'SANS BUNKER',
    shieldAbsorb: `BOUCLIER${NBSP}!`,
  },
  curse: {
    slow: `MAUDIT${NBSP}: LENT`,
    noAmmo: `MAUDIT${NBSP}: PLUS DE BALLES`,
    volley: `MAUDIT${NBSP}: SALVE`,
  },
  settings: {
    title: 'Paramètres',
    swap: 'Inverser les commandes',
    swapOff: `Joystick${NBSP}: GAUCHE · Tir${NBSP}: DROITE`,
    swapOn: `Joystick${NBSP}: DROITE · Tir${NBSP}: GAUCHE`,
    fireMode: 'Mode de tir',
    fire: {
      quadrants: {
        label: 'QUADRANTS',
        hint: 'Touche un quart du cercle de tir pour tirer vers le haut, le bas, la gauche ou la droite',
      },
      dpad: { label: 'CROIX', hint: 'Quatre boutons en croix, un par direction' },
      autoaim: { label: 'VISÉE AUTO', hint: `Un seul bouton${NBSP}: le tir vise l'ennemi le plus proche` },
      pointAndShoot: {
        label: 'POINTER-TIRER',
        hint: `Touche n'importe où de ce côté${NBSP}: la balle part vers ton doigt`,
      },
    },
    modern: 'Mode moderne',
    modernOn: 'Power-ups, combos et multiplicateurs actifs',
    modernOff: `Mode classique${NBSP}: règles de base uniquement`,
    modernNext: "S'applique à la prochaine partie.",
    sound: 'Bruitages',
    soundHint: 'Explosions, arme, power-ups',
    ambience: 'Ambiance',
    ambienceHint: 'Battement de cœur qui accélère avec la difficulté',
    haptics: 'Vibrations',
    hapticsHint: 'Au tir, aux impacts et à la mort',
    telemetry: 'Partager des statistiques anonymes',
    telemetryHelp: "Aide à corriger les bugs et à améliorer le jeu. Aucune donnée personnelle n'est envoyée.",
    language: 'Langue',
    languageAuto: 'Automatique (langue du téléphone)',
    back: 'Retour',
  },
  guide: {
    title: 'POWER-UPS',
    lead:
      'En mode moderne, un power-up apparaît sur la carte environ toutes les 20 à 40 secondes. ' +
      "Il clignote avant de disparaître. Marche dessus pour l'activer.",
    duration: (seconds: number) => `${seconds}${NBSP}s`,
    charges: (count: number) => `${count} charge${count > 1 ? 's' : ''}`,
    groups: {
      tempo: { title: 'TEMPO', hint: "Ralentis l'horloge ennemie" },
      offense: { title: 'ATTAQUE', hint: `Modifient tes prochains tirs${NBSP}; ils consomment des charges` },
      defense: { title: 'DÉFENSE', hint: 'Encaisse un coup, traverse les murs, fais diversion' },
      economy: { title: 'RESSOURCES', hint: 'Score, balles, vies' },
      info: { title: 'INFORMATION', hint: "Coupe le tir ennemi et révèle l'invisible" },
      mystery: { title: 'MYSTÈRE', hint: 'Bonus ou malédiction au hasard, toujours un bonus en début de partie' },
    },
    back: 'Retour',
  },
  powerups: {
    slowMo: { label: 'LENT', description: `Ennemis à 50${NBSP}% pendant 25${NBSP}s` },
    freeze: { label: 'GEL', description: `Ennemis figés 4${NBSP}s` },
    cloak: { label: 'CAPE', description: `Les robots ne te pistent plus pendant 8${NBSP}s` },
    rapidFire: { label: 'RAFALE', description: `Plus de limite de balles pendant 6${NBSP}s` },
    piercing: { label: 'PERCE', description: 'Le prochain tir ignore les boucliers' },
    spread: { label: 'TRIPLE', description: 'Le prochain tir part dans 3 directions' },
    heavy: { label: 'LOURD', description: "Les 3 prochains tirs tuent d'un coup" },
    boomerang: { label: 'BOOM', description: 'Le prochain tir revient vers toi' },
    shield: { label: 'BOUCLIER', description: 'Encaisse un coup' },
    bunkerRepair: { label: 'RÉPARE', description: 'Bunker remis à neuf' },
    phaseWalk: { label: 'PASSE', description: `Traverse les murs pendant 4${NBSP}s` },
    decoy: { label: 'LEURRE', description: `Un leurre attire les tirs pendant 8${NBSP}s` },
    scoreX2: { label: 'X2', description: `Points doublés pendant 30${NBSP}s` },
    ammo: { label: 'BALLES', description: 'Arme rechargée' },
    magnet: { label: 'AIMANT', description: "L'arme apparaît près de toi" },
    extraLife: { label: '+1', description: 'Une vie en plus' },
    emp: { label: 'IEM', description: 'Coupe le tir ennemi' },
    xray: { label: 'RAYONS X', description: `Révèle les invisibles et les lignes de tir pendant 12${NBSP}s` },
    mystery: { label: '?', description: 'Bonus ou malédiction au hasard' },
  },
  // « À propos »: the story comes from the discovery brief (docs/BRIEF.md), quoted in the PRD (about.story).
  about: {
    title: 'À propos',
    storyTitle: "L'histoire de ce jeu",
    story: [
      `Enfant, j'ai découvert Night Stalker sur la console Intellivision${NBSP}: quelques balles, des robots qui se rapprochent et un bunker pour seul refuge. ` +
        "Cette tension ne m'a jamais quitté. Des années plus tard, j'ai créé ce jeu pour la retrouver sur mon téléphone et la partager.",
    ],
    howToTitle: 'Comment jouer',
    howTo: [
      `Survis dans le labyrinthe. Ramasse l'arme (6 balles) et abats les robots. Évite la chauve-souris et l'araignée${NBSP}: elles te paralysent. ` +
        `Le bunker est ton refuge. Tous les 10${NNBSP}000 points, tu gagnes une vie. En mode moderne, des power-ups apparaissent et les tirs enchaînés rapportent des bonus.`,
    ],
    inspirationTitle: 'Inspiration',
    inspiration: [
      `Inspiré de Night Stalker (Mattel, Intellivision, 1982). Ce jeu n'en est ni une copie ni un produit officiel${NBSP}: labyrinthe, graphismes, sons et règles sont originaux.`,
    ],
    authorTitle: "Un mot de l'auteur",
    author: [
      `Ce jeu ne sort pas d'un studio${NBSP}: il a été imaginé et programmé sur mon temps libre, par un développeur indépendant passionné.`,
      `Il est sans doute perfectible${NBSP}: si quelque chose ne marche pas comme prévu, merci d'avance pour ton indulgence.`,
    ],
    dataTitle: 'Tes données',
    data: [
      "Aucun compte, aucune publicité. Des statistiques anonymes ne sont envoyées que si tu l'as accepté, et tu peux changer d'avis dans les paramètres.",
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Retour',
  },
  errors: {
    title: 'Oups',
    body: 'Un problème est survenu. Relance le jeu.',
    retry: 'Réessayer',
  },
} as const;
