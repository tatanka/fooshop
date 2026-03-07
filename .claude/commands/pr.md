Gestisci il flusso PR secondo il workflow del progetto.

Se $ARGUMENTS è vuoto, analizza il branch corrente e proponi il prossimo step. Altrimenti interpreta la richiesta.

---

## Workflow

```
feat/* o fix/*  ──merge──→  develop  ──PR──→  staging  ──PR──→  main
```

## Flusso automatico

### 1. Rileva contesto
- `git branch --show-current` → determina dove sei
- `git status` → verifica che non ci siano modifiche non committate
- `git log develop..HEAD --oneline` → mostra i commit del branch

### 2. Comportamento in base al branch corrente

**Se sei su `feat/*` o `fix/*`:**
- Proponi merge in develop
- Esegui:
  ```bash
  git checkout develop
  git merge --no-ff feat/nome-breve
  ```
- Chiedi se eliminare il branch di feature (`git branch -d feat/nome-breve`)
- Poi proponi: "Vuoi creare la PR da develop a staging?"

**Se sei su `develop`:**
- Mostra i commit non ancora in staging: `git log staging..develop --oneline`
- Se ci sono commit, proponi PR verso staging
- Esegui:
  ```bash
  git push origin develop  # se remote esiste
  gh pr create --base staging --head develop --title "..." --body "..."
  ```

**Se sei su `staging`:**
- Mostra i commit non ancora in main: `git log main..staging --oneline`
- Proponi PR verso main
- Esegui:
  ```bash
  git push origin staging  # se remote esiste
  gh pr create --base main --head staging --title "..." --body "..."
  ```

### 3. Formato PR

**Titolo:** breve, < 70 caratteri, descrive il cambiamento principale

**Body:**
```markdown
## Cosa cambia
- [bullet point dei cambiamenti principali]

## Test
- [come è stato testato]
```

---

## Argomenti speciali

- `/pr develop` — forza PR da branch corrente verso develop (merge)
- `/pr staging` — forza PR da develop verso staging
- `/pr main` — forza PR da staging verso main
- `/pr all` — esegui tutto il flusso: merge in develop → PR staging → (chiedi conferma) → PR main

---

## Regole

- Mai PR dirette da feat/fix verso staging o main
- Mai push diretto su develop, staging o main senza PR (tranne merge da feature branch in develop)
- Se ci sono conflitti, avvisa e aiuta a risolverli prima di procedere
- Se non c'è un remote configurato, salta i push e segnalalo
