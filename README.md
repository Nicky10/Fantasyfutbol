# Dark Team Fantasy

App de iPhone para la liga fantasy de la casa Dark Team. Se juega como un Fantasy de la Premier League en chico: eliges quién eres, armas un plantel de $3, nombras capitán y persigues dos tablas — managers de fantasy y puntos reales en la cancha.

La base de datos es un Google Sheet. El servidor es un web app de Google Apps Script. El teléfono habla con esa URL por HTTPS. En iPhone (build nativo o Expo) eso funciona porque las apps nativas no están bloqueadas por CORS del navegador.

La URL de la API y la league key de esta temporada viven en `src/api/config.ts` (y se reflejan en `app.json`). Al abrir la app se conecta sola a la hoja en vivo. Si la hoja no responde, se queda con el último snapshot guardado en el teléfono.

## Requisitos

Para clonar y correr el proyecto:

- Git
- Node.js 20 o superior
- npm (viene con Node)
- macOS con Xcode, para instalar en un iPhone físico
- Un iPhone con cable, desbloqueado, y **Developer Mode** activado (`Settings → Privacy & Security → Developer Mode`)
- Una Apple ID. Una cuenta gratis alcanza para instalar en tu propio teléfono; esa instalación caduca a los 7 días y hay que volver a pulsar Play en Xcode

Para administrar la liga (una sola persona):

- Cuenta de Google, para el spreadsheet y Apps Script
- Permiso para desplegar el script como web app con acceso **Anyone**

Los jugadores solo necesitan la app instalada y aparecer en la hoja **Players**.

## Instalación

```bash
git clone https://github.com/Nicky10/Fantasyfutbol.git
cd Fantasyfutbol
npm install
```

Metro, para cargar el JavaScript mientras desarrollas:

```bash
npx expo start
```

En el navegador:

```bash
npm run web
```

### Instalar en el iPhone

Las carpetas `ios/` y `android/` no van en el repo. Se generan en la máquina.

1. Conecta el iPhone con cable. Desbloquéalo. Si iOS pregunta **Trust This Computer**, toca Trust.
2. En el teléfono: **Settings → Privacy & Security → Developer Mode → On**. Reinicia si te lo pide.
3. En Xcode: **Xcode → Settings → Accounts → + → Apple ID**.
4. Genera el proyecto nativo y ábrelo. Hay que abrir el workspace, no el `.xcodeproj`.

```bash
npm run prebuild:ios
npm run ios:xcode
```

5. En la barra lateral, clic en **DarkTeam**. Abre **Signing & Capabilities**.
6. Marca **Automatically manage signing**.
7. **Team:** tu nombre / Apple ID. Si Xcode dice que el bundle ID está tomado, cámbialo a algo único, por ejemplo `com.tunombre.darkteam`. El valor del repo es `com.darkteam.fantasy`.
8. En la barra de arriba elige tu **iPhone**, no un Simulator.
9. Deja Metro corriendo en otra terminal (`npx expo start`).
10. En Xcode pulsa **Play**. La primera build tarda unos minutos.
11. En el teléfono: **Settings → General → VPN & Device Management** → confía en tu Apple ID y abre **Dark Team**.

El mismo flujo, sin la UI de Xcode (Xcode igual corre por debajo):

```bash
npx expo run:ios --device
```

Android, con un dispositivo o emulador ya configurado:

```bash
npm run android
```

## Guía de uso

### Jugadores

1. Abre la app. Elige tu nombre en **Who are you?**. No puedes ponerte a ti mismo en el plantel de la semana. Sub es un jugador invitado, no un manager, y no aparece en esa lista.
2. **Home.** Ves tu puesto, los puntos de la jornada, el próximo rival, el plantel, los chips que te quedan y el video del partido si ya hay URL de YouTube. Tira hacia abajo para refrescar.
3. **Pick.** Arma 4 jugadores con presupuesto de $3.00. Toca un hueco de la cancha, elige jugador y marca un capitán. Puedes guardar y cambiar el plantel hasta el kickoff (la hora está en la columna deadline de la hoja).
4. Chips, uno de cada uno en toda la temporada:
   - **Triple Captain:** el capitán multiplica x3 en lugar de x2.
   - **Bench Boost:** el presupuesto pasa a $4.00 y eliges 5 jugadores.
5. Reglas que la app no deja saltar: no elegirte a ti mismo, un solo capitán, no repetir el mismo capitán dos jornadas seguidas, cada chip una sola vez.
6. **League.** Dos pestañas: **Fantasy** (tabla de managers) y **On the pitch** (puntos reales de cada jugador). Toca una fila para abrir la ficha.
7. **Stats.** Filtra por GK, DEF, MID o ATK y ordena por puntos, goles, asistencias, DC o forma.
8. La ficha del jugador muestra precio, posición y el desglose de puntos por jornada.
9. **More.** Reglas y puntuación, cambiar de jugador, o salir. **Sign out** vuelve a la pantalla de nombres.

