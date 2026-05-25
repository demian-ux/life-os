# Life OS

Local-first personal planning app built with Next.js, Prisma/SQLite, and Electron.

## Development

```powershell
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000/today`.

## Desktop Build

```powershell
pnpm electron:dist
```

The packaged app stores runtime data in `%APPDATA%\life-os`, including
`dev.db`, `blocker-config.json`, `next-server.log`, `error.log`, and
`blocker.log`.

## Site Blocking

The Windows blocker is a scheduled task that reads
`%APPDATA%\life-os\blocker-config.json` and updates the system hosts file.

Modern browsers may bypass the hosts file with DNS-over-HTTPS. To make blocking
effective, import `resources\disable-doh.reg` as Administrator, then restart
Chrome, Edge, and Firefox.
