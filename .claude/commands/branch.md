Crea un nuovo branch di lavoro da develop.

Se $ARGUMENTS è vuoto, chiedi cosa vuole fare l'utente. Altrimenti interpreta la richiesta.

---

## Flusso

1. **Determina tipo e nome:**
   - Se l'utente descrive una feature → `feat/nome-breve`
   - Se l'utente descrive un bugfix → `fix/nome-breve`
   - Nome: lowercase, parole separate da trattini, max 3-4 parole
   - Se l'utente passa un nome esplicito, usalo

2. **Verifica stato:**
   - `git status` — se ci sono modifiche non committate, avvisa e chiedi come procedere (stash, commit, o annulla)
   - `git branch` — verifica che il branch non esista già

3. **Crea branch:**
   ```bash
   git checkout develop
   git pull origin develop  # se remote esiste, altrimenti skip
   git checkout -b feat/nome-breve  # o fix/nome-breve
   ```

4. **Conferma:**
   - Mostra il branch creato
   - Ricorda il workflow: "Quando hai finito, usa `/pr` per creare la PR verso develop"

---

## Regole

- I branch partono SEMPRE da `develop`, mai da main o staging
- Non creare branch con nomi generici (`feat/update`, `fix/bug`)
- Se l'utente chiede un branch da main o staging, spiega il workflow e proponi di partire da develop
