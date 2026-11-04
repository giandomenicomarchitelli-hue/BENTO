// `expo export -p web` con output "single" genera un dist/index.html
// minimo, senza passare da app/+html.tsx (quel file si applica solo con
// output "static"/"server" - vedi https://docs.expo.dev/router/reference/static-rendering/
// - e "static" oggi fallisce la build per un bug interno di Expo,
// scollegato da questo progetto). iOS però decide se un sito "Aggiunto
// alla schermata Home" è una vera app a schermo intero leggendo i meta
// tag "apple-mobile-web-app-*" dal DOCUMENTO INIZIALE, prima che React
// parta: senza, l'icona aggiunta resta un segnalibro Safari normale
// (barra degli indirizzi che scompare solo scorrendo, non una vera
// standalone web app). Li inseriamo qui, subito dopo l'export, così
// sono nell'HTML servito fin dal primo byte.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const percorsoHtml = join(process.cwd(), 'dist', 'index.html');
const html = readFileSync(percorsoHtml, 'utf8');

const metaTag = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Bento" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#F8F9FA" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  </head>`;

if (!html.includes('</head>')) {
  throw new Error('dist/index.html non contiene </head> - formato export inatteso');
}

writeFileSync(percorsoHtml, html.replace('</head>', metaTag));
console.log('Meta tag PWA iniettati in dist/index.html');
