# SpriteCut PRO

App Next.js para recortar spritesheets, animar clips e exportar ZIP / HTML animado.

## Requisitos

- Node.js 18 ou superior

## Como usar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

1. Copie o prompt e gere a PNG com alpha
2. Abra a spritesheet (a grade do prompt aplica-se)
3. Anime os clips e exporte ZIP (pastas por animação) ou HTML

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Servir o build |
| `npm run lint` | ESLint |

## Estrutura

```
src/app/              rotas e estilos globais
src/components/       ecrãs e UI (cut, animate, prompt, shell)
src/context/          estado da sessão
src/lib/              prompt, grade, ZIP, crop, HTML
src/types/            tipos compartilhados
```

## Repositório

https://github.com/Mauricioibzde/sprint-app
