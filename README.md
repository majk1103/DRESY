# Dresy – vánoční zápas

- `index.html` – objednávkový formulář pro rodiče
- `orders.json` – obsazená čísla a objednané dresy (formulář si ho načítá při každém otevření)

## Automatické ukládání objednávek (Google tabulka)

1. Vytvořte novou Google tabulku.
2. Rozšíření → Apps Script, vložte obsah `apps-script/Code.gs` a uložte.
3. Nasadit → Nové nasazení → Webová aplikace. Spustit jako: *Já*, Přístup: *Kdokoli*. Povolte oprávnění.
4. Zkopírujte adresu webové aplikace (končí na `/exec`) a vložte ji do `API_URL` v `index.html`.