Cuando la jornada ya cerró, Home muestra **View points** y abre el detalle de esa jornada (puntos base, multiplicador del capitán o del chip, total).

### Administrador: crear la hoja

1. Abre [Google Sheets](https://sheets.google.com) y crea un spreadsheet en blanco llamado **Dark Team Fantasy**.
2. **Extensions → Apps Script**.
3. Borra el código de ejemplo. Pega el contenido completo de `apps-script/Code.gs`.
4. Guarda. En el editor, selecciona `setupLeague` y pulsa **Run**.
5. La primera vez concede permisos (tu cuenta de Google, para que el script edite esa hoja).
6. En el spreadsheet deben aparecer **Instructions**, **Config**, **Players**, **Gameweeks**, **MatchStats**, **Picks**, **Scoring**, **BonusScoring** y **LiveTable**.
7. Copia el **leagueKey** de la hoja Config. También está impreso en Instructions.

La league key es una contraseña corta compartida por todo Dark Team, no un login de Google. `setupLeague` genera un código de 8 caracteres y lo escribe en Config. Todo el grupo usa la misma clave. Sin ella, cualquiera con la URL podría leer la tabla y pisar los picks.

Si cambias de hoja o de clave, actualiza `DEFAULT_API_URL` y `DEFAULT_LEAGUE_KEY` en `src/api/config.ts`.

### Administrador: cada semana

1. Antes del partido, escribe el rival y pon el **kickoff en la columna deadline**. Status = `upcoming`.
2. Todos pueden guardar y cambiar el plantel hasta esa hora. La app escribe los picks con `doPost`.
3. Después del partido, llena `goalsFor` y `goalsAgainst`, marca `played` y carga las stats en **MatchStats**.
4. Pega la URL de YouTube en `youtubeUrl`. Hasta entonces la app muestra **Coming soon**.
5. Pon status en `finished`. LiveTable se actualiza sola desde MatchStats.
6. **Dark Team → Recalculate standings** solo si quieres forzar un refresco.
7. **Dark Team → Add next gameweek** (o corre `addGameweek` en Apps Script). Eso crea la fila de Gameweeks, una fila de MatchStats por jugador, actualiza `currentGameweekId` y refresca LiveTable. Después llena el rival y pon el kickoff en **deadline**.

`winningDc` vacío significa: dar +2 automático si Dark Team ganó y ese jugador anotó al menos un DC.

Los retratos salen de `assets/images/`. El nombre del archivo (sin `.png`) tiene que coincidir con el id del jugador en minúsculas, por ejemplo `nico.png`. El mapa está en `src/lib/portraits.ts`.

### Administrador: publicar la API

En Apps Script:

1. **Deploy → New deployment → Web app**
2. Description: `Dark Team API`
3. **Execute as:** Me
4. **Who has access:** Anyone
5. Deploy y copia la URL que termina en `/exec`

Si después cambias `Code.gs`: **Deploy → Manage deployments → Edit → New version**.

Quien tenga esa URL y la league key puede leer la liga y guardar picks. Deja la clave en el chat del grupo. Este repo debe quedarse privado.

## Puntuación

| Pos | Goles | Asistencias | DC / punto | Clean sheet | Bonus in-field | −1 cada N goles en contra |
| --- | --- | --- | --- | --- | --- | --- |
| GK | 6 | 6 | 4 | 7 | 0 | 3 |
| DEF | 5 | 4 | 6 | 6 | 4 | 2 |
| MID | 4 | 3 | 6 | 3 | 3 | 2 |
| ATK | 3 | 3 | 4 | 2 | 2 | 2 |

Otros eventos: amarilla −1, roja −3, penalti fallado −2, error que termina en gol −1, MOTM +3, segundo MVP +2, reconocimiento +1, gol de la victoria +2, DC en un partido ganado +2.

El gol in-field se guarda aparte de los goles normales, para que un penalti cuente como gol sin el bonus de juego abierto.

La hoja **Scoring** y **BonusScoring** mandan. La pantalla **Rules** de la app lee esos valores en vivo.

## Estructura

```
app/                 pantallas (Expo Router)
src/api/             tipos, demo, cliente de Apps Script, puntuación
src/context/         sesión y caché
src/lib/portraits.ts retratos por id de jugador
apps-script/Code.gs  setup de la hoja y API JSON
assets/images/       logo y retratos
```

`ios/` y `android/` se regeneran con `expo prebuild` y no se commitean.
